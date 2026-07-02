import { createAdminClient } from '@/lib/supabase/admin'
import { EmailService } from '@/lib/services/email/email-service'
import { createServiceLogger, formatError } from '@/lib/utils/logger'

const log = createServiceLogger('CredentialExpiryService')

// Buckets (days-to-expiry) at which we alert. Expired credentials fall into 0.
export const ALERT_THRESHOLDS = [0, 7, 14, 30]

const ALERT_RECIPIENT_ROLES = ['admin', 'tenant_owner', 'platform_owner', 'platform_admin']

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return toISODate(d)
}

/** Whole days from `todayISO` until `expiryISO` (negative if already expired). */
export function daysUntil(todayISO: string, expiryISO: string): number {
  const a = Date.parse(`${todayISO}T00:00:00Z`)
  const b = Date.parse(`${expiryISO}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/**
 * The tightest threshold bucket a credential currently falls into, or null if
 * it's further out than the widest threshold (no alert yet). Pure.
 */
export function thresholdBucket(daysUntilExpiry: number, thresholds = ALERT_THRESHOLDS): number | null {
  const sorted = [...thresholds].sort((a, b) => a - b)
  for (const t of sorted) if (daysUntilExpiry <= t) return t
  return null
}

// ---------------------------------------------------------------------------
// Sweep
// ---------------------------------------------------------------------------
export type ExpirySweepResult = {
  scanned: number
  alerted: number
  failed: number
  orgs: number
}

interface DigestItem {
  workerName: string
  typeName: string
  expiryDate: string
  days: number
}

export async function processCredentialExpiry(now: Date = new Date()): Promise<ExpirySweepResult> {
  const supabase = createAdminClient()
  const today = toISODate(now)
  const horizon = addDays(today, Math.max(...ALERT_THRESHOLDS))
  let failed = 0

  const { data: creds, error } = await supabase
    .from('credentials')
    .select('id, organization_id, worker_id, credential_type_id, expiry_date')
    .not('worker_id', 'is', null)
    .not('expiry_date', 'is', null)
    .lte('expiry_date', horizon)

  if (error) {
    log.error({ err: formatError(error) }, 'failed to fetch expiring credentials')
    return { scanned: 0, alerted: 0, failed: 1, orgs: 0 }
  }
  const rows = creds ?? []
  if (rows.length === 0) return { scanned: 0, alerted: 0, failed: 0, orgs: 0 }

  const orgIds = [...new Set(rows.map((r) => r.organization_id as string))]
  const typeIds = [...new Set(rows.map((r) => r.credential_type_id as string))]
  const workerIds = [...new Set(rows.map((r) => r.worker_id as string))]

  const [{ data: types }, { data: workers }, { data: admins }] = await Promise.all([
    supabase.from('credential_types').select('id, name').in('id', typeIds),
    supabase.from('profiles').select('id, first_name, last_name, full_name').in('id', workerIds),
    supabase
      .from('profiles')
      .select('id, organization_id, email')
      .in('organization_id', orgIds)
      .in('role', ALERT_RECIPIENT_ROLES)
      .eq('is_active', true),
  ])

  const typeName = (id: string) =>
    (types ?? []).find((t) => t.id === id)?.name ?? 'Credential'
  const workerName = (id: string) => {
    const w = (workers ?? []).find((x) => x.id === id)
    if (!w) return 'A worker'
    return (
      (w.full_name as string) ||
      [w.first_name, w.last_name].filter(Boolean).join(' ') ||
      'A worker'
    )
  }
  const adminsByOrg = new Map<string, Array<{ id: string; email: string | null }>>()
  for (const a of admins ?? []) {
    const list = adminsByOrg.get(a.organization_id as string) ?? []
    list.push({ id: a.id as string, email: (a.email as string) ?? null })
    adminsByOrg.set(a.organization_id as string, list)
  }

  // Notification preferences for the 'system' type (default = enabled).
  const adminIds = (admins ?? []).map((a) => a.id as string)
  const prefs = new Map<string, { in_app: boolean; email: boolean }>()
  if (adminIds.length) {
    const { data: prefRows } = await supabase
      .from('notification_preferences')
      .select('user_id, in_app, email')
      .in('user_id', adminIds)
      .eq('notification_type', 'system')
    for (const p of prefRows ?? []) {
      prefs.set(p.user_id as string, { in_app: p.in_app as boolean, email: p.email as boolean })
    }
  }

  const notifRows: Array<Record<string, unknown>> = []
  const digests = new Map<string, { orgId: string; email: string; items: DigestItem[] }>()
  let alerted = 0

  // Pre-load already-sent (credential, bucket) keys so we can dedup in memory
  // and bulk-insert the new alert rows once after the loop, instead of issuing
  // one insert per credential.
  const sentKeys = new Set<string>()
  const credIds = rows.map((c) => c.id as string)
  if (credIds.length) {
    const { data: existingAlerts } = await supabase
      .from('credential_alerts')
      .select('credential_id, threshold_days')
      .in('credential_id', credIds)
    for (const a of existingAlerts ?? []) {
      sentKeys.add(`${a.credential_id}:${a.threshold_days}`)
    }
  }
  const newAlertRows: Array<Record<string, unknown>> = []

  for (const cred of rows) {
    const days = daysUntil(today, cred.expiry_date as string)
    const bucket = thresholdBucket(days)
    if (bucket === null) continue

    // Dedup: one alert per (credential, bucket). Skip if already sent (prior run
    // or earlier in this loop); the row is bulk-inserted after the loop.
    const dedupKey = `${cred.id}:${bucket}`
    if (sentKeys.has(dedupKey)) continue
    sentKeys.add(dedupKey)
    newAlertRows.push({
      organization_id: cred.organization_id,
      credential_id: cred.id,
      threshold_days: bucket,
    })

    alerted++
    const tName = typeName(cred.credential_type_id as string)
    const wName = workerName(cred.worker_id as string)
    const expiry = cred.expiry_date as string
    const expired = days < 0
    const title = expired ? `${tName} expired` : `${tName} expiring soon`
    const message = expired
      ? `${wName}'s ${tName} expired on ${expiry}.`
      : `${wName}'s ${tName} expires on ${expiry} (${days} day${days === 1 ? '' : 's'}).`
    const priority = bucket <= 7 ? 'urgent' : 'high'

    for (const admin of adminsByOrg.get(cred.organization_id as string) ?? []) {
      const pref = prefs.get(admin.id)
      if (!pref || pref.in_app) {
        notifRows.push({
          organization_id: cred.organization_id,
          user_id: admin.id,
          type: 'system',
          title,
          message,
          entity_type: 'credential',
          entity_id: cred.id,
          action_url: '/compliance',
          action_label: 'Review',
          priority,
        })
      }
      if ((!pref || pref.email) && admin.email) {
        const digest = digests.get(admin.id) ?? {
          orgId: cred.organization_id as string,
          email: admin.email,
          items: [],
        }
        digest.items.push({ workerName: wName, typeName: tName, expiryDate: expiry, days })
        digests.set(admin.id, digest)
      }
    }
  }

  // Bulk-insert the new alert rows once. upsert + ignoreDuplicates makes this
  // race-safe against a concurrent run (the UNIQUE(credential_id, threshold_days)
  // constraint still guards it).
  if (newAlertRows.length) {
    const { error: alertErr } = await supabase
      .from('credential_alerts')
      .upsert(newAlertRows, { onConflict: 'credential_id,threshold_days', ignoreDuplicates: true })
    if (alertErr) {
      failed++
      log.error({ err: formatError(alertErr) }, 'failed to bulk-insert credential alerts')
    }
  }

  // Bulk in-app notifications.
  if (notifRows.length) {
    const { error: notifErr } = await supabase.from('notifications').insert(notifRows)
    if (notifErr) {
      failed++
      log.error({ err: formatError(notifErr) }, 'failed to insert credential notifications')
    }
  }

  // One digest email per admin — sent concurrently rather than one-at-a-time.
  await Promise.allSettled(
    [...digests.values()].map(async ({ orgId, email, items }) => {
    try {
      const lines = items
        .map((i) =>
          i.days < 0
            ? `• ${i.workerName} — ${i.typeName}: EXPIRED (${i.expiryDate})`
            : `• ${i.workerName} — ${i.typeName}: expires ${i.expiryDate} (${i.days} day${i.days === 1 ? '' : 's'})`,
        )
        .join('\n')
      const subject = `Credential compliance: ${items.length} item${items.length === 1 ? '' : 's'} need attention`
      await EmailService.send(orgId, {
        to: email,
        subject,
        text: `${subject}\n\n${lines}\n\nReview in HazardOS: /compliance`,
        html: `<p><strong>${subject}</strong></p><ul>${items
          .map(
            (i) =>
              `<li>${i.workerName} — ${i.typeName}: ${
                i.days < 0 ? `<strong>expired</strong> (${i.expiryDate})` : `expires ${i.expiryDate} (${i.days}d)`
              }</li>`,
          )
          .join('')}</ul><p><a href="/compliance">Review in HazardOS</a></p>`,
      })
    } catch (e) {
      failed++
      log.error({ err: formatError(e), email }, 'failed to send credential digest email')
    }
    }),
  )

  return { scanned: rows.length, alerted, failed, orgs: orgIds.length }
}
