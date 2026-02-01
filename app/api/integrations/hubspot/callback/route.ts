import { NextRequest, NextResponse } from 'next/server';
import { HubSpotService } from '@/lib/services/hubspot-service';
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
    const storedState = request.cookies.get('hubspot_state')?.value;
    if (state !== storedState) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=invalid_state`
      );
    }

    // Extract organization ID from state
    const [organizationId] = state.split(':');

    // Exchange code for tokens
    const tokens = await HubSpotService.exchangeCodeForTokens(code);

    // We need to extract portal ID from the access token info
    // HubSpot includes it in the token response as hub_id or we can fetch it
    // For now, we'll store a placeholder and update on first API call
    const portalId = 'pending';

    // Store tokens
    await HubSpotService.storeTokens(organizationId, tokens, portalId);

    // Clear state cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?success=hubspot`
    );
    response.cookies.delete('hubspot_state');

    return response;
  } catch (_error) {
    console.error('HubSpot callback error:', _error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=callback_failed`
    );
  }
}
