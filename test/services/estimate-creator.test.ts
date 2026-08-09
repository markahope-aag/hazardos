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
  estimateError?: { code?: string; message: string } | null
  readBackError?: { message: string } | null
  approvalError?: { message: string } | null
  approvalThrows?: boolean
}

function setup(options: Options = {}) {
  const {
    surveyRow = survey,
    calc = calculation,
    estimateError = null,
    readBackError = null,
    approvalError = null,
    approvalThrows = false,
  } = options

  const captured: {
    rpcArgs?: Record<string, unknown>
    approval?: Record<string, unknown>
  } = {}

  mockCalculate.mockResolvedValue(calc)

  const rpc = vi.fn((_fn: string, args: Record<string, unknown>) => {
    captured.rpcArgs = args
    return Promise.resolve({
      data: estimateError ? null : 'est-new',
      error: estimateError,
    })
  })

  const supabase = {
    rpc,
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
          // Two different reads: the collision scan for the estimate number
          // (.eq().like()) and the read-back of the created row (.eq().single()).
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              like: vi.fn().mockResolvedValue({ data: [], error: null }),
              single: vi.fn().mockResolvedValue({
                data: readBackError ? null : { id: 'est-new', status: 'pending_approval' },
                error: readBackError,
              }),
            })),
          })),
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

    expect(captured.rpcArgs!.p_estimate).toMatchObject({
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

  it('hands the calculator line items to the RPC in order', async () => {
    // sort_order is assigned inside the function with WITH ORDINALITY, so the
    // order of this array is what ends up on the proposal.
    const { supabase, captured } = setup()
    await createEstimateFromSurvey(supabase, input)

    const items = captured.rpcArgs!.p_line_items as Array<Record<string, unknown>>
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ description: 'Removal', total_price: 800 })
    expect(items[1]).toMatchObject({ description: 'Sheeting', total_price: 200 })
  })

  it('passes an empty list through when the calculator returned none', async () => {
    const { supabase, captured } = setup({ calc: { ...calculation, line_items: [] } })
    await createEstimateFromSurvey(supabase, input)
    expect(captured.rpcArgs!.p_line_items).toEqual([])
  })
})

describe('createEstimateFromSurvey: status and defaults', () => {
  it('lands in pending_approval, never draft', async () => {
    // At `draft` the estimate is invisible to the approval queue, so the office
    // manager can miss it entirely. The status is now hardcoded inside the RPC
    // rather than sent in the payload, which is stronger: a caller cannot ask
    // for a different one.
    const { supabase, captured } = setup()
    const result = await createEstimateFromSurvey(supabase, input)
    expect(captured.rpcArgs!.p_estimate).not.toHaveProperty('status')
    expect((result.estimate as Record<string, unknown>).status).toBe('pending_approval')
  })

  it('falls back to the survey customer and job name when none are supplied', async () => {
    const { supabase, captured } = setup()
    await createEstimateFromSurvey(supabase, input)
    expect(captured.rpcArgs!.p_estimate).toMatchObject({
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
    expect(captured.rpcArgs!.p_estimate).toMatchObject({
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

  it('a write failure creates nothing, rather than stranding an empty estimate', async () => {
    // This test used to be marked KNOWN GAP and asserted the opposite. The
    // estimate was inserted first and the line items second with no cleanup
    // between them, so a line-item failure left an empty estimate in
    // pending_approval: a total with nothing behind it, sitting in the office
    // manager's queue as real work.
    //
    // Both writes now happen inside create_estimate_from_survey, so a failure
    // anywhere rolls back the whole thing. The mock can only prove the service
    // surfaces the error and does not read back a row it did not create; that
    // the rollback itself works is asserted against a real Postgres in
    // tests/integration/.
    const { supabase } = setup({ estimateError: { message: 'line items denied' } })
    await expect(createEstimateFromSurvey(supabase, input)).rejects.toThrow(/line items denied/)
  })

  it('maps the RPC survey guard to NOT_FOUND', async () => {
    // The survey can be deleted between the read above and the write inside the
    // function; that surfaces as P0002 and must not leak as a raw Postgres error.
    const { supabase } = setup({ estimateError: { code: 'P0002', message: 'Site survey ... not found' } })
    await expect(createEstimateFromSurvey(supabase, input)).rejects.toThrow(/not found/i)
  })

  it('throws when the estimate cannot be read back after creation', async () => {
    const { supabase } = setup({ readBackError: { message: 'read denied' } })
    await expect(createEstimateFromSurvey(supabase, input)).rejects.toThrow(/read denied/)
  })
})
