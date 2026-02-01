import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SmsService } from '@/lib/services/sms-service';
import { SecureError, createSecureErrorResponse } from '@/lib/utils/secure-error-handler';

export async function GET() {
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

    const templates = await SmsService.getTemplates(profile.organization_id);

    return NextResponse.json(templates);
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}

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

    if (!['admin', 'owner'].includes(profile.role || '')) {
      throw new SecureError('FORBIDDEN', 'Admin access required');
    }

    const body = await request.json();

    if (!body.name || !body.message_type || !body.body) {
      throw new SecureError('VALIDATION_ERROR', 'name, message_type, and body are required');
    }

    const template = await SmsService.createTemplate(profile.organization_id, {
      name: body.name,
      message_type: body.message_type,
      body: body.body,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
