import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'estimator', 'technician', 'viewer'], {
    message: 'Role is required',
  }),
})

export const GET = createApiHandler(
  {
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('tenant_invitations')
      .select('*')
      .eq('organization_id', context.profile.organization_id)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })

    if (error) throwDbError(error, 'fetch invitations')

    return NextResponse.json({ invitations: data })
  }
)

export const POST = createApiHandler(
  {
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: createInvitationSchema,
  },
  async (_request, context, body) => {
    const { email, role } = body

    // Check if user already exists in this org
    const { data: existingProfile } = await context.supabase
      .from('profiles')
      .select('id')
      .eq('organization_id', context.profile.organization_id)
      .eq('email', email)
      .single()

    if (existingProfile) {
      throw new SecureError('CONFLICT', 'A user with this email already belongs to this organization')
    }

    // Check for existing pending invitation (pending = accepted_at is null)
    const { data: existingInvitation } = await context.supabase
      .from('tenant_invitations')
      .select('id')
      .eq('organization_id', context.profile.organization_id)
      .eq('email', email)
      .is('accepted_at', null)
      .single()

    if (existingInvitation) {
      throw new SecureError('CONFLICT', 'A pending invitation already exists for this email')
    }

    // Generate token and expiry
    const token = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Insert invitation
    const { data: invitation, error } = await context.supabase
      .from('tenant_invitations')
      .insert({
        organization_id: context.profile.organization_id,
        email,
        role,
        token,
        invited_by: context.user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create invitation')

    // Send invitation email via Resend
    const resendApiKey = process.env.RESEND_API_KEY
    if (resendApiKey) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(resendApiKey)

        const { data: org } = await context.supabase
          .from('organizations')
          .select('name')
          .eq('id', context.profile.organization_id)
          .single()

        const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/signup?invite=${token}`

        await resend.emails.send({
          from: `${org?.name || 'HazardOS'} <notifications@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
          to: email,
          subject: `You've been invited to join ${org?.name || 'HazardOS'}`,
          html: `
            <h1>You're invited!</h1>
            <p>You've been invited to join <strong>${org?.name || 'a team'}</strong> on HazardOS as a <strong>${role}</strong>.</p>
            <p style="margin-top: 20px;">
              <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
                Accept Invitation
              </a>
            </p>
            <p style="font-size: 12px; color: #6b7280; margin-top: 20px;">
              This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
          `,
        })

        context.log.info({ email, role }, 'Invitation email sent')
      } catch (emailError) {
        context.log.error({ error: emailError }, 'Failed to send invitation email')
      }
    }

    return NextResponse.json({ invitation }, { status: 201 })
  }
)
