import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/platform-admin/email-deliverability
 *
 * Per-tenant deliverability snapshot over the last 30 days. Intended for
 * platform owners/admins to spot tenants whose bounce or complaint rates
 * are threatening shared-IP reputation.
 */

const WINDOW_DAYS = 30
const BOUNCE_THRESHOLD = 0.05    // 5% bounce rate — industry warning level
const COMPLAINT_THRESHOLD = 0.001 // 0.1% complaint rate — Google/Yahoo hard line

interface TenantStats {
  organization_id: string
  organization_name: string
  total_sent: number
  delivered: number
  bounced: number
  complained: number
  failed: number
  bounce_rate: number
  complaint_rate: number
  has_verified_domain: boolean
  needs_attention: boolean
  first_send_at: string | null
  last_send_at: string | null
}

export const GET = createApiHandler(
  { allowedRoles: ['platform_owner', 'platform_admin'] },
  async (_request, context) => {
    // Role gate already enforced by allowedRoles; the platform-only
    // membership check lives there. Keeping the handler focused on
    // reading stats.
    void context
    const supabase = createAdminClient()
    const windowStart = new Date()
    windowStart.setDate(windowStart.getDate() - WINDOW_DAYS)

    const { data: sends, error: sendsErr } = await supabase
      .from('email_sends')
      .select('organization_id, status')
      .gte('created_at', windowStart.toISOString())
    if (sendsErr) throw sendsErr

    const { data: orgs, error: orgsErr } = await supabase
      .from('organizations')
      .select('id, name, email_domain_status')
    if (orgsErr) throw orgsErr

    const { data: windowsRange, error: rangeErr } = await supabase
      .from('email_sends')
      .select('organization_id, created_at')
      .gte('created_at', windowStart.toISOString())
      .order('created_at', { ascending: true })
    if (rangeErr) throw rangeErr

    const firstByOrg = new Map<string, string>()
    const lastByOrg = new Map<string, string>()
    for (const row of windowsRange || []) {
      if (!firstByOrg.has(row.organization_id)) firstByOrg.set(row.organization_id, row.created_at)
      lastByOrg.set(row.organization_id, row.created_at)
    }

    const byOrg = new Map<string, Omit<TenantStats, 'organization_name' | 'has_verified_domain' | 'needs_attention' | 'bounce_rate' | 'complaint_rate' | 'first_send_at' | 'last_send_at'>>()
    for (const row of sends || []) {
      const existing = byOrg.get(row.organization_id) ?? {
        organization_id: row.organization_id,
        total_sent: 0,
        delivered: 0,
        bounced: 0,
        complained: 0,
        failed: 0,
      }
      existing.total_sent += 1
      if (row.status === 'delivered') existing.delivered += 1
      else if (row.status === 'bounced') existing.bounced += 1
      else if (row.status === 'complained') existing.complained += 1
      else if (row.status === 'failed') existing.failed += 1
      byOrg.set(row.organization_id, existing)
    }

    const orgById = new Map<string, { name: string; verified: boolean }>(
      (orgs || []).map((o) => [
        o.id,
        { name: o.name, verified: o.email_domain_status === 'verified' },
      ]),
    )

    const results: TenantStats[] = Array.from(byOrg.values()).map((stats) => {
      const org = orgById.get(stats.organization_id)
      const bounceRate = stats.total_sent > 0 ? stats.bounced / stats.total_sent : 0
      const complaintRate = stats.total_sent > 0 ? stats.complained / stats.total_sent : 0
      return {
        ...stats,
        organization_name: org?.name ?? 'Unknown org',
        has_verified_domain: org?.verified ?? false,
        bounce_rate: bounceRate,
        complaint_rate: complaintRate,
        needs_attention:
          stats.total_sent >= 50 &&
          (bounceRate >= BOUNCE_THRESHOLD || complaintRate >= COMPLAINT_THRESHOLD),
        first_send_at: firstByOrg.get(stats.organization_id) ?? null,
        last_send_at: lastByOrg.get(stats.organization_id) ?? null,
      }
    })

    results.sort((a, b) => {
      if (a.needs_attention !== b.needs_attention) return a.needs_attention ? -1 : 1
      return b.total_sent - a.total_sent
    })

    return NextResponse.json({
      window_days: WINDOW_DAYS,
      bounce_threshold: BOUNCE_THRESHOLD,
      complaint_threshold: COMPLAINT_THRESHOLD,
      tenants: results,
    })
  },
)
