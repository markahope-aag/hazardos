import { NextRequest, NextResponse } from 'next/server';
import { GoogleCalendarService } from '@/lib/services/google-calendar-service';
import { jwtDecode } from 'jwt-decode';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting for auth/callback endpoints
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'auth');
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=${error}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=missing_params`
      );
    }

    // Validate state
    const storedState = request.cookies.get('gcal_state')?.value;
    if (state !== storedState) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=invalid_state`
      );
    }

    // Extract organization ID from state
    const [organizationId] = state.split(':');

    // Exchange code for tokens
    const tokens = await GoogleCalendarService.exchangeCodeForTokens(code);

    // Get email from ID token or fetch from userinfo endpoint
    let email = 'unknown';
    if (tokens.id_token) {
      try {
        const decoded = jwtDecode<{ email?: string }>(tokens.id_token);
        email = decoded.email || 'unknown';
      } catch {
        // Fallback to unknown
      }
    }

    // Store tokens
    await GoogleCalendarService.storeTokens(organizationId, tokens, email);

    // Clear state cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=google_calendar`
    );
    response.cookies.delete('gcal_state');

    return response;
  } catch (_error) {
    console.error('Google Calendar callback error:', _error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=callback_failed`
    );
  }
}
