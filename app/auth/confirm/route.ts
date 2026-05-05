import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * GET /auth/confirm
 *
 * Recovery / magiclink / signup confirmation handler. The forgot-
 * password email links here directly (instead of to Supabase's
 * `/auth/v1/verify` endpoint) so we don't depend on the project's
 * Site URL allowlist for the post-verify redirect — that allowlist
 * is the reason these links used to bounce to localhost in production.
 *
 * Query params:
 *   token_hash  — Supabase-issued recovery token (from generateLink)
 *   type        — 'recovery' | 'signup' | 'invite' | 'magiclink' | 'email_change'
 *   next        — relative path to send the user to after success
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/'

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${origin}/login?error=invalid_link`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=link_expired`)
  }

  // Recovery flow always lands the user on /reset-password so they can
  // pick a new password before going anywhere else.
  const safeNext = next.startsWith('/') ? next : '/'
  return NextResponse.redirect(`${origin}${safeNext}`)
}
