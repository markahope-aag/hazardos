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

    const settings = await SmsService.getSettings(profile.organization_id);

    // Return default settings if none exist
    return NextResponse.json(settings || {
      sms_enabled: false,
      appointment_reminders_enabled: true,
      appointment_reminder_hours: 24,
      job_status_updates_enabled: true,
      lead_notifications_enabled: true,
      payment_reminders_enabled: false,
      quiet_hours_enabled: true,
      quiet_hours_start: '21:00',
      quiet_hours_end: '08:00',
      timezone: 'America/Chicago',
      use_platform_twilio: true,
    });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
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

    // Only admins can update SMS settings
    if (!['admin', 'owner'].includes(profile.role || '')) {
      throw new SecureError('FORBIDDEN', 'Admin access required');
    }

    const body = await request.json();

    const settings = await SmsService.updateSettings(profile.organization_id, body);

    return NextResponse.json(settings);
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
