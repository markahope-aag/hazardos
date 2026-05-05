import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'
import { logger } from '@/lib/utils/logger'
import { renderPasswordResetEmail } from '@/lib/emails/password-reset'

/**
 * POST /api/auth/forgot-password
 *
 * Public endpoint that mints a Supabase recovery link via the admin API
 * and sends it through Resend with HazardOS branding — instead of the
 * unbranded Supabase default email. Always returns 200 so attackers
 * can't enumerate which emails have accounts.
 */

const bodySchema = z.object({
  email: z.string().email().max(320),
})

export async function POST(request: NextRequest) {
  const rateLimitResponse = await applyUnifiedRateLimit(request, 'public')
  if (rateLimitResponse) return rateLimitResponse

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    // Don't reveal what was wrong — just no-op.
    return NextResponse.json({ ok: true })
  }

  const { email } = parsed.data

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const resendApiKey = process.env.RESEND_API_KEY

  if (!supabaseUrl || !serviceKey || !appUrl) {
    logger.error('Forgot-password: Supabase admin credentials missing')
    return NextResponse.json({ ok: true })
  }

  const admin = createServiceClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // generateLink mints a Supabase recovery token for this email. We
  // intentionally use the returned `hashed_token` to build our own
  // confirm URL (pointing at /auth/confirm on this app) instead of
  // Supabase's default `action_link`. The default action_link routes
  // through Supabase's `/auth/v1/verify` and then redirects to the
  // project's Site URL — which sends users to localhost unless the
  // dashboard's allowed-redirect list is configured exactly right.
  // Going direct removes that footgun entirely.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${appUrl}/reset-password`,
    },
  })

  const hashedToken = linkData?.properties?.hashed_token
  if (linkError || !hashedToken) {
    // The most common failure here is "user not found" — log at debug
    // (not error) so we don't generate alerts for normal traffic.
    logger.debug({ err: linkError?.message }, 'Forgot-password: no recovery link minted')
    return NextResponse.json({ ok: true })
  }

  const confirmUrl = `${appUrl.replace(/\/$/, '')}/auth/confirm?token_hash=${encodeURIComponent(
    hashedToken,
  )}&type=recovery&next=${encodeURIComponent('/reset-password')}`

  if (!resendApiKey) {
    logger.warn('Forgot-password: RESEND_API_KEY missing; recovery link minted but not delivered')
    return NextResponse.json({ ok: true })
  }

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(resendApiKey)

    const fromDomain = process.env.RESEND_PLATFORM_DOMAIN || process.env.RESEND_DOMAIN || 'hazardos.app'
    const { html, text } = renderPasswordResetEmail({
      actionLink: confirmUrl,
      appUrl,
    })

    await resend.emails.send({
      from: `HazardOS <no-reply@${fromDomain}>`,
      to: email,
      subject: 'Reset your HazardOS password',
      html,
      text,
      tags: [{ name: 'category', value: 'password-reset' }],
    })

    logger.info({ email }, 'Password reset email sent')
  } catch (err) {
    logger.error({ err }, 'Forgot-password: failed to send email')
    // Still return 200 — caller shouldn't differentiate.
  }

  return NextResponse.json({ ok: true })
}
