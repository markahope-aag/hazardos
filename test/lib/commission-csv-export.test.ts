import { describe, it, expect } from 'vitest'
import { commissionsToCsv } from '@/lib/utils/commission-csv-export'
import type { CommissionEarning } from '@/types/sales'

/**
 * CO5: approved commissions must be exportable. The CSV builder is the
 * shared source of truth for the export route's columns.
 */

function earning(overrides: Partial<CommissionEarning> = {}): CommissionEarning {
  return {
    id: 'e1',
    organization_id: 'org-1',
    user_id: 'u1',
    plan_id: 'p1',
    opportunity_id: null,
    job_id: null,
    invoice_id: null,
    base_amount: 1000,
    commission_rate: 5,
    commission_amount: 50,
    status: 'approved',
    approved_by: 'admin-1',
    approved_at: '2026-07-10T00:00:00Z',
    rejected_by: null,
    rejected_at: null,
    rejection_reason: null,
    paid_at: null,
    earning_date: '2026-07-01',
    pay_period: '2026-07',
    created_at: '2026-07-01T00:00:00Z',
    user: { id: 'u1', full_name: 'Rep One' },
    plan: undefined,
    ...overrides,
  }
}

describe('commissionsToCsv (CO5)', () => {
  it('emits a header row plus one row per earning', () => {
    const csv = commissionsToCsv([earning(), earning({ id: 'e2', user: { id: 'u2', full_name: 'Rep Two' } })])
    const lines = csv.split('\r\n')

    expect(lines).toHaveLength(3)
    expect(lines[0]).toContain('Earning Date')
    expect(lines[0]).toContain('Commission')
    expect(lines[0]).toContain('Status')
    expect(lines[1]).toContain('Rep One')
    expect(lines[1]).toContain('approved')
    expect(lines[2]).toContain('Rep Two')
  })

  it('escapes values containing commas so columns do not shift', () => {
    const csv = commissionsToCsv([earning({ user: { id: 'u1', full_name: 'Rep, Senior' } })])
    const dataRow = csv.split('\r\n')[1]

    // The comma-bearing name must be quoted, not split across two columns.
    expect(dataRow).toContain('"Rep, Senior"')
  })

  it('returns just the header for an empty set', () => {
    const csv = commissionsToCsv([])
    expect(csv.split('\r\n')).toHaveLength(1)
  })
})
