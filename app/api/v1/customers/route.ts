import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth';
import { sanitizeSearchQuery } from '@/lib/utils/sanitize';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { handlePreflight } from '@/lib/middleware/cors';
import { v1CustomerListQuerySchema, v1CreateCustomerSchema, formatZodError } from '@/lib/validations/v1-api';
import { createRequestLogger, formatError } from '@/lib/utils/logger';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';

// Public projection for customers — identical to the single-record [id] route,
// so the collection endpoint can't expose more than fetching one record does.
const V1_CUSTOMER_COLUMNS =
  'id, organization_id, name, first_name, last_name, company_name, email, phone, mobile, website, status, customer_type, lead_source, address_line1, address_line2, city, state, zip, country, notes, tags, billing_email, preferred_contact_method, created_at, updated_at';

async function handleGet(request: NextRequest, context: ApiKeyAuthContext): Promise<NextResponse> {
  const rateLimitResponse = await applyUnifiedRateLimit(request, 'public');
  if (rateLimitResponse) return rateLimitResponse;

  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'customers:read')) {
    return NextResponse.json(
      { error: 'Missing required scope: customers:read' },
      { status: 403 }
    );
  }

  const supabase = createAdminClient();
  const searchParams = request.nextUrl.searchParams;

  // Validate query parameters
  const queryResult = v1CustomerListQuerySchema.safeParse({
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
    status: searchParams.get('status') || undefined,
    search: searchParams.get('search') || undefined,
  });

  if (!queryResult.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: formatZodError(queryResult.error) },
      { status: 400 }
    );
  }

  const { limit = 50, offset = 0, status, search } = queryResult.data;

  let query = supabase
    .from('customers')
    // Curated projection — must match the single-record [id] route. `select('*')`
    // leaked ~64 internal columns here (QuickBooks/HubSpot/Mailchimp IDs,
    // insurance PII, sms_opt_in_ip, lifetime_value, attribution) that the [id]
    // route deliberately withholds.
    .select(V1_CUSTOMER_COLUMNS, { count: 'exact' })
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    const safe = sanitizeSearchQuery(search);
    query = query.or(`first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,email.ilike.%${safe}%,company_name.ilike.%${safe}%`);
  }

  const { data, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
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
  if (!ApiKeyService.hasScope(context.apiKey, 'customers:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: customers:write' },
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

  const validationResult = v1CreateCustomerSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatZodError(validationResult.error) },
      { status: 400 }
    );
  }

  const {
    first_name,
    last_name,
    email,
    phone,
    company_name,
    address_line1,
    address_line2,
    city,
    state,
    zip,
    notes,
    status,
    customer_type,
    lead_source,
  } = validationResult.data;

  // `customers.name` is NOT NULL with no default, but the v1 create payload
  // only carries the structured name parts — derive a display name so the
  // insert doesn't 23502. Falls back through company then email so a row is
  // always well-formed.
  const derivedName =
    [first_name, last_name].filter(Boolean).join(' ').trim() ||
    company_name ||
    email ||
    'Customer';

  const { data, error } = await supabase
    .from('customers')
    .insert({
      organization_id: context.organizationId,
      name: derivedName,
      first_name,
      last_name,
      email,
      phone,
      company_name,
      address_line1,
      address_line2,
      city,
      state,
      zip,
      notes,
      status: status || 'active',
      customer_type,
      lead_source: lead_source || 'api',
    })
    .select()
    .single();

  if (error) {
    const log = createRequestLogger({
      requestId: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/customers',
      organizationId: context.apiKey.organization_id,
    });
    log.error(
      { error: formatError(error, 'CUSTOMER_CREATE_ERROR') },
      'Failed to create customer'
    );
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export const GET = withApiKeyAuth(handleGet);
export const POST = withApiKeyAuth(handlePost);
export const OPTIONS = (request: NextRequest) => handlePreflight(request, 'public-api');
