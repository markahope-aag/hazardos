import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { applyUnifiedRateLimit, UnifiedRateLimiterType } from '@/lib/middleware/unified-rate-limit'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export interface ApiContext {
  user: { id: string; email?: string }
  profile: { organization_id: string; role: string }
  supabase: Awaited<ReturnType<typeof createClient>>
}

export interface ApiHandlerOptions<TBody = unknown, TQuery = unknown> {
  // Rate limiting
  rateLimit?: UnifiedRateLimiterType

  // Authentication - defaults to true
  requireAuth?: boolean

  // Role-based access control
  allowedRoles?: string[]

  // Zod schemas for validation
  bodySchema?: ZodSchema<TBody>
  querySchema?: ZodSchema<TQuery>
}

type HandlerWithBody<TBody, TQuery> = (
  request: NextRequest,
  context: ApiContext,
  body: TBody,
  query: TQuery
) => Promise<NextResponse>

type HandlerWithoutBody<TQuery> = (
  request: NextRequest,
  context: ApiContext,
  query: TQuery
) => Promise<NextResponse>

type PublicHandler = (
  request: NextRequest
) => Promise<NextResponse>

// Convert Zod errors to SecureError
function handleZodError(error: ZodError): never {
  const issues = error.issues || []
  if (issues.length > 0) {
    const firstIssue = issues[0]
    const field = firstIssue.path.join('.')
    const message = firstIssue.message
    throw new SecureError('VALIDATION_ERROR', field ? `${field}: ${message}` : message, field || undefined)
  }
  throw new SecureError('VALIDATION_ERROR', 'Invalid input')
}

// Parse and validate query parameters
function parseQuery<T>(request: NextRequest, schema?: ZodSchema<T>): T {
  if (!schema) return {} as T

  const { searchParams } = new URL(request.url)
  const queryObj: Record<string, string | string[]> = {}

  searchParams.forEach((value, key) => {
    const existing = queryObj[key]
    if (existing) {
      queryObj[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
    } else {
      queryObj[key] = value
    }
  })

  try {
    return schema.parse(queryObj)
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error)
    }
    throw error
  }
}

// Parse and validate request body
async function parseBody<T>(request: NextRequest, schema?: ZodSchema<T>): Promise<T> {
  if (!schema) return {} as T

  try {
    const body = await request.json()
    return schema.parse(body)
  } catch (error) {
    if (error instanceof ZodError) {
      handleZodError(error)
    }
    if (error instanceof SyntaxError) {
      throw new SecureError('BAD_REQUEST', 'Invalid JSON body')
    }
    throw error
  }
}

// Get authenticated context
async function getAuthContext(requireAuth: boolean): Promise<ApiContext | null> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    if (requireAuth) {
      throw new SecureError('UNAUTHORIZED')
    }
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    if (requireAuth) {
      throw new SecureError('NOT_FOUND', 'Profile not found')
    }
    return null
  }

  return {
    user: { id: user.id, email: user.email },
    profile: { organization_id: profile.organization_id, role: profile.role },
    supabase,
  }
}

// Check role permissions
function checkRoles(context: ApiContext, allowedRoles?: string[]): void {
  if (!allowedRoles || allowedRoles.length === 0) return

  if (!allowedRoles.includes(context.profile.role)) {
    throw new SecureError('FORBIDDEN')
  }
}

/**
 * Create an API handler with rate limiting, authentication, and Zod validation
 *
 * @example
 * // GET handler with query validation
 * export const GET = createApiHandler({
 *   rateLimit: 'general',
 *   querySchema: z.object({ status: z.string().optional() })
 * }, async (request, context, body, query) => {
 *   const items = await getItems(context.profile.organization_id, query.status)
 *   return NextResponse.json({ items })
 * })
 *
 * @example
 * // POST handler with body validation
 * export const POST = createApiHandler({
 *   rateLimit: 'general',
 *   bodySchema: z.object({ name: z.string().min(1) })
 * }, async (request, context, body) => {
 *   const item = await createItem(context.profile.organization_id, body)
 *   return NextResponse.json({ item }, { status: 201 })
 * })
 */
