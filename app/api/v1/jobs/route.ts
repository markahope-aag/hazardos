import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { handlePreflight } from '@/lib/middleware/cors';

async function handleGet(request: NextRequest, context: ApiKeyAuthContext): Promise<NextResponse> {
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'jobs:read')) {
    return NextResponse.json(
      { error: 'Missing required scope: jobs:read' },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
  const offset = parseInt(searchParams.get('offset') || '0');
  const status = searchParams.get('status');
  const customer_id = searchParams.get('customer_id');

  let query = supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(id, first_name, last_name, company_name, email)
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
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'jobs:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: jobs:write' },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const body = await request.json();

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
  } = body;

  // Validation
  if (!customer_id) {
    return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
  }

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

  // Generate job number
  const { count } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', context.organizationId);

  const jobNumber = `JOB-${String((count || 0) + 1).padStart(5, '0')}`;

  const { data, error } = await supabase
    .from('jobs')
    .insert({
      organization_id: context.organizationId,
      customer_id,
      job_number: jobNumber,
      job_type,
      hazard_types: hazard_types || [],
      scheduled_date,
      description,
      notes,
      site_address_line1,
      site_city,
      site_state,
      site_zip,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

export const GET = withApiKeyAuth(handleGet);
export const POST = withApiKeyAuth(handlePost);
export const OPTIONS = (request: NextRequest) => handlePreflight(request, 'public-api');
