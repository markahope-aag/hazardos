import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/server-auth'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { createServiceLogger, formatError } from '@/lib/utils/logger'
import type {
  CreateCredentialInput,
  UpdateCredentialInput,
  CreateCredentialTypeInput,
  UpdateCredentialTypeInput,
  ListCredentialsQuery,
  ListCredentialTypesQuery,
  CredentialStatus,
} from '@/lib/validations/credential'

const log = createServiceLogger('CredentialsService')

// ===========================================================================
// Domain types
// ===========================================================================
export interface CredentialType {
  id: string
  organization_id: string
  name: string
  category: string
  applies_to: string
  issuing_authority: string | null
  default_valid_days: number | null
  warning_lead_days: number
  required_for_containment_levels: string[] | null
  required_for_hazard_types: string[] | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CredentialRecord {
  id: string
  organization_id: string
  credential_type_id: string
  worker_id: string | null
  asset_id: string | null
  identifier: string | null
  issued_date: string | null
  expiry_date: string | null
  document_path: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CredentialWithStatus extends CredentialRecord {
  status: CredentialStatus
  credential_type_name: string
  category: string
  warning_lead_days: number
  worker_name: string | null
}

// Per-requirement state for a worker on a job.
export type WorkerCredentialState = 'valid' | 'expiring_soon' | 'expired' | 'missing'
export type WorkerReadiness = 'ready' | 'warning' | 'blocked'

export interface RequirementResult {
  credential_type_id: string
  name: string
  category: string
  state: WorkerCredentialState
  credential_id: string | null
  expiry_date: string | null
}

export interface WorkerCompliance {
  worker_id: string
  worker_name: string | null
  readiness: WorkerReadiness
  requirements: RequirementResult[]
}

export interface JobCompliance {
  job_id: string
  containment_level: string | null
  hazard_types: string[]
  required_type_ids: string[]
  workers: WorkerCompliance[]
  summary: { ready: number; warning: number; blocked: number }
  overall: WorkerReadiness
}

export interface AssignmentComplianceCheck {
  worker_id: string
  worker_name: string | null
  readiness: WorkerReadiness
  requirements: RequirementResult[]
  enforcement: 'warn' | 'block'
  allowed: boolean
}

// ===========================================================================
// Pure helpers (exported for unit tests — no I/O)
// ===========================================================================

/** Format a Date as a UTC YYYY-MM-DD string. */
function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Add days to a YYYY-MM-DD string (UTC), returning YYYY-MM-DD. */
function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return toISODate(d)
}

/**
 * Derive a credential's status from its expiry date and the type's warning
 * lead window. Computed, never stored (status depends on "today"). Pure and
 * deterministic given `now`.
 */
export function deriveCredentialStatus(
  expiryDate: string | null,
  warningLeadDays: number,
  now: Date = new Date(),
): CredentialStatus {
  if (!expiryDate) return 'no_expiry'
  const today = toISODate(now)
  if (expiryDate < today) return 'expired'
  const warnCutoff = addDays(today, warningLeadDays ?? 30)
  if (expiryDate <= warnCutoff) return 'expiring_soon'
  return 'valid'
}

/**
 * Given a job's containment level + hazard types, resolve which credential
 * types are required. A type is required if the job's containment level is in
 * its required_for_containment_levels, OR any of the job's hazard types is in
 * its required_for_hazard_types. Pure.
 */
export function resolveRequiredTypes(
  job: { containment_level: string | null; hazard_types: string[] | null },
  types: CredentialType[],
): CredentialType[] {
  const hazards = job.hazard_types ?? []
  return types.filter((t) => {
    if (!t.is_active || t.applies_to !== 'worker') return false
    const containmentMatch =
      !!job.containment_level &&
      (t.required_for_containment_levels ?? []).includes(job.containment_level)
    const hazardMatch = (t.required_for_hazard_types ?? []).some((h) => hazards.includes(h))
    return containmentMatch || hazardMatch
  })
}

/**
 * Evaluate one worker against the required types, given the credentials that
 * worker holds (already status-derived). Pure.
 */
export function evaluateWorker(
  workerId: string,
  workerName: string | null,
  requiredTypes: CredentialType[],
  workerCredentials: CredentialWithStatus[],
): WorkerCompliance {
  const byType = new Map<string, CredentialWithStatus[]>()
  for (const c of workerCredentials) {
    const list = byType.get(c.credential_type_id) ?? []
    list.push(c)
    byType.set(c.credential_type_id, list)
  }

  const requirements: RequirementResult[] = requiredTypes.map((t) => {
    const held = byType.get(t.id) ?? []
    if (held.length === 0) {
      return {
        credential_type_id: t.id,
        name: t.name,
        category: t.category,
        state: 'missing',
        credential_id: null,
        expiry_date: null,
      }
    }
    // Prefer the credential with the furthest-out expiry (best coverage).
    const best = held.slice().sort((a, b) => {
      const av = a.expiry_date ?? '9999-12-31'
      const bv = b.expiry_date ?? '9999-12-31'
      return av < bv ? 1 : av > bv ? -1 : 0
    })[0]
    const state: WorkerCredentialState =
      best.status === 'no_expiry' ? 'valid' : (best.status as WorkerCredentialState)
    return {
      credential_type_id: t.id,
      name: t.name,
      category: t.category,
      state,
      credential_id: best.id,
      expiry_date: best.expiry_date,
    }
  })

  const hasBlocking = requirements.some((r) => r.state === 'missing' || r.state === 'expired')
  const hasWarning = requirements.some((r) => r.state === 'expiring_soon')
  const readiness: WorkerReadiness = hasBlocking ? 'blocked' : hasWarning ? 'warning' : 'ready'

  return { worker_id: workerId, worker_name: workerName, readiness, requirements }
}

// ===========================================================================
// Service
// ===========================================================================
export class CredentialsService {
  private static async ctx() {
    const supabase = await createClient()
    const user = await getCurrentUser()
    if (!user) throw new SecureError('UNAUTHORIZED')
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    if (!profile?.organization_id) throw new SecureError('UNAUTHORIZED')
    return { supabase, organizationId: profile.organization_id as string, userId: user.id as string }
  }

