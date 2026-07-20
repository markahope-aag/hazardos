import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { handlePreflight } from '@/lib/middleware/cors';
import { v1EstimateListQuerySchema, v1CreateEstimateSchema, formatZodError } from '@/lib/validations/v1-api';
import { createRequestLogger, formatError } from '@/lib/utils/logger';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';
import { insertWithEntityNumber } from '@/lib/utils/entity-number';

async function handleGet(request: NextRequest, context: ApiKeyAuthContext): Promise<NextResponse> {
  const rateLimitResponse = await applyUnifiedRateLimit(request, 'public');
  if (rateLimitResponse) return rateLimitResponse;

  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'estimates:read')) {
    return NextResponse.json(
      { error: 'Missing required scope: estimates:read' },
      { status: 403 }
    );
  }

  const supabase = createAdminClient();
  const searchParams = request.nextUrl.searchParams;

  // Validate query parameters
  const queryResult = v1EstimateListQuerySchema.safeParse({
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
    .from('estimates')
    .select(`
      *,
      customer:customers(id, name, company_name, email)
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
    return NextResponse.json({ error: 'Failed to fetch estimates' }, { status: 500 });
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
  if (!ApiKeyService.hasScope(context.apiKey, 'estimates:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: estimates:write' },
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

  const validationResult = v1CreateEstimateSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatZodError(validationResult.error) },
      { status: 400 }
    );
  }

  const {
    customer_id,
    site_survey_id,
    line_items,
    valid_until,
    notes,
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

  // If site_survey_id provided, verify it belongs to this org
  if (site_survey_id) {
    const { data: survey } = await supabase
      .from('site_surveys')
      .select('id')
      .eq('id', site_survey_id)
      .eq('organization_id', context.organizationId)
      .single();

    if (!survey) {
      return NextResponse.json({ error: 'Site survey not found' }, { status: 404 });
    }
  }

  // Calculate totals
  let totalAmount = 0;
  for (const item of line_items) {
    totalAmount += item.quantity * item.unit_price;
  }

  // Allocate a race-safe, per-org estimate number and insert.
  // Column names track the post-20260401000004 schema: `total` (not
  // total_amount) and `internal_notes` (not notes).
  const { data: estimate, error } = await insertWithEntityNumber<{ id: string }>(supabase, {
    table: 'estimates',
    organizationId: context.organizationId,
    prefix: 'EST',
    buildRow: (estimateNumber) => ({
      organization_id: context.organizationId,
      customer_id,
      site_survey_id,
      estimate_number: estimateNumber,
      total: totalAmount,
      valid_until: valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      internal_notes: notes,
      status: 'draft',
    }),
  });

  if (error || !estimate) {
    const log = createRequestLogger({
      requestId: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/estimates',
      organizationId: context.apiKey.organization_id,
    });
    log.error(
      { error: formatError(error, 'ESTIMATE_CREATE_ERROR') },
      'Failed to create estimate'
    );
    return NextResponse.json({ error: 'Failed to create estimate' }, { status: 500 });
  }

  // Create line items. Column names track the current estimate_line_items
  // schema: no organization_id column, `total_price` (not line_total), and a
  // NOT NULL `item_type` the v1 payload doesn't carry — default to 'material'.
  const lineItemsToInsert = line_items.map((item, index) => ({
    estimate_id: estimate.id,
    item_type: 'material',
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total_price: item.quantity * item.unit_price,
    category: item.category || 'general',
    sort_order: index,
  }));

  const { error: lineError } = await supabase.from('estimate_line_items').insert(lineItemsToInsert);
  if (lineError) {
    const log = createRequestLogger({
      requestId: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/estimates',
      organizationId: context.apiKey.organization_id,
    });
    log.error({ error: formatError(lineError, 'ESTIMATE_LINE_ITEMS_ERROR'), estimateId: estimate.id },
      'Estimate created but line items failed to insert');
  }

  return NextResponse.json({ data: estimate }, { status: 201 });
}

export const GET = withApiKeyAuth(handleGet);
export const POST = withApiKeyAuth(handlePost);
export const OPTIONS = (request: NextRequest) => handlePreflight(request, 'public-api');
