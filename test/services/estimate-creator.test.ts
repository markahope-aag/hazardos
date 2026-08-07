import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCalculate = vi.fn()
const mockWarn = vi.fn()

vi.mock('@/lib/services/estimate-calculator', () => ({
  calculateEstimateFromSurvey: (...args: unknown[]) => mockCalculate(...args),
}))
vi.mock('@/lib/utils/logger', () => ({ logger: { warn: (...a: unknown[]) => mockWarn(...a) } }))

const { createEstimateFromSurvey } = await import('@/lib/services/estimate-creator')

/**
 * Turning a site survey into a priced estimate. Previously untested, and it
 * decides two things that are easy to get wrong and expensive when wrong: the
 * money copied off the calculator, and the status the estimate lands in.
 *
 * The status matters more than it looks. A survey-rooted estimate goes straight
 * to `pending_approval` on purpose. At `draft` it is invisible to the approval
 * queue and the office manager never sees it.
 */

const survey = {
  id: 'survey-1',
  organization_id: 'org-1',
  customer_id: 'cust-survey',
  job_name: 'Boiler room TSI',
  site_address: '400 Industrial Way',
  scheduled_date: '2026-09-01',
}

const calculation = {
  subtotal: 1000,
  markup_percent: 15,
  markup_amount: 150,
  discount_percent: 0,
  discount_amount: 0,
  tax_percent: 6,
  tax_amount: 69,
  total: 1219,
  line_items: [
    { item_type: 'labor', category: 'removal', description: 'Removal', quantity: 2, unit: 'day', unit_price: 400, total_price: 800, source_rate_id: null, source_table: null, is_optional: false, is_included: true, notes: null },
    { item_type: 'material', category: 'poly', description: 'Sheeting', quantity: 5, unit: 'roll', unit_price: 40, total_price: 200, source_rate_id: null, source_table: null, is_optional: false, is_included: true, notes: null },
  ],
}

interface Options {
  surveyRow?: Record<string, unknown> | null
  calc?: typeof calculation
  estimateError?: { message: string } | null
  lineItemsError?: { message: string } | null
  approvalError?: { message: string } | null
  approvalThrows?: boolean
}

function setup(options: Options = {}) {
  const {
    surveyRow = survey,
    calc = calculation,
    estimateError = null,
    lineItemsError = null,
    approvalError = null,
    approvalThrows = false,
  } = options

  const captured: {
    estimate?: Record<string, unknown>
    lineItems?: Array<Record<string, unknown>>
    approval?: Record<string, unknown>
  } = {}

  mockCalculate.mockResolvedValue(calc)

  const supabase = {
    from: vi.fn((table: string) => {
      if (table === 'site_surveys') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: surveyRow,
                  error: surveyRow ? null : { message: 'no rows' },
                }),
              })),
            })),
          })),
        }
      }
      if (table === 'estimates') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ like: vi.fn().mockResolvedValue({ data: [], error: null }) })),
          })),
          insert: vi.fn((payload: Record<string, unknown>) => {
            captured.estimate = payload
            return {
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: estimateError ? null : { id: 'est-new', ...payload },
                  error: estimateError,
                }),
              })),
            }
          }),
        }
      }
      if (table === 'estimate_line_items') {
        return {
          insert: vi.fn((items: Array<Record<string, unknown>>) => {
            captured.lineItems = items
            return Promise.resolve({ error: lineItemsError })
          }),
        }
      }
      return {
        insert: vi.fn((payload: Record<string, unknown>) => {
          if (approvalThrows) throw new Error('approval insert exploded')
          captured.approval = payload
          return Promise.resolve({ error: approvalError })
        }),
      }
    }),
  } as unknown as import('@supabase/supabase-js').SupabaseClient

  return { supabase, captured }
}

const input = { siteSurveyId: 'survey-1', organizationId: 'org-1', userId: 'user-1' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createEstimateFromSurvey: money', () => {
  it('copies every monetary figure from the calculator without recomputing', async () => {
    const { supabase, captured } = setup()
    await createEstimateFromSurvey(supabase, input)

    expect(captured.estimate).toMatchObject({
      subtotal: 1000,
      markup_percent: 15,
      markup_amount: 150,
      discount_percent: 0,
      discount_amount: 0,
      tax_percent: 6,
      tax_amount: 69,
      total: 1219,
    })
  })

  it('passes a markup override through to the calculator', async () => {
    const { supabase } = setup()
    await createEstimateFromSurvey(supabase, { ...input, markupPercent: 32 })
    expect(mockCalculate).toHaveBeenCalledWith(
      expect.anything(),
      'org-1',
      expect.anything(),
      { customMarkup: 32 },
    )
  })

  it('sends no override when markupPercent is absent, so the org default applies', async () => {
    const { supabase } = setup()
    await createEstimateFromSurvey(supabase, input)
    expect(mockCalculate.mock.calls[0][3]).toEqual({ customMarkup: undefined })
  })

  it('copies line items in calculator order and stamps sort_order', async () => {
    const { supabase, captured } = setup()
    await createEstimateFromSurvey(supabase, input)

    expect(captured.lineItems).toHaveLength(2)
    expect(captured.lineItems![0]).toMatchObject({
      estimate_id: 'est-new',
      description: 'Removal',
      total_price: 800,
      sort_order: 0,
    })
    expect(captured.lineItems![1]).toMatchObject({ description: 'Sheeting', sort_order: 1 })
  })

  it('skips the line-item insert when the calculator returned none', async () => {
    const { supabase, captured } = setup({ calc: { ...calculation, line_items: [] } })
    await createEstimateFromSurvey(supabase, input)
    expect(captured.lineItems).toBeUndefined()
  })
})

