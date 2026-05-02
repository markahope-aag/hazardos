import type { SupabaseClient } from '@supabase/supabase-js'
import type { SiteSurvey } from '@/types/database'
import { SecureError } from '@/lib/utils/secure-error-handler'

export interface VersionInfo {
  version: number
  total: number
  root_id: string
}

/**
 * Create a revised version of an existing survey. Copies all field-captured
 * data (property, access, environment, hazards, photos, notes) into a new
 * row, then sets parent_survey_id and version via the BEFORE INSERT
 * trigger that maintains survey_root_id and version uniqueness within the
 * chain. The new row starts as 'draft' so the user can edit it before
 * resubmitting.
 *
 * Photo metadata is copied as-is — the storage objects are shared rather
 * than duplicated. If the user removes a photo from the revised survey,
 * the underlying storage object stays referenced by the parent version.
 */
export async function createSurveyRevision(
  supabase: SupabaseClient,
  organizationId: string,
  parentSurveyId: string,
  options: { revisionNotes?: string | null } = {},
): Promise<SiteSurvey> {
  const { data: parent, error: parentError } = await supabase
    .from('site_surveys')
    .select('*')
    .eq('id', parentSurveyId)
    .eq('organization_id', organizationId)
    .single()

  if (parentError || !parent) {
    throw new SecureError('NOT_FOUND', 'Parent survey not found')
  }

  // Strip auto-managed fields so the trigger + db assigns fresh values.
  // The trigger copies survey_root_id from the parent and increments the
  // version, so we just hand it the parent_survey_id and let it do its
  // job — passing version explicitly would be ignored when parent is set.
  const insertPayload = {
    organization_id: parent.organization_id,
    estimator_id: parent.estimator_id,
    customer_id: parent.customer_id,
    property_id: parent.property_id,
    job_name: parent.job_name,
    customer_name: parent.customer_name,
    customer_email: parent.customer_email,
    customer_phone: parent.customer_phone,
    site_address: parent.site_address,
    site_city: parent.site_city,
    site_state: parent.site_state,
    site_zip: parent.site_zip,
    hazard_type: parent.hazard_type,
    hazard_subtype: parent.hazard_subtype,
    containment_level: parent.containment_level,
    area_sqft: parent.area_sqft,
    linear_ft: parent.linear_ft,
    volume_cuft: parent.volume_cuft,
    material_type: parent.material_type,
    occupied: parent.occupied,
    access_issues: parent.access_issues,
    special_conditions: parent.special_conditions,
    clearance_required: parent.clearance_required,
    clearance_lab: parent.clearance_lab,
    regulatory_notifications_needed: parent.regulatory_notifications_needed,
    notes: parent.notes,
    status: 'draft' as const,
    scheduled_date: parent.scheduled_date,
    scheduled_time_start: parent.scheduled_time_start,
    scheduled_time_end: parent.scheduled_time_end,
    assigned_to: parent.assigned_to,
    appointment_status: parent.appointment_status,
    building_type: parent.building_type,
    year_built: parent.year_built,
    building_sqft: parent.building_sqft,
    stories: parent.stories,
    construction_type: parent.construction_type,
    occupancy_status: parent.occupancy_status,
    owner_name: parent.owner_name,
    owner_phone: parent.owner_phone,
    owner_email: parent.owner_email,
    access_info: parent.access_info,
    environment_info: parent.environment_info,
    hazard_assessments: parent.hazard_assessments,
    photo_metadata: parent.photo_metadata,
    technician_notes: parent.technician_notes,
    parent_survey_id: parent.id,
    revision_notes: options.revisionNotes ?? null,
  }

  const { data: created, error: createError } = await supabase
    .from('site_surveys')
    .insert(insertPayload)
    .select('*')
    .single()

  if (createError || !created) {
    throw createError || new Error('Failed to create survey revision')
  }

  return created as SiteSurvey
}

/**
 * Returns the version + total count for a survey's chain. Cheap query —
 * survey_root_id is indexed and denormalised onto every row.
 */
export async function getSurveyVersionInfo(
  supabase: SupabaseClient,
  surveyId: string,
): Promise<VersionInfo> {
  const { data: survey, error: surveyError } = await supabase
    .from('site_surveys')
    .select('id, version, survey_root_id')
    .eq('id', surveyId)
    .single()

  if (surveyError || !survey) {
    throw new SecureError('NOT_FOUND', 'Survey not found')
  }

  const { data: chain, error: chainError } = await supabase
    .from('site_surveys')
    .select('version')
    .eq('survey_root_id', survey.survey_root_id)
    .order('version', { ascending: false })
    .limit(1)

  if (chainError) {
    throw chainError
  }

  const total = chain && chain.length > 0 ? chain[0].version : survey.version

  return {
    version: survey.version,
    total,
    root_id: survey.survey_root_id,
  }
}

/**
 * Returns every version in a survey chain, ordered v1 -> latest.
 */
export async function getSurveyChain(
  supabase: SupabaseClient,
  surveyId: string,
): Promise<Array<Pick<SiteSurvey, 'id' | 'version' | 'status' | 'created_at' | 'submitted_at'> & { revision_notes: string | null }>> {
  const { data: survey, error: surveyError } = await supabase
    .from('site_surveys')
    .select('survey_root_id')
    .eq('id', surveyId)
    .single()

  if (surveyError || !survey) {
    throw new SecureError('NOT_FOUND', 'Survey not found')
  }

  const { data, error } = await supabase
    .from('site_surveys')
    .select('id, version, status, created_at, submitted_at, revision_notes')
    .eq('survey_root_id', survey.survey_root_id)
    .order('version', { ascending: true })

  if (error) {
    throw error
  }

  return data as Array<Pick<SiteSurvey, 'id' | 'version' | 'status' | 'created_at' | 'submitted_at'> & { revision_notes: string | null }>
}
