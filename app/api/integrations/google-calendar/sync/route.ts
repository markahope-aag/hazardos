import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleCalendarService } from '@/lib/services/google-calendar-service';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';

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
    const { job_id, calendar_id } = body;

    if (!job_id) {
      throw new SecureError('VALIDATION_ERROR', 'job_id is required', 'job_id');
    }

    const eventId = await GoogleCalendarService.syncJobToCalendar(
      profile.organization_id,
      job_id,
      calendar_id || 'primary'
    );

    return NextResponse.json({ success: true, event_id: eventId });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