  // ----- credential_types -----
  static async listTypes(query: ListCredentialTypesQuery = {}): Promise<CredentialType[]> {
    const { supabase, organizationId } = await this.ctx()
    let q = supabase
      .from('credential_types')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name')
    if (query.active_only) q = q.eq('is_active', true)
    if (query.applies_to) q = q.eq('applies_to', query.applies_to)
    const { data, error } = await q
    if (error) throwDbError(error, 'list credential types')
    return (data ?? []) as CredentialType[]
  }

  static async createType(input: CreateCredentialTypeInput): Promise<CredentialType> {
    const { supabase, organizationId, userId } = await this.ctx()
    const { data, error } = await supabase
      .from('credential_types')
      .insert({ ...input, organization_id: organizationId, created_by: userId })
      .select('*')
      .single()
    if (error) throwDbError(error, 'create credential type')
    return data as CredentialType
  }

  static async updateType(id: string, input: UpdateCredentialTypeInput): Promise<CredentialType> {
    const { supabase, organizationId } = await this.ctx()
    const { data, error } = await supabase
      .from('credential_types')
      .update(input)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .single()
    if (error) throwDbError(error, 'update credential type')
    return data as CredentialType
  }

  static async deleteType(id: string): Promise<void> {
    const { supabase, organizationId } = await this.ctx()
    const { error } = await supabase
      .from('credential_types')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
    if (error) {
      // ON DELETE RESTRICT: a type in use can't be removed.
      if (error.code === '23503') {
        throw new SecureError('VALIDATION_ERROR', 'This credential type is in use and cannot be deleted. Deactivate it instead.')
      }
      throwDbError(error, 'delete credential type')
    }
  }

  // ----- credentials -----
  private static async enrich(
    supabase: Awaited<ReturnType<typeof createClient>>,
    organizationId: string,
    rows: CredentialRecord[],
  ): Promise<CredentialWithStatus[]> {
    if (rows.length === 0) return []
    const typeIds = [...new Set(rows.map((r) => r.credential_type_id))]
    const workerIds = [...new Set(rows.map((r) => r.worker_id).filter((x): x is string => !!x))]

    const [{ data: types }, { data: workers }] = await Promise.all([
      supabase.from('credential_types').select('id,name,category,warning_lead_days').in('id', typeIds),
      workerIds.length
        ? supabase.from('profiles').select('id,first_name,last_name,full_name').in('id', workerIds)
        : Promise.resolve({ data: [] as Array<Record<string, unknown>> }),
    ])

    const typeMap = new Map((types ?? []).map((t) => [t.id as string, t]))
    const workerMap = new Map((workers ?? []).map((w) => [w.id as string, w]))

    return rows.map((r) => {
      const t = typeMap.get(r.credential_type_id)
      const w = r.worker_id ? workerMap.get(r.worker_id) : undefined
      const warningLead = (t?.warning_lead_days as number) ?? 30
      const workerName = w
        ? (w.full_name as string) ||
          [w.first_name, w.last_name].filter(Boolean).join(' ') ||
          null
        : null
      return {
        ...r,
        status: deriveCredentialStatus(r.expiry_date, warningLead),
        credential_type_name: (t?.name as string) ?? 'Unknown',
        category: (t?.category as string) ?? 'other',
        warning_lead_days: warningLead,
        worker_name: workerName,
      }
    })
  }

