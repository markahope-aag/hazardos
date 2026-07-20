import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { handlePreflight } from '@/lib/middleware/cors';
import { v1CreateJobSchema, v1JobListQuerySchema, formatZodError } from '@/lib/validations/v1-api';
import { createRequestLogger, formatError } from '@/lib/utils/logger';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';
import { insertWithEntityNumber } from '@/lib/utils/entity-number';

async function handleGet(request: NextRequest, context: ApiKeyAuthContext): Promise<NextResponse> {
  const rateLimitResponse = await applyUnifiedRateLimit(request, 'public');
  if (rateLimitResponse) return rateLimitResponse;

  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'jobs:read')) {
    return NextResponse.json(
      { error: 'Missing required scope: jobs:read' },
      { status: 403 }
    );
  }

  const supabase = createAdminClient();
  const searchParams = request.nextUrl.searchParams;

  // Validate query parameters
  const queryResult = v1JobListQuerySchema.safeParse({
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
    status: searchParams.get('status') || undefined,
    customer_id: searchParams.get('customer_id') || undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: formatZodError(queryResult.error) },
      { status: 400 }
    );
  }

  const { limit = 50, offset = 0, status, customer_id } = queryResult.data;

  let query = supabase
    .from('jobs')
    .select(`
      *,
      customer:customers!customer_id(id, name, company_name, email)
    `, { count: 'exact' })
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (customer_id) {
    query = query.eq('customer_id', customer_id);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      total: count,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
  });
}

async function handlePost(request: NextRequest, context: ApiKeyAuthContext): Promise<NextResponse> {
  const rateLimitResponse = await applyUnifiedRateLimit(request, 'public');
  if (rateLimitResponse) return rateLimitResponse;

  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'jobs:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: jobs:write' },
      { status: 403 }
    );
  }

  const supabase = createAdminClient();

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validationResult = v1CreateJobSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatZodError(validationResult.error) },
      { status: 400 }
    );
  }

  const {
    customer_id,
    job_type,
    hazard_types,
    scheduled_date,
    description,
    notes,
    site_address_line1,
    site_city,
    site_state,
    site_zip,
  } = validationResult.data;

  // Verify customer belongs to this org
  const { data: customer } = await supabase
    .from('customers')
    .select('id')
    .eq('id', customer_id)
    .eq('organization_id', context.organizationId)
    .single();

  if (!customer) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Allocate a race-safe, per-org job number and insert.
  //
  // Column names track the current `jobs` schema. Renamed since the v1 route
  // was written: scheduled_date -> scheduled_start_date, notes ->
  // internal_notes, site_address_line1/city/state/zip -> job_address/job_city/
  // job_state/job_zip. `hazard_types` and `status` are unchanged.
  //
  // DECISION NEEDED — two request fields have no current column and are NOT
  // persisted yet (so create succeeds instead of 500ing):
  //   • job_type    — the live schema classifies work via `hazard_types` /
  //                   `containment_level`, not a single job_type. Decide:
  //                   drop from the API, map onto hazard_types, or add a column.
  //   • description — no free-text description column exists; `special_instructions`
  //                   or `scope_of_work` are the likely targets. Confirm which.
  // Until that call is made these two are accepted by validation but ignored;
  // referenced here to keep them in scope and silence unused-var lint.
  void job_type;
  void description;

  const { data, error } = await insertWithEntityNumber<{ id: string }>(supabase, {
    table: 'jobs',
    organizationId: context.organizationId,
    prefix: 'JOB',
    buildRow: (jobNumber) => ({
      organization_id: context.organizationId,
      customer_id,
      job_number: jobNumber,
      hazard_types: hazard_types || [],
      scheduled_start_date: scheduled_date,
      internal_notes: notes,
      job_address: site_address_line1,
      job_city: site_city,
      job_state: site_state,
      job_zip: site_zip,
      status: 'pending',
    }),
  });

  if (error || !data) {
    const log = createRequestLogger({
      requestId: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/jobs',
      organizationId: context.apiKey.organization_id,
    });
    log.error(
      { error: formatError(error, 'JOB_CREATE_ERROR') },
      'Failed to create job'
    );
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export const GET = withApiKeyAuth(handleGet);
export const POST = withApiKeyAuth(handlePost);
export const OPTIONS = (request: NextRequest) => handlePreflight(request, 'public-api');
