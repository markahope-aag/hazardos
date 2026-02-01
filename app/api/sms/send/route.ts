import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SmsService } from '@/lib/services/sms-service';
import { SecureError, createSecureErrorResponse } from '@/lib/utils/secure-error-handler';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Organization not found');
    }

    const body = await request.json();

    if (!body.to || !body.body || !body.message_type) {
      throw new SecureError('VALIDATION_ERROR', 'to, body, and message_type are required');
    }

    const message = await SmsService.send(profile.organization_id, {
      to: body.to,
      body: body.body,
      message_type: body.message_type,
      customer_id: body.customer_id,
      related_entity_type: body.related_entity_type,
      related_entity_id: body.related_entity_id,
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
