import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { ROLES, ROLE } from '@/lib/auth/roles'

/**
 * POST /api/team/[id]/send-password-reset
 * Email the team member a password reset link. Uses Supabase's admin
 * generateLink API (service role) to mint a recovery link, then sends
 * it via Resend so the branding matches the invitation email rather
 * than Supabase's default template.
 */
export const POST = createApiHandlerWithParams(
  {
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, context, params) => {
    const { data: target, error: targetError } = await context.supabase
      .from('profiles')
      .select('id, email, role, first_name, last_name')
      .eq('id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (targetError || !target) {
      throw new SecureError('NOT_FOUND', 'Team member not found')
    }
    if (!target.email) {
      throw new SecureError(
        'VALIDATION_ERROR',
        'This member has no email on file.',
      )
    }

    if (context.user.id === target.id) {
      throw new SecureError(
        'FORBIDDEN',
        'Use the forgot-password flow for your own account.',
      )
    }

    const isOwnerLike =
      context.profile.role === ROLE.TENANT_OWNER ||
      context.profile.role === ROLE.PLATFORM_OWNER ||
      context.profile.role === ROLE.PLATFORM_ADMIN
    if (target.role === ROLE.TENANT_OWNER && !isOwnerLike) {
      throw new SecureError(
        'FORBIDDEN',
        'Only the tenant owner can reset the tenant owner\'s password.',
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const appUrl = process.env.NEXT_PUBLIC_APP_URL
    if (!supabaseUrl || !serviceKey || !appUrl) {
      throw new SecureError(
        'BAD_REQUEST',
        'Server is missing Supabase credentials for admin operations.',
      )
    }

    const admin = createServiceClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: target.email,
      options: {
        redirectTo: `${appUrl}/reset-password`,
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      context.log.error({ error: linkError }, 'Failed to generate recovery link')
      throw new SecureError('BAD_REQUEST', 'Could not generate reset link.')
    }

    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      // If Resend isn't wired up, fall back to returning the link to the
      // admin UI — better than silently failing. The admin can paste it
      // to the user manually.
      return NextResponse.json({
        sent: false,
        action_link: linkData.properties.action_link,
        reason: 'Email provider not configured',
      })
    }

    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendApiKey)

      const { data: org } = await context.supabase
        .from('organizations')
        .select('name')
        .eq('id', context.profile.organization_id)
        .single()

      const orgName = org?.name || 'HazardOS'
      const targetName =
        [target.first_name, target.last_name].filter(Boolean).join(' ').trim() ||
        'there'

      await resend.emails.send({
        from: `${orgName} <notifications@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
        to: target.email,
        subject: `Reset your ${orgName} password`,
        html: `
          <p>Hi ${targetName},</p>
          <p>A ${orgName} administrator requested a password reset for your account. Click the button below to choose a new password.</p>
          <p style="margin-top: 20px;">
            <a href="${linkData.properties.action_link}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
              Reset password
            </a>
          </p>
          <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
            If you didn't expect this, you can ignore this email — your password won't change unless you click the link.
          </p>
        `,
      })

      context.log.info(
        { targetId: target.id },
        'Password reset email sent by admin',
      )
    } catch (emailError) {
      context.log.error({ error: emailError }, 'Failed to send reset email')
      throw new SecureError('BAD_REQUEST', 'Could not send reset email.')
    }

    return NextResponse.json({ sent: true })
  },
)
