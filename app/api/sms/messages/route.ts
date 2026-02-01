import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SmsService } from '@/lib/services/sms-service';
import { SecureError, createSecureErrorResponse } from '@/lib/utils/secure-error-handler';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Organization not found');
    }

    const { searchParams } = new URL(request.url);
    const customer_id = searchParams.get('customer_id') || undefined;
    const status = searchParams.get('status') || undefined;
    const message_type = searchParams.get('message_type') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 50;

    const messages = await SmsService.getMessages(profile.organization_id, {
      customer_id,
      status,
      message_type,
      limit,
    });

    return NextResponse.json(messages);
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
