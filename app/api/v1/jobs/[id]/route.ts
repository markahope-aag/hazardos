import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth';
import { ApiKeyService } from '@/lib/services/api-key-service';
import { handlePreflight } from '@/lib/middleware/cors';
import { v1UpdateJobSchema, uuidParamSchema, formatZodError } from '@/lib/validations/v1-api';

async function handleGet(
  _request: NextRequest,
  context: ApiKeyAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'jobs:read')) {
    return NextResponse.json(
      { error: 'Missing required scope: jobs:read' },
      { status: 403 }
    );
  }

  // Validate ID parameter
  const paramResult = uuidParamSchema.safeParse(params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: 'Invalid job ID format' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(id, name, company_name, email, phone)
    `)
    .eq('id', params.id)
    .eq('organization_id', context.organizationId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

async function handlePatch(
  request: NextRequest,
  context: ApiKeyAuthContext,
  params: { id: string }
): Promise<NextResponse> {
  // Check scope
  if (!ApiKeyService.hasScope(context.apiKey, 'jobs:write')) {
    return NextResponse.json(
      { error: 'Missing required scope: jobs:write' },
      { status: 403 }
    );
  }

  // Validate ID parameter
  const paramResult = uuidParamSchema.safeParse(params);
  if (!paramResult.success) {
    return NextResponse.json(
      { error: 'Invalid job ID format' },
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

  const validationResult = v1UpdateJobSchema.safeParse(body);

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
    .from('jobs')
    .update(updateData)
    .eq('id', params.id)
    .eq('organization_id', context.organizationId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
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
export const OPTIONS = (request: NextRequest) => handlePreflight(request, 'public-api');
