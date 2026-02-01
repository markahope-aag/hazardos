import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth';
import { ApiKeyService } from '@/lib/services/api-key-service';

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

  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const status = searchParams.get('status');
  const search = searchParams.get('search');

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
  const body = await request.json();

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
  } = body;

  // Basic validation
  if (!first_name && !last_name && !company_name) {
    return NextResponse.json(
      { error: 'At least first_name, last_name, or company_name is required' },
      { status: 400 }
    );
  }

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
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export const GET = withApiKeyAuth(handleGet);
export const POST = withApiKeyAuth(handlePost);
