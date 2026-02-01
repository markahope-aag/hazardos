import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth';
import { ApiKeyService } from '@/lib/services/api-key-service';

async function handleGet(request: NextRequest, context: ApiKeyAuthContext): Promise<NextResponse> {
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'estimates:read')) {
    return NextResponse.json(
      { error: 'Missing required scope: estimates:read' },
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
    .from('estimates')
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
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'estimates:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: estimates:write' },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const body = await request.json();

  const {
    customer_id,
    site_survey_id,
    line_items,
    valid_until,
    notes,
  } = body;

  // Validation
  if (!customer_id) {
    return NextResponse.json({ error: 'customer_id is required' }, { status: 400 });
  }

  if (!line_items?.length) {
    return NextResponse.json({ error: 'At least one line_item is required' }, { status: 400 });
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

  // Generate estimate number
  const { count } = await supabase
    .from('estimates')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', context.organizationId);

  const estimateNumber = `EST-${String((count || 0) + 1).padStart(5, '0')}`;

  // Calculate totals
  let totalAmount = 0;
  for (const item of line_items) {
    totalAmount += (item.quantity || 1) * (item.unit_price || 0);
  }

  const { data: estimate, error } = await supabase
    .from('estimates')
    .insert({
      organization_id: context.organizationId,
      customer_id,
      site_survey_id,
      estimate_number: estimateNumber,
      total_amount: totalAmount,
      valid_until: valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to create estimate' }, { status: 500 });
  }

  // Create line items
  const lineItemsToInsert = line_items.map((item: { description: string; quantity?: number; unit_price: number; category?: string }, index: number) => ({
    estimate_id: estimate.id,
    organization_id: context.organizationId,
    description: item.description,
    quantity: item.quantity || 1,
    unit_price: item.unit_price,
    line_total: (item.quantity || 1) * item.unit_price,
    category: item.category || 'general',
    sort_order: index,
  }));

  await supabase.from('estimate_line_items').insert(lineItemsToInsert);

  return NextResponse.json({ data: estimate }, { status: 201 });
}

export const GET = withApiKeyAuth(handleGet);
export const POST = withApiKeyAuth(handlePost);