export function createApiHandler<
  TBody = Record<string, unknown>,
  TQuery = Record<string, unknown>
>(
  options: ApiHandlerOptions<TBody, TQuery>,
  handler: (
    request: NextRequest,
    context: ApiContext,
    body: TBody,
    query: TQuery
  ) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  const {
    rateLimit = 'general',
    requireAuth = true,
    allowedRoles,
    bodySchema,
    querySchema,
  } = options

  return async (request: NextRequest) => {
    try {
      // Apply rate limiting
      const rateLimitResponse = await applyUnifiedRateLimit(request, rateLimit)
      if (rateLimitResponse) {
        return rateLimitResponse
      }

      // Get auth context
      const context = await getAuthContext(requireAuth)

      if (requireAuth && !context) {
        throw new SecureError('UNAUTHORIZED')
      }

      // Check roles if auth is required
      if (context && allowedRoles) {
        checkRoles(context, allowedRoles)
      }

      // Parse query parameters
      const query = parseQuery(request, querySchema)

      // Parse body if schema provided
      const body = bodySchema ? await parseBody(request, bodySchema) : ({} as TBody)

      // Call the handler
      return await (handler as HandlerWithBody<TBody, TQuery>)(
        request,
        context as ApiContext,
        body,
        query
      )
    } catch (error) {
      return createSecureErrorResponse(error)
    }
  }
}

/**
 * Create a public API handler (no auth required) with rate limiting and validation
 */
export function createPublicApiHandler<TBody = unknown, TQuery = unknown>(
  options: Omit<ApiHandlerOptions<TBody, TQuery>, 'requireAuth' | 'allowedRoles'>,
  handler: (request: NextRequest, body: TBody, query: TQuery) => Promise<NextResponse>
): (request: NextRequest) => Promise<NextResponse> {
  const { rateLimit = 'general', bodySchema, querySchema } = options

  return async (request: NextRequest) => {
    try {
      // Apply rate limiting
      const rateLimitResponse = await applyUnifiedRateLimit(request, rateLimit)
      if (rateLimitResponse) {
        return rateLimitResponse
      }

      // Parse query and body
      const query = parseQuery(request, querySchema)
      const body = bodySchema ? await parseBody(request, bodySchema) : ({} as TBody)

      return await handler(request, body, query)
    } catch (error) {
      return createSecureErrorResponse(error)
    }
  }
}

/**
 * Create a handler for dynamic routes with params
 */
export function createApiHandlerWithParams<TBody = unknown, TQuery = unknown, TParams = { id: string }>(
  options: ApiHandlerOptions<TBody, TQuery>,
  handler: (
    request: NextRequest,
    context: ApiContext,
    params: TParams,
    body: TBody,
    query: TQuery
  ) => Promise<NextResponse>
): (request: NextRequest, props: { params: Promise<TParams> }) => Promise<NextResponse> {
  const {
    rateLimit = 'general',
    requireAuth = true,
    allowedRoles,
    bodySchema,
    querySchema,
  } = options

  return async (request: NextRequest, props: { params: Promise<TParams> }) => {
    try {
      // Apply rate limiting
      const rateLimitResponse = await applyUnifiedRateLimit(request, rateLimit)
      if (rateLimitResponse) {
        return rateLimitResponse
      }

      // Get params
      const params = await props.params

      // Get auth context
      const context = await getAuthContext(requireAuth)

      if (requireAuth && !context) {
        throw new SecureError('UNAUTHORIZED')
      }

      // Check roles
      if (context && allowedRoles) {
        checkRoles(context, allowedRoles)
      }

      // Parse query and body
      const query = parseQuery(request, querySchema)
      const body = bodySchema ? await parseBody(request, bodySchema) : ({} as TBody)

      return await handler(request, context as ApiContext, params, body, query)
    } catch (error) {
      return createSecureErrorResponse(error)
    }
  }
}
