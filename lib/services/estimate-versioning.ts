import type { SupabaseClient } from '@supabase/supabase-js'
import { SecureError } from '@/lib/utils/secure-error-handler'
import { buildEntityNumberBase, withUniqueSuffix } from '@/lib/utils/entity-number'
import type { VersionInfo } from '@/lib/services/survey-versioning'

/**
 * Create a revised version of an existing estimate. Copies all fields and
 * line items into a new draft estimate that points back at the parent via
 * parent_estimate_id. The trigger increments the version and inherits
 * estimate_root_id from the parent, so the chain stays intact.
 *
 * Used when a customer asks to change something on a sent/draft estimate
 * — the new revision is a fresh editable copy, the prior version stays
 * frozen in history. The site_survey_id is inherited so the chain stays
 * tied to the same survey, but estimate revisions can also exist on a
 * survey-less standalone chain (parent_estimate_id is set, site_survey_id
 * is whatever the parent had — possibly null).
 */
export async function createEstimateRevision(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  parentEstimateId: string,
  options: { revisionNotes?: string | null } = {},
): Promise<{ id: string }> {
  const { data: parent, error: parentError } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', parentEstimateId)
    .eq('organization_id', organizationId)
    .single()

  if (parentError || !parent) {
    throw new SecureError('NOT_FOUND', 'Parent estimate not found')
  }

  // Pick a new number that's still readable (EST-<street>-<mmddyyyy>) but
  // doesn't collide with the parent's. The parent's number stays — we
  // just slap a -r2/-r3 onto the chain's base. Ask the DB for taken
  // numbers so the suffix util can dodge collisions across the whole org.
  const dateForLabel = parent.estimated_start_date || parent.created_at?.slice(0, 10) || null
  let siteAddress: string | null = null
  if (parent.site_survey_id) {
    const { data: survey } = await supabase
      .from('site_surveys')
      .select('site_address')
      .eq('id', parent.site_survey_id)
      .single()
    siteAddress = survey?.site_address ?? null
  }
  const base = buildEntityNumberBase('EST', siteAddress, dateForLabel)
  const { data: existingNumbers } = await supabase
    .from('estimates')
    .select('estimate_number')
    .eq('organization_id', organizationId)
    .like('estimate_number', `${base}%`)
  const taken = new Set((existingNumbers || []).map((r) => r.estimate_number as string))
  const newNumber = withUniqueSuffix(base, taken)

  // The estimate row and its copied line items go in together, inside the RPC.
  // This used to be two client-side inserts with a hand-rolled delete if the
  // second failed; when that compensating delete failed in turn it left a
  // revision with a total and no line items behind it.
  const { data: newEstimateId, error: revisionError } = await supabase.rpc(
    'create_estimate_revision',
    {
      p_parent_estimate_id: parent.id,
      p_organization_id: organizationId,
      p_created_by: userId,
      p_estimate_number: newNumber,
      p_revision_notes: options.revisionNotes ?? null,
    },
  )

  if (revisionError || !newEstimateId) {
    // no_data_found is the RPC's own guard: the parent vanished or belongs to
    // another org between the read above and the locking read inside.
    if (revisionError?.code === 'P0002') {
      throw new SecureError('NOT_FOUND', 'Parent estimate not found')
    }
    throw revisionError || new Error('Failed to create estimate revision')
  }

  return { id: newEstimateId as string }
}

/**
 * Returns the version + total count for an estimate's chain.
 */
export async function getEstimateVersionInfo(
  supabase: SupabaseClient,
  estimateId: string,
): Promise<VersionInfo> {
  const { data: estimate, error: estimateError } = await supabase
    .from('estimates')
    .select('id, version, estimate_root_id')
    .eq('id', estimateId)
    .single()

  if (estimateError || !estimate) {
    throw new SecureError('NOT_FOUND', 'Estimate not found')
  }

  const { data: chain, error: chainError } = await supabase
    .from('estimates')
    .select('version')
    .eq('estimate_root_id', estimate.estimate_root_id)
    .order('version', { ascending: false })
    .limit(1)

  if (chainError) {
    throw chainError
  }

  const total = chain && chain.length > 0 ? chain[0].version : estimate.version

  return {
    version: estimate.version,
    total,
    root_id: estimate.estimate_root_id,
  }
}

export interface EstimateChainEntry {
  id: string
  version: number
  status: string
  created_at: string
  total: number
  estimate_number: string
  revision_notes: string | null
  created_by: string | null
}

/**
 * Returns every version in an estimate chain, ordered v1 -> latest.
 */
export async function getEstimateChain(
  supabase: SupabaseClient,
  estimateId: string,
): Promise<EstimateChainEntry[]> {
  const { data: estimate, error: estimateError } = await supabase
    .from('estimates')
    .select('estimate_root_id')
    .eq('id', estimateId)
    .single()

  if (estimateError || !estimate) {
    throw new SecureError('NOT_FOUND', 'Estimate not found')
  }

  const { data, error } = await supabase
    .from('estimates')
    .select('id, version, status, created_at, total, estimate_number, revision_notes, created_by')
    .eq('estimate_root_id', estimate.estimate_root_id)
    .order('version', { ascending: true })

  if (error) {
    throw error
  }

  return (data || []) as EstimateChainEntry[]
}
