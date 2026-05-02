import { describe, it, expect, vi } from 'vitest'
import {
  createSurveyRevision,
  getSurveyVersionInfo,
  getSurveyChain,
} from '@/lib/services/survey-versioning'

const PARENT_ID = 'parent-survey-id'
const ORG_ID = 'org-1'

const baseParent = {
  id: PARENT_ID,
  organization_id: ORG_ID,
  estimator_id: null,
  customer_id: 'cust-1',
  property_id: null,
  job_name: '123 Main',
  customer_name: 'Owner',
  customer_email: 'o@x.com',
  customer_phone: null,
  site_address: '123 Main',
  site_city: 'Springfield',
  site_state: 'IL',
  site_zip: '62701',
  hazard_type: 'asbestos',
  hazard_subtype: null,
  containment_level: 1,
  area_sqft: 200,
  linear_ft: null,
  volume_cuft: null,
  material_type: null,
  occupied: false,
  access_issues: null,
  special_conditions: null,
  clearance_required: false,
  clearance_lab: null,
  regulatory_notifications_needed: false,
  notes: null,
  status: 'submitted',
  scheduled_date: '2026-05-01',
  scheduled_time_start: null,
  scheduled_time_end: null,
  assigned_to: null,
  appointment_status: null,
  building_type: 'residential',
  year_built: 1980,
  building_sqft: 1500,
  stories: 1,
  construction_type: null,
  occupancy_status: null,
  owner_name: 'Owner',
  owner_phone: null,
  owner_email: 'o@x.com',
  access_info: { hasRestrictions: false },
  environment_info: { temperature: 70 },
  hazard_assessments: { types: ['asbestos'] },
  photo_metadata: [],
  technician_notes: 'first visit notes',
  parent_survey_id: null,
  survey_root_id: PARENT_ID,
  version: 1,
}

function makeSupabaseForRevision(overrides?: { newId?: string; insertCapture?: { value?: Record<string, unknown> } }) {
  const newId = overrides?.newId ?? 'new-survey-id'
  const fakeRow = {
    ...baseParent,
    id: newId,
    parent_survey_id: PARENT_ID,
    survey_root_id: PARENT_ID,
    version: 2,
    status: 'draft',
  }

  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: baseParent, error: null }),
          })),
        })),
      })),
      insert: vi.fn((payload: Record<string, unknown>) => {
        if (overrides?.insertCapture) overrides.insertCapture.value = payload
        return {
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: fakeRow, error: null }),
          })),
        }
      }),
    })),
  } as unknown as import('@supabase/supabase-js').SupabaseClient
}

describe('createSurveyRevision', () => {
  it('copies parent fields and sets parent_survey_id, draft status, revision_notes', async () => {
    const capture: { value?: Record<string, unknown> } = {}
    const supabase = makeSupabaseForRevision({ insertCapture: capture })

    const result = await createSurveyRevision(supabase, ORG_ID, PARENT_ID, {
      revisionNotes: 'rescoped after second site walk',
    })

    expect(result.id).toBe('new-survey-id')
    expect(capture.value).toBeTruthy()
    expect(capture.value!.parent_survey_id).toBe(PARENT_ID)
    expect(capture.value!.status).toBe('draft')
    expect(capture.value!.revision_notes).toBe('rescoped after second site walk')
    // copied data
    expect(capture.value!.site_address).toBe(baseParent.site_address)
    expect(capture.value!.hazard_assessments).toEqual(baseParent.hazard_assessments)
    expect(capture.value!.technician_notes).toBe(baseParent.technician_notes)
    // not present — trigger handles these
    expect(capture.value).not.toHaveProperty('id')
    expect(capture.value).not.toHaveProperty('survey_root_id')
    expect(capture.value).not.toHaveProperty('version')
  })

  it('throws NOT_FOUND when parent survey does not exist', async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
            })),
          })),
        })),
      })),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    await expect(
      createSurveyRevision(supabase, ORG_ID, 'missing', {}),
    ).rejects.toMatchObject({ type: 'NOT_FOUND' })
  })
})

describe('getSurveyVersionInfo', () => {
  it('returns { version, total, root_id } with total = max version in chain', async () => {
    let call = 0
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => {
          call++
          if (call === 1) {
            return {
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 's2', version: 2, survey_root_id: 'root-1' },
                  error: null,
                }),
              })),
            }
          }
          return {
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({
                  data: [{ version: 3 }],
                  error: null,
                }),
              })),
            })),
          }
        }),
      })),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const info = await getSurveyVersionInfo(supabase, 's2')
    expect(info).toEqual({ version: 2, total: 3, root_id: 'root-1' })
  })

  it('falls back to the survey itself if chain query returns nothing', async () => {
    let call = 0
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => {
          call++
          if (call === 1) {
            return {
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 's1', version: 1, survey_root_id: 's1' },
                  error: null,
                }),
              })),
            }
          }
          return {
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          }
        }),
      })),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const info = await getSurveyVersionInfo(supabase, 's1')
    expect(info.total).toBe(1)
    expect(info.version).toBe(1)
  })
})

describe('getSurveyChain', () => {
  it('returns every version in the chain ordered v1 -> latest', async () => {
    let call = 0
    const supabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => {
          call++
          if (call === 1) {
            return {
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { survey_root_id: 'root-x' },
                  error: null,
                }),
              })),
            }
          }
          return {
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 'a', version: 1, status: 'submitted', created_at: '2026-01-01', submitted_at: null, revision_notes: null },
                  { id: 'b', version: 2, status: 'draft', created_at: '2026-02-01', submitted_at: null, revision_notes: 'rescoped' },
                ],
                error: null,
              }),
            })),
          }
        }),
      })),
    } as unknown as import('@supabase/supabase-js').SupabaseClient

    const chain = await getSurveyChain(supabase, 'b')
    expect(chain).toHaveLength(2)
    expect(chain[0].version).toBe(1)
    expect(chain[1].version).toBe(2)
    expect(chain[1].revision_notes).toBe('rescoped')
  })
})
