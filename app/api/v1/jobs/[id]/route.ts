import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withApiKeyAuth, ApiKeyAuthContext } from '@/lib/middleware/api-key-auth';
import { ApiKeyService } from '@/lib/services/api-key-service';

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

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(id, first_name, last_name, company_name, email, phone)
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

  const supabase = await createClient();
  const body = await request.json();

  // Only allow updating certain fields
  const allowedFields = [
    'job_type', 'hazard_types', 'scheduled_date', 'description', 'notes',
    'site_address_line1', 'site_city', 'site_state', 'site_zip', 'status',
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

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