describe('createEstimateFromSurvey: status and defaults', () => {
  it('lands in pending_approval, never draft', async () => {
    // At `draft` the estimate is invisible to the approval queue, so the office
    // manager can miss it entirely. This is the whole reason the status is
    // hardcoded rather than passed in.
    const { supabase, captured } = setup()
    await createEstimateFromSurvey(supabase, input)
    expect(captured.estimate!.status).toBe('pending_approval')
  })

  it('falls back to the survey customer and job name when none are supplied', async () => {
    const { supabase, captured } = setup()
    await createEstimateFromSurvey(supabase, input)
    expect(captured.estimate).toMatchObject({
      customer_id: 'cust-survey',
      project_name: 'Boiler room TSI',
    })
  })

  it('prefers explicit overrides over the survey values', async () => {
    const { supabase, captured } = setup()
    await createEstimateFromSurvey(supabase, {
      ...input,
      customerId: 'cust-override',
      projectName: 'Override name',
    })
    expect(captured.estimate).toMatchObject({
      customer_id: 'cust-override',
      project_name: 'Override name',
    })
  })

  it('raises an approval request for the estimate total', async () => {
    const { supabase, captured } = setup()
    await createEstimateFromSurvey(supabase, input)
    expect(captured.approval).toMatchObject({
      entity_type: 'estimate',
      entity_id: 'est-new',
      amount: 1219,
      final_status: 'pending',
    })
  })

  it('returns both the estimate and the survey it was built from', async () => {
    const { supabase } = setup()
    const result = await createEstimateFromSurvey(supabase, input)
    expect(result.estimate).toMatchObject({ id: 'est-new' })
    expect(result.survey).toMatchObject({ id: 'survey-1' })
  })
})

describe('createEstimateFromSurvey: failure handling', () => {
  it('throws NOT_FOUND when the survey is missing or belongs to another org', async () => {
    const { supabase } = setup({ surveyRow: null })
    await expect(createEstimateFromSurvey(supabase, input)).rejects.toThrow(/not found/i)
    expect(mockCalculate).not.toHaveBeenCalled()
  })

  it('throws when the estimate insert fails', async () => {
    const { supabase } = setup({ estimateError: { message: 'insert denied' } })
    await expect(createEstimateFromSurvey(supabase, input)).rejects.toThrow(/insert denied/)
  })

  it('a failed approval_requests insert is logged, not fatal', async () => {
    // The estimate is already in pending_approval, so losing the queue entry
    // costs a notification, not the work.
    const { supabase } = setup({ approvalError: { message: 'approval denied' } })
    const result = await createEstimateFromSurvey(supabase, input)
    expect(result.estimate).toMatchObject({ id: 'est-new' })
    expect(mockWarn).toHaveBeenCalledTimes(1)
  })

  it('a thrown approval_requests insert is also caught', async () => {
    const { supabase } = setup({ approvalThrows: true })
    const result = await createEstimateFromSurvey(supabase, input)
    expect(result.estimate).toMatchObject({ id: 'est-new' })
    expect(mockWarn).toHaveBeenCalledTimes(1)
  })

  it('KNOWN GAP: a line-item failure strands the estimate row', async () => {
    // Documents a real defect rather than asserting it is correct. The estimate
    // is inserted first and there is no compensating delete, so a line-item
    // failure leaves an empty estimate sitting in pending_approval, the same
    // class of problem create_estimate_revision was just fixed for, and worse,
    // because that path at least attempted a cleanup.
    //
    // When this is made transactional, this test should start failing. That is
    // the point: change it to assert no estimate survives.
    const { supabase, captured } = setup({ lineItemsError: { message: 'line items denied' } })
    await expect(createEstimateFromSurvey(supabase, input)).rejects.toThrow(/line items denied/)
    expect(captured.estimate).toBeDefined()
  })
})
