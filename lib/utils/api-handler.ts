import { NextRequest, NextResponse } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { applyUnifiedRateLimit, UnifiedRateLimiterType } from '@/lib/middleware/unified-rate-limit'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { createRequestLogger } from '@/lib/utils/logger'
import { sanitizeObject } from '@/lib/utils/sanitize'
import { withCacheHeaders, CacheProfile } from '@/lib/utils/cache-headers'
import type { SanitizeOptions } from '@/lib/types/sanitize'
import type { Logger } from 'pino'

/** Internal auth context without logging fields */
interface AuthContext {
  user: { id: string; email?: string }
  profile: { organization_id: string; role: string }
  supabase: Awaited<ReturnType<typeof createClient>>
}

export interface ApiContext extends AuthContext {
  /** Request-scoped logger with context */
  log: Logger
  /** Unique request ID for correlation */
  requestId: string
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

  // Sanitization options (defaults to enabled)
  sanitize?: boolean | SanitizeOptions

  // HTTP cache headers for GET requests
  cache?: CacheProfile
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
async function getAuthContext(requireAuth: boolean): Promise<AuthContext | null> {
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
function checkRoles(context: AuthContext, allowedRoles?: string[]): void {
  if (!allowedRoles || allowedRoles.length === 0) return

  if (!allowedRoles.includes(context.profile.role)) {
    throw new SecureError('FORBIDDEN')
  }
}

// Apply sanitization to body/query based on options
function applySanitization<T>(data: T, sanitize: boolean | SanitizeOptions | undefined): T {
  // Sanitization is enabled by default
  if (sanitize === false) {
    return data
  }

  const options: SanitizeOptions = typeof sanitize === 'object' ? sanitize : {}
  return sanitizeObject(data, options)
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
    sanitize,
    cache,
  } = options

  return async (request: NextRequest) => {
    const startTime = Date.now()
    const requestId = nanoid(12)
    const path = new URL(request.url).pathname
    const method = request.method

    // Create initial logger (will be enriched with user context after auth)
    let log = createRequestLogger({
      requestId,
      method,
      path,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
    })

    log.info('Request started')

    try {
      // Apply rate limiting
      const rateLimitResponse = await applyUnifiedRateLimit(request, rateLimit)
      if (rateLimitResponse) {
        log.warn('Rate limit exceeded')
        return rateLimitResponse
      }

      // Get auth context
      const context = await getAuthContext(requireAuth)

      if (requireAuth && !context) {
        throw new SecureError('UNAUTHORIZED')
      }

      // Enrich logger with user context
      if (context) {
        log = createRequestLogger({
          requestId,
          userId: context.user.id,
          organizationId: context.profile.organization_id,
          method,
          path,
          userAgent: request.headers.get('user-agent') || undefined,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
        })
      }

      // Check roles if auth is required
      if (context && allowedRoles) {
        checkRoles(context, allowedRoles)
      }

      // Parse query parameters and apply sanitization
      const rawQuery = parseQuery(request, querySchema)
      const query = applySanitization(rawQuery, sanitize)

      // Parse body if schema provided and apply sanitization
      const rawBody = bodySchema ? await parseBody(request, bodySchema) : ({} as TBody)
      const body = applySanitization(rawBody, sanitize)

      // Call the handler with logger in context
      const enrichedContext: ApiContext = {
        ...(context as ApiContext),
        log,
        requestId,
      }

      let response = await (handler as HandlerWithBody<TBody, TQuery>)(
        request,
        enrichedContext,
        body,
        query
      )

      // Apply cache headers for GET requests if configured
      if (cache && method === 'GET') {
        response = withCacheHeaders(response, cache)
      }

      const durationMs = Date.now() - startTime
      log.info({ durationMs, status: response.status }, 'Request completed')

      return response
    } catch (error) {
      const durationMs = Date.now() - startTime
      log.error({ durationMs }, 'Request failed')
      return createSecureErrorResponse(error, log)
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
  const { rateLimit = 'general', bodySchema, querySchema, sanitize } = options

  return async (request: NextRequest) => {
    const startTime = Date.now()
    const requestId = nanoid(12)
    const path = new URL(request.url).pathname
    const method = request.method

    const log = createRequestLogger({
      requestId,
      method,
      path,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
    })

    log.info('Request started')

    try {
      // Apply rate limiting
      const rateLimitResponse = await applyUnifiedRateLimit(request, rateLimit)
      if (rateLimitResponse) {
        log.warn('Rate limit exceeded')
        return rateLimitResponse
      }

      // Parse query and body, then apply sanitization
      const rawQuery = parseQuery(request, querySchema)
      const query = applySanitization(rawQuery, sanitize)
      const rawBody = bodySchema ? await parseBody(request, bodySchema) : ({} as TBody)
      const body = applySanitization(rawBody, sanitize)

      const response = await handler(request, body, query)

      const durationMs = Date.now() - startTime
      log.info({ durationMs, status: response.status }, 'Request completed')

      return response
    } catch (error) {
      const durationMs = Date.now() - startTime
      log.error({ durationMs }, 'Request failed')
      return createSecureErrorResponse(error, log)
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
    sanitize,
    cache,
  } = options

  return async (request: NextRequest, props: { params: Promise<TParams> }) => {
    const startTime = Date.now()
    const requestId = nanoid(12)
    const path = new URL(request.url).pathname
    const method = request.method

    // Create initial logger
    let log = createRequestLogger({
      requestId,
      method,
      path,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
    })

    log.info('Request started')

    try {
      // Apply rate limiting
      const rateLimitResponse = await applyUnifiedRateLimit(request, rateLimit)
      if (rateLimitResponse) {
        log.warn('Rate limit exceeded')
        return rateLimitResponse
      }

      // Get params
      const params = await props.params

      // Get auth context
      const context = await getAuthContext(requireAuth)

      if (requireAuth && !context) {
        throw new SecureError('UNAUTHORIZED')
      }

      // Enrich logger with user context
      if (context) {
        log = createRequestLogger({
          requestId,
          userId: context.user.id,
          organizationId: context.profile.organization_id,
          method,
          path,
          userAgent: request.headers.get('user-agent') || undefined,
          ip: request.headers.get('x-forwarded-for')?.split(',')[0] || undefined,
        })
      }

      // Check roles
      if (context && allowedRoles) {
        checkRoles(context, allowedRoles)
      }

      // Parse query and body, then apply sanitization
      const rawQuery = parseQuery(request, querySchema)
      const query = applySanitization(rawQuery, sanitize)
      const rawBody = bodySchema ? await parseBody(request, bodySchema) : ({} as TBody)
      const body = applySanitization(rawBody, sanitize)

      // Call the handler with logger in context
      const enrichedContext: ApiContext = {
        ...(context as ApiContext),
        log,
        requestId,
      }

      let response = await handler(request, enrichedContext, params, body, query)

      // Apply cache headers for GET requests if configured
      if (cache && method === 'GET') {
        response = withCacheHeaders(response, cache)
      }

      const durationMs = Date.now() - startTime
      log.info({ durationMs, status: response.status }, 'Request completed')

      return response
    } catch (error) {
      const durationMs = Date.now() - startTime
      log.error({ durationMs }, 'Request failed')
      return createSecureErrorResponse(error, log)
    }
  }
}
