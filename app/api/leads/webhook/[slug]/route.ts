import { NextRequest, NextResponse } from 'next/server';
import { LeadWebhookService } from '@/lib/services/lead-webhook-service';

// This endpoint is public - no authentication required
// Authentication is handled per-endpoint using API keys or signatures

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get endpoint configuration
    const endpoint = await LeadWebhookService.getBySlug(slug);

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint not found' },
        { status: 404 }
      );
    }

    if (!endpoint.is_active) {
      return NextResponse.json(
        { error: 'Endpoint is disabled' },
        { status: 403 }
      );
    }

    // Parse request
    const payload = await request.json();

    // Extract headers
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    // Get IP address
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      undefined;

    // Process the lead
    const result = await LeadWebhookService.processLead(
      endpoint,
      payload,
      headers,
      ipAddress
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        customer_id: result.customerId,
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Lead webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Support GET for health checks
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const endpoint = await LeadWebhookService.getBySlug(slug);

  if (!endpoint) {
    return NextResponse.json(
      { error: 'Endpoint not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: endpoint.is_active ? 'active' : 'disabled',
    provider: endpoint.provider,
  });
}
