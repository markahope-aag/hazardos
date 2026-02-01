import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleCalendarService } from '@/lib/services/google-calendar-service';
import { randomBytes } from 'crypto';
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

    // Generate state token for CSRF protection
    const state = `${profile.organization_id}:${randomBytes(16).toString('hex')}`;

    // Get authorization URL
    const authUrl = GoogleCalendarService.getAuthorizationUrl(state);

    const response = NextResponse.json({ url: authUrl });
    response.cookies.set('gcal_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
