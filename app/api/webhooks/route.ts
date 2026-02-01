import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WebhookService } from '@/lib/services/webhook-service';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new SecureError('UNAUTHORIZED');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'No organization found');
    }

    const webhooks = await WebhookService.list(profile.organization_id);
    return NextResponse.json({ webhooks });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new SecureError('UNAUTHORIZED');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'No organization found');
    }

    const body = await request.json();
    const { name, url, events, secret, headers } = body;

    if (!name) {
      throw new SecureError('VALIDATION_ERROR', 'Name is required', 'name');
    }
    if (!url) {
      throw new SecureError('VALIDATION_ERROR', 'URL is required', 'url');
    }
    if (!events?.length) {
      throw new SecureError('VALIDATION_ERROR', 'At least one event is required', 'events');
    }

    const webhook = await WebhookService.create(profile.organization_id, {
      name,
      url,
      events,
      secret: secret || WebhookService.generateSecret(),
      headers,
    });

    return NextResponse.json({ webhook });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
