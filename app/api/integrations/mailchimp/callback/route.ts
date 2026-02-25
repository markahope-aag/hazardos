import { NextRequest, NextResponse } from 'next/server';
import { MailchimpService } from '@/lib/services/mailchimp-service';
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
    const storedState = request.cookies.get('mailchimp_state')?.value;
    if (state !== storedState) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=invalid_state`
      );
    }

    // Extract organization ID from state
    const [organizationId] = state.split(':');

    // Exchange code for tokens
    const tokens = await MailchimpService.exchangeCodeForTokens(code);

    // Get account metadata (including data center)
    const metadata = await MailchimpService.getAccountMetadata(tokens.access_token);

    // Store tokens
    await MailchimpService.storeTokens(organizationId, tokens, metadata);

    // Clear state cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=mailchimp`
    );
    response.cookies.delete('mailchimp_state');

    return response;
  } catch (_error) {
    const log = createRequestLogger({
      requestId: crypto.randomUUID(),
      method: 'GET',
      path: '/api/integrations/mailchimp/callback',
    });
    log.error(
      { error: formatError(_error, 'MAILCHIMP_CALLBACK_ERROR') },
      'Mailchimp callback error'
    );
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=callback_failed`
    );
  }
}
