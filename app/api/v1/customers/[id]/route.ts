import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { handlePreflight } from '@/lib/middleware/cors';
import { v1UpdateCustomerSchema, uuidParamSchema, formatZodError } from '@/lib/validations/v1-api';

async function handleGet(
  _request: NextRequest,
  context: ApiKeyAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'customers:read')) {
    return NextResponse.json(
      { error: 'Missing required scope: customers:read' },
      { status: 403 }
    );
  }

  // Validate ID parameter
  const paramResult = uuidParamSchema.safeParse(params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: 'Invalid customer ID format' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('customers')
    .select('id, organization_id, name, first_name, last_name, company_name, email, phone, mobile, website, status, customer_type, lead_source, address_line1, address_line2, city, state, zip, country, notes, tags, billing_email, preferred_contact_method, created_at, updated_at')
    .eq('id', params.id)
    .eq('organization_id', context.organizationId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

async function handlePatch(
  request: NextRequest,
  context: ApiKeyAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'customers:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: customers:write' },
      { status: 403 }
    );
  }

  // Validate ID parameter
  const paramResult = uuidParamSchema.safeParse(params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: 'Invalid customer ID format' },
      { status: 400 }
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

  const validationResult = v1UpdateCustomerSchema.safeParse(body);

  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: formatZodError(validationResult.error) },
      { status: 400 }
    );
  }

  const updateData = validationResult.data;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', params.id)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

async function handleDelete(
  _request: NextRequest,
  context: ApiKeyAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'customers:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: customers:write' },
      { status: 403 }
    );
  }

  // Validate ID parameter
  const paramResult = uuidParamSchema.safeParse(params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: 'Invalid customer ID format' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', params.id)
    .eq('organization_id', context.organizationId);

  if (error) {
    console.error('Failed to delete customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Wrapper to extract params
function createHandler(
  handler: (req: NextRequest, ctx: ApiKeyAuthContext, params: { id: string }) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ): Promise<NextResponse> => {
    const resolvedParams = await params;
    const wrappedHandler = withApiKeyAuth(
      (req, ctx) => handler(req, ctx, resolvedParams)
    );
    return wrappedHandler(request);
  };
}

export const GET = createHandler(handleGet);
export const PATCH = createHandler(handlePatch);
export const DELETE = createHandler(handleDelete);
export const OPTIONS = (request: NextRequest) => handlePreflight(request, 'public-api');
