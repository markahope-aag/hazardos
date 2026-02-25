import { NextRequest, NextResponse } from 'next/server';
import { OutlookCalendarService } from '@/lib/services/outlook-calendar-service';
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit';
import { createRequestLogger, formatError } from '@/lib/utils/logger';

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
    const storedState = request.cookies.get('outlook_state')?.value;
    if (state !== storedState) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=invalid_state`
      );
    }

    // Extract organization ID from state
    const [organizationId] = state.split(':');

    // Exchange code for tokens
    const tokens = await OutlookCalendarService.exchangeCodeForTokens(code);

    // Store tokens with placeholder email (will be updated on first API call)
    await OutlookCalendarService.storeTokens(organizationId, tokens, 'pending');

    // Try to get user info to update email
    const userInfo = await OutlookCalendarService.getUserInfo(organizationId);
    if (userInfo) {
      await OutlookCalendarService.storeTokens(organizationId, tokens, userInfo.email);
    }

    // Clear state cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=outlook_calendar`
    );
    response.cookies.delete('outlook_state');

    return response;
  } catch (_error) {
    const log = createRequestLogger({
      requestId: crypto.randomUUID(),
      method: 'GET',
      path: '/api/integrations/outlook-calendar/callback',
    });
    log.error(
      { error: formatError(_error, 'OUTLOOK_CALLBACK_ERROR') },
      'Outlook Calendar callback error'
    );
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=callback_failed`
    );
  }
}
