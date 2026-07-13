import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'
import { ApiKeyService } from '@/lib/services/api-key-service'
import { handlePreflight } from '@/lib/middleware/cors'
import { v1CompanyListQuerySchema, v1CreateCompanySchema, formatZodError } from '@/lib/validations/v1-api'
import { createRequestLogger, formatError } from '@/lib/utils/logger'

async function handleGet(request: NextRequest, context: ApiKeyAuthContext): Promise<NextResponse> {
  if (!ApiKeyService.hasScope(context.apiKey, 'companies:read')) {
    return NextResponse.json(
      { error: 'Missing required scope: companies:read' },
      { status: 403 }
    )
  }

  const supabase = await createClient()
  const searchParams = request.nextUrl.searchParams

  const queryResult = v1CompanyListQuerySchema.safeParse({
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
  })

  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: formatZodError(queryResult.error) },
      { status: 400 }
    )
  }

  const { limit = 50, offset = 0, status, search } = queryResult.data

  let query = supabase
    .from('companies')
    .select('*', { count: 'exact' })
    .eq('organization_id', context.organizationId)
    .order('name', { ascending: true })
    .range(offset, offset + limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  if (search) {
    const safe = sanitizeSearchQuery(search)
    query = query.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,industry.ilike.%${safe}%`)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }

  return NextResponse.json({
    data,
    pagination: {
      total: count,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
  })
}

async function handlePost(request: NextRequest, context: ApiKeyAuthContext): Promise<NextResponse> {
  if (!ApiKeyService.hasScope(context.apiKey, 'companies:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: companies:write' },
      { status: 403 }
    )
  }

  const supabase = await createClient()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validationResult = v1CreateCompanySchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatZodError(validationResult.error) },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from('companies')
    .insert({
      organization_id: context.organizationId,
      status: 'active',
      ...validationResult.data,
    })
    .select()
    .single()

  if (error) {
    const log = createRequestLogger({
      requestId: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/companies',
      organizationId: context.apiKey.organization_id,
    })
    log.error(
      { error: formatError(error, 'COMPANY_CREATE_ERROR') },
      'Failed to create company'
    )
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}

export const GET = withApiKeyAuth(handleGet)
export const POST = withApiKeyAuth(handlePost)
export const OPTIONS = (request: NextRequest) => handlePreflight(request, 'public-api')
