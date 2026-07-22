import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

interface RouteParams {
  params: Promise<{ token: string }>
}

/**
 * GET /api/portal/proposal/[token]
 * Public endpoint to get proposal by access token.
 *
 * Reads through get_proposal_by_token(), a SECURITY DEFINER function that takes
 * the token as an argument. This used to be a raw-table select gated by an RLS
 * policy that only checked "some unexpired token exists", not that the caller
 * held *this* one — so any authenticated user of any tenant could read every
 * tokened proposal, access_token included. See migration 20260722000001.
 *
 * The function returns only the row matching the token, so that check is now
 * enforced by the database rather than by an application-level .eq().
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Apply rate limiting for public endpoints
    const rateLimitResponse = await applyUnifiedRateLimit(request, 'public')
    if (rateLimitResponse) {
      return rateLimitResponse
    }

    const { token } = await params
    const supabase = await createClient()

    const { data: proposal, error } = await supabase.rpc('get_proposal_by_token', {
      p_token: token,
    })

    if (error) {
      throw new SecureError('NOT_FOUND', 'Proposal not found')
    }

    // null = no proposal carries this token. { expired: true } = one does, but
    // the link has lapsed — kept distinct so the portal can say which.
    if (!proposal) {
      throw new SecureError('NOT_FOUND', 'Proposal not found')
    }

    if (proposal.expired) {
      throw new SecureError('VALIDATION_ERROR', 'This proposal link has expired')
    }

    // Best-effort view tracking. This was previously an anon UPDATE that RLS
    // silently refused, so the counter never moved for the visitors it was
    // meant to measure. The function applies the same status/count transition
    // and no-ops for anything not currently 'sent' or 'viewed'.
    await supabase.rpc('record_proposal_view', { p_token: token })

    return NextResponse.json({ proposal })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
