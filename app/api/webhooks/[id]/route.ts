import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebhookService } from '@/lib/services/webhook-service';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new SecureError('UNAUTHORIZED');
    }

    const { id } = await params;
    const webhook = await WebhookService.get(id);

    if (!webhook) {
      throw new SecureError('NOT_FOUND', 'Webhook not found');
    }

    const deliveries = await WebhookService.getDeliveries(id);

    return NextResponse.json({ webhook, deliveries });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new SecureError('UNAUTHORIZED');
    }

    const { id } = await params;
    const body = await request.json();

    const webhook = await WebhookService.update(id, body);

    return NextResponse.json({ webhook });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new SecureError('UNAUTHORIZED');
    }

    const { id } = await params;
    await WebhookService.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
