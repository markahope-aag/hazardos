import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { handlePreflight } from '@/lib/middleware/cors';
import { v1CustomerListQuerySchema, v1CreateCustomerSchema, formatZodError } from '@/lib/validations/v1-api';

async function handleGet(request: NextRequest, context: ApiKeyAuthContext): Promise<NextResponse> {
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'customers:read')) {
    return NextResponse.json(
      { error: 'Missing required scope: customers:read' },
      { status: 403 }
    );
  }

  const supabase = await createClient();
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
    .select('*', { count: 'exact' })
    .eq('organization_id', context.organizationId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%`);
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
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'customers:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: customers:write' },
      { status: 403 }
    );
  }

  const supabase = await createClient();

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

  const { data, error } = await supabase
    .from('customers')
    .insert({
      organization_id: context.organizationId,
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
    console.error('Failed to create customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export const GET = withApiKeyAuth(handleGet);
export const POST = withApiKeyAuth(handlePost);
export const OPTIONS = (request: NextRequest) => handlePreflight(request, 'public-api');