  static async listCredentials(filters: ListCredentialsQuery = {}): Promise<CredentialWithStatus[]> {
    const { supabase, organizationId } = await this.ctx()
    let q = supabase.from('credentials').select('*').eq('organization_id', organizationId)
    if (filters.worker_id) q = q.eq('worker_id', filters.worker_id)
    if (filters.credential_type_id) q = q.eq('credential_type_id', filters.credential_type_id)
    if (filters.expiring_before) q = q.lte('expiry_date', filters.expiring_before)
    const { data, error } = await q.order('expiry_date', { ascending: true, nullsFirst: false })
    if (error) throwDbError(error, 'list credentials')

    let enriched = await this.enrich(supabase, organizationId, (data ?? []) as CredentialRecord[])
    if (filters.category) enriched = enriched.filter((c) => c.category === filters.category)
    if (filters.status) enriched = enriched.filter((c) => c.status === filters.status)
    return enriched
  }

  static async getCredential(id: string): Promise<CredentialWithStatus | null> {
    const { supabase, organizationId } = await this.ctx()
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()
    if (error) throwDbError(error, 'get credential')
    if (!data) return null
    const [enriched] = await this.enrich(supabase, organizationId, [data as CredentialRecord])
    return enriched
  }

  static async getWorkerCredentials(workerId: string): Promise<CredentialWithStatus[]> {
    return this.listCredentials({ worker_id: workerId })
  }

  static async getExpiring(withinDays: number): Promise<CredentialWithStatus[]> {
    const cutoff = addDays(toISODate(new Date()), withinDays)
    const all = await this.listCredentials({ expiring_before: cutoff })
    return all.filter((c) => c.status === 'expiring_soon' || c.status === 'expired')
  }

  static async getExpired(): Promise<CredentialWithStatus[]> {
    const all = await this.listCredentials({})
    return all.filter((c) => c.status === 'expired')
  }

  static async createCredential(input: CreateCredentialInput): Promise<CredentialWithStatus> {
    const { supabase, organizationId, userId } = await this.ctx()
    const { data, error } = await supabase
      .from('credentials')
      .insert({
        credential_type_id: input.credential_type_id,
        worker_id: input.worker_id,
        identifier: input.identifier ?? null,
        issued_date: input.issued_date ?? null,
        expiry_date: input.expiry_date ?? null,
        document_path: input.document_path ?? null,
        notes: input.notes ?? null,
        organization_id: organizationId,
        created_by: userId,
      })
      .select('*')
      .single()
    if (error) throwDbError(error, 'create credential')
    const [enriched] = await this.enrich(supabase, organizationId, [data as CredentialRecord])
    return enriched
  }

  static async updateCredential(id: string, input: UpdateCredentialInput): Promise<CredentialWithStatus> {
    const { supabase, organizationId } = await this.ctx()
    const { data, error } = await supabase
      .from('credentials')
      .update(input)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select('*')
      .single()
    if (error) throwDbError(error, 'update credential')
    // Reset expiry-alert dedup so a renewed-then-lapsing credential alerts again.
    if ('expiry_date' in input) {
      await supabase.from('credential_alerts').delete().eq('credential_id', id)
    }
    const [enriched] = await this.enrich(supabase, organizationId, [data as CredentialRecord])
    return enriched
  }

  static async deleteCredential(id: string): Promise<void> {
    const { supabase, organizationId } = await this.ctx()
    const { error } = await supabase
      .from('credentials')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
    if (error) throwDbError(error, 'delete credential')
  }

  // ----- compliance (the killer integration) -----

