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

  // Insert the new estimate row first (the trigger sets version + root).
  const insertEstimate = {
    organization_id: parent.organization_id,
    site_survey_id: parent.site_survey_id,
    customer_id: parent.customer_id,
    estimate_number: newNumber,
    status: 'draft',
    parent_estimate_id: parent.id,
    revision_notes: options.revisionNotes ?? null,
    project_name: parent.project_name,
    project_description: parent.project_description,
    scope_of_work: parent.scope_of_work,
    estimated_duration_days: parent.estimated_duration_days,
    estimated_start_date: parent.estimated_start_date,
    estimated_end_date: parent.estimated_end_date,
    valid_until: parent.valid_until,
    subtotal: parent.subtotal,
    markup_percent: parent.markup_percent,
    markup_amount: parent.markup_amount,
    discount_percent: parent.discount_percent,
    discount_amount: parent.discount_amount,
    tax_percent: parent.tax_percent,
    tax_amount: parent.tax_amount,
    total: parent.total,
    internal_notes: parent.internal_notes,
    created_by: userId,
  }

  const { data: created, error: createError } = await supabase
    .from('estimates')
    .insert(insertEstimate)
    .select('id')
    .single()

  if (createError || !created) {
    throw createError || new Error('Failed to create estimate revision')
  }

  // Copy line items.
  const { data: parentLineItems, error: lineItemsErr } = await supabase
    .from('estimate_line_items')
    .select('*')
    .eq('estimate_id', parent.id)
    .order('sort_order', { ascending: true })

  if (lineItemsErr) {
    throw lineItemsErr
  }

  if (parentLineItems && parentLineItems.length > 0) {
    const newLineItems = parentLineItems.map((item) => ({
      estimate_id: created.id,
      item_type: item.item_type,
      category: item.category,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      total_price: item.total_price,
      source_rate_id: item.source_rate_id,
      source_table: item.source_table,
      sort_order: item.sort_order,
      is_optional: item.is_optional,
      is_included: item.is_included,
      notes: item.notes,
    }))

    const { error: insertItemsErr } = await supabase
      .from('estimate_line_items')
      .insert(newLineItems)

    if (insertItemsErr) {
      throw insertItemsErr
    }
  }

  return { id: created.id }
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
