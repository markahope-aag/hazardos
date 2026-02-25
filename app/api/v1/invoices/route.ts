import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { handlePreflight } from '@/lib/middleware/cors';
import { v1InvoiceListQuerySchema, v1CreateInvoiceSchema, formatZodError } from '@/lib/validations/v1-api';
import { createRequestLogger, formatError } from '@/lib/utils/logger';

async function handleGet(request: NextRequest, context: ApiKeyAuthContext): Promise<NextResponse> {
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'invoices:read')) {
    return NextResponse.json(
      { error: 'Missing required scope: invoices:read' },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const searchParams = request.nextUrl.searchParams;

  // Validate query parameters
  const queryResult = v1InvoiceListQuerySchema.safeParse({
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
    .from('invoices')
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
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
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
  if (!ApiKeyService.hasScope(context.apiKey, 'invoices:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: invoices:write' },
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

  const validationResult = v1CreateInvoiceSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatZodError(validationResult.error) },
      { status: 400 }
    );
  }

  const {
    customer_id,
    job_id,
    line_items,
    due_date,
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

  // If job_id provided, verify it belongs to this org
  if (job_id) {
    const { data: job } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', job_id)
      .eq('organization_id', context.organizationId)
      .single();

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
  }

  // Generate invoice number
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', context.organizationId);

  const invoiceNumber = `INV-${String((count || 0) + 1).padStart(5, '0')}`;

  // Calculate totals
  let subtotal = 0;
  for (const item of line_items) {
    subtotal += item.quantity * item.unit_price;
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      organization_id: context.organizationId,
      customer_id,
      job_id,
      invoice_number: invoiceNumber,
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      subtotal,
      tax: 0,
      amount: subtotal,
      amount_paid: 0,
      balance: subtotal,
      notes,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    const log = createRequestLogger({
      requestId: crypto.randomUUID(),
      method: 'POST',
      path: '/api/v1/invoices',
      organizationId: context.apiKey.organization_id,
    });
    log.error(
      { error: formatError(error, 'INVOICE_CREATE_ERROR') },
      'Failed to create invoice'
    );
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }

  // Create line items
  const lineItemsToInsert = line_items.map((item, index) => ({
    invoice_id: invoice.id,
    organization_id: context.organizationId,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    line_total: item.quantity * item.unit_price,
    sort_order: index,
  }));

  await supabase.from('invoice_line_items').insert(lineItemsToInsert);

  return NextResponse.json({ data: invoice }, { status: 201 });
}

export const GET = withApiKeyAuth(handleGet);
export const POST = withApiKeyAuth(handlePost);
export const OPTIONS = (request: NextRequest) => handlePreflight(request, 'public-api');
