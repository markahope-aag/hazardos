import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { EmailService } from '@/lib/services/email/email-service'
import { ROLES } from '@/lib/auth/roles'

const createSchema = z.object({
  domain: z.string().min(3).max(253),
})

/**
 * GET  /api/organizations/me/email-domain
 *   Current status + DNS records for the tenant's verified domain.
 * POST /api/organizations/me/email-domain
 *   Start verification for a new domain.
 * PATCH /api/organizations/me/email-domain
 *   Re-poll the provider for the current status.
 * DELETE /api/organizations/me/email-domain
 *   Remove the custom domain; reverts to shared platform sender.
 */

export const GET = createApiHandler(
  { allowedRoles: ROLES.TENANT_ADMIN },
  async (_request, context) => {
    const { data: org } = await context.supabase
      .from('organizations')
      .select('email_domain, email_domain_status, email_domain_records, email_domain_verified_at')
      .eq('id', context.profile.organization_id)
      .single()

    return NextResponse.json({
      domain: org?.email_domain ?? null,
      status: org?.email_domain_status ?? null,
      records: org?.email_domain_records ?? [],
      verifiedAt: org?.email_domain_verified_at ?? null,
    })
  },
)

export const POST = createApiHandler(
  { allowedRoles: ROLES.TENANT_ADMIN, bodySchema: createSchema },
  async (_request, context, body) => {
    const result = await EmailService.startDomainVerification(
      context.profile.organization_id,
      body.domain,
    )
    return NextResponse.json({
      domain: result.domain,
      status: 'pending' as const,
      records: result.records,
    })
  },
)

export const PATCH = createApiHandler(
  { allowedRoles: ROLES.TENANT_ADMIN },
  async (_request, context) => {
    const result = await EmailService.refreshDomainStatus(context.profile.organization_id)
    return NextResponse.json({
      domain: result.domain ?? null,
      status: result.status,
      records: result.records,
    })
  },
)

export const DELETE = createApiHandler(
  { allowedRoles: ROLES.TENANT_ADMIN },
  async (_request, context) => {
    await EmailService.removeDomain(context.profile.organization_id)
    return NextResponse.json({ ok: true })
  },
)
