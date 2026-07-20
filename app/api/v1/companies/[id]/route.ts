import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth'
import { ApiKeyService } from '@/lib/services/api-key-service'
import { handlePreflight } from '@/lib/middleware/cors'
import { v1UpdateCompanySchema, uuidParamSchema, formatZodError } from '@/lib/validations/v1-api'
import { createRequestLogger, formatError } from '@/lib/utils/logger'

async function handleGet(
  _request: NextRequest,
  context: ApiKeyAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  if (!ApiKeyService.hasScope(context.apiKey, 'companies:read')) {
    return NextResponse.json(
      { error: 'Missing required scope: companies:read' },
      { status: 403 }
    )
  }

  const paramResult = uuidParamSchema.safeParse(params)
  if (!paramResult.success) {
    return NextResponse.json({ error: 'Invalid company ID format' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('id', params.id)
    .eq('organization_id', context.organizationId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

async function handlePatch(
  request: NextRequest,
  context: ApiKeyAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  if (!ApiKeyService.hasScope(context.apiKey, 'companies:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: companies:write' },
      { status: 403 }
    )
  }

  const paramResult = uuidParamSchema.safeParse(params)
  if (!paramResult.success) {
    return NextResponse.json({ error: 'Invalid company ID format' }, { status: 400 })
  }

  const supabase = createAdminClient()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validationResult = v1UpdateCompanySchema.safeParse(body)

  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatZodError(validationResult.error) },
      { status: 400 }
    )
  }

  const updateData = validationResult.data

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', params.id)
    .eq('organization_id', context.organizationId)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

async function handleDelete(
  _request: NextRequest,
  context: ApiKeyAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  if (!ApiKeyService.hasScope(context.apiKey, 'companies:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: companies:write' },
      { status: 403 }
    )
  }

  const paramResult = uuidParamSchema.safeParse(params)
  if (!paramResult.success) {
    return NextResponse.json({ error: 'Invalid company ID format' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Return deleted rows so an unknown / cross-org id (zero rows deleted after
  // the org filter) becomes a 404 rather than a misleading { success: true }.
  const { data: deleted, error } = await supabase
    .from('companies')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', context.organizationId)
    .select('id')

  if (error) {
    const log = createRequestLogger({
      requestId: crypto.randomUUID(),
      method: 'DELETE',
      path: '/api/v1/companies/[id]',
      organizationId: context.apiKey.organization_id,
    })
    log.error(
      { error: formatError(error, 'COMPANY_DELETE_ERROR'), companyId: params.id },
      'Failed to delete company'
    )
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }

  if (!deleted || deleted.length === 0) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true })
}

// Wrapper to extract params
function createHandler(
  handler: (req: NextRequest, ctx: ApiKeyAuthContext, params: { id: string }) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> => {
    const resolvedParams = await params
    const wrappedHandler = withApiKeyAuth((req, ctx) => handler(req, ctx, resolvedParams))
    return wrappedHandler(request)
  }
}

export const GET = createHandler(handleGet)
export const PATCH = createHandler(handlePatch)
export const DELETE = createHandler(handleDelete)
export const OPTIONS = (request: NextRequest) => handlePreflight(request, 'public-api')
