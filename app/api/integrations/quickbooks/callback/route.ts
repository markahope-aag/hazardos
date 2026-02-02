import { NextRequest, NextResponse } from 'next/server';
import { QuickBooksService } from '@/lib/services/quickbooks-service';
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
    const realmId = searchParams.get('realmId');
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=${error}`
      );
    }

    if (!code || !state || !realmId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=missing_params`
      );
    }

    // Validate state
    const storedState = request.cookies.get('qbo_state')?.value;
    if (state !== storedState) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=invalid_state`
      );
    }

    // Extract organization ID from state
    const [organizationId] = state.split(':');

    // Exchange code for tokens
    const tokens = await QuickBooksService.exchangeCodeForTokens(code);

    // Store tokens
    await QuickBooksService.storeTokens(organizationId, tokens, realmId);

    // Clear state cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=true`
    );
    response.cookies.delete('qbo_state');

    return response;
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=callback_failed`
    );
  }
}