  /**
   * Compute compliance for every crew member currently assigned to a job:
   * which required credentials each worker holds/lacks/has-expired.
   */
  static async getComplianceForJob(jobId: string): Promise<JobCompliance> {
    const { supabase, organizationId } = await this.ctx()

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, organization_id, containment_level, hazard_types')
      .eq('id', jobId)
      .eq('organization_id', organizationId)
      .single()
    if (jobErr || !job) throw new SecureError('NOT_FOUND', 'Job not found')

    const { data: crewRows, error: crewErr } = await supabase
      .from('job_crew')
      .select('profile_id')
      .eq('job_id', jobId)
    if (crewErr) throwDbError(crewErr, 'load job crew')
    const workerIds = [...new Set((crewRows ?? []).map((c) => c.profile_id as string))]

    const requiredTypes = await this.requiredTypesForJob(supabase, organizationId, job)
    const requiredTypeIds = requiredTypes.map((t) => t.id)

    const workers = await this.evaluateWorkers(
      supabase,
      organizationId,
      workerIds,
      requiredTypes,
    )

    const summary = { ready: 0, warning: 0, blocked: 0 }
    for (const w of workers) summary[w.readiness]++
    const overall: WorkerReadiness =
      summary.blocked > 0 ? 'blocked' : summary.warning > 0 ? 'warning' : 'ready'

    return {
      job_id: jobId,
      containment_level: job.containment_level as string | null,
      hazard_types: (job.hazard_types as string[]) ?? [],
      required_type_ids: requiredTypeIds,
      workers,
      summary,
      overall,
    }
  }

  /**
   * The assignment gate: evaluate a single worker being added to a job and
   * decide whether the org's enforcement setting allows the assignment.
   */
  static async checkWorkerForJob(jobId: string, workerId: string): Promise<AssignmentComplianceCheck> {
    const { supabase, organizationId } = await this.ctx()

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('id, containment_level, hazard_types')
      .eq('id', jobId)
      .eq('organization_id', organizationId)
      .single()
    if (jobErr || !job) throw new SecureError('NOT_FOUND', 'Job not found')

    const { data: org } = await supabase
      .from('organizations')
      .select('credential_assignment_enforcement')
      .eq('id', organizationId)
      .single()
    const enforcement = (org?.credential_assignment_enforcement as 'warn' | 'block') ?? 'warn'

    const requiredTypes = await this.requiredTypesForJob(supabase, organizationId, job)
    const [worker] = await this.evaluateWorkers(supabase, organizationId, [workerId], requiredTypes)

    const readiness = worker?.readiness ?? 'ready'
    const allowed = enforcement === 'block' ? readiness !== 'blocked' : true

    return {
      worker_id: workerId,
      worker_name: worker?.worker_name ?? null,
      readiness,
      requirements: worker?.requirements ?? [],
      enforcement,
      allowed,
    }
  }

  // ----- internal shared helpers -----
  private static async requiredTypesForJob(
    supabase: Awaited<ReturnType<typeof createClient>>,
    organizationId: string,
    job: { containment_level: string | null; hazard_types: string[] | null },
  ): Promise<CredentialType[]> {
    const { data: types, error } = await supabase
      .from('credential_types')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
    if (error) throwDbError(error, 'load credential types')
    return resolveRequiredTypes(job, (types ?? []) as CredentialType[])
  }

  private static async evaluateWorkers(
    supabase: Awaited<ReturnType<typeof createClient>>,
    organizationId: string,
    workerIds: string[],
    requiredTypes: CredentialType[],
  ): Promise<WorkerCompliance[]> {
    if (workerIds.length === 0) return []

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, full_name')
      .in('id', workerIds)
    const nameOf = (id: string) => {
      const p = (profiles ?? []).find((x) => x.id === id)
      if (!p) return null
      return (
        (p.full_name as string) ||
        [p.first_name, p.last_name].filter(Boolean).join(' ') ||
        null
      )
    }

    let credsByWorker = new Map<string, CredentialWithStatus[]>()
    if (requiredTypes.length > 0) {
      const { data: creds, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('organization_id', organizationId)
        .in('worker_id', workerIds)
        .in('credential_type_id', requiredTypes.map((t) => t.id))
      if (error) throwDbError(error, 'load worker credentials')
      const enriched = await this.enrich(supabase, organizationId, (creds ?? []) as CredentialRecord[])
      credsByWorker = enriched.reduce((map, c) => {
        if (!c.worker_id) return map
        const list = map.get(c.worker_id) ?? []
        list.push(c)
        map.set(c.worker_id, list)
        return map
      }, new Map<string, CredentialWithStatus[]>())
    }

    return workerIds.map((id) =>
      evaluateWorker(id, nameOf(id), requiredTypes, credsByWorker.get(id) ?? []),
    )
  }
}

export { log as credentialsLog, formatError }
