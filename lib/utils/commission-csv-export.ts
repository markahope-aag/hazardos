import { escapeCSVValue } from '@/lib/utils/sanitize'
import type { CommissionEarning } from '@/types/sales'

const CSV_COLUMNS: { label: string; field: (e: CommissionEarning) => string }[] = [
  { label: 'Earning Date', field: (e) => e.earning_date || '' },
  { label: 'Sales Rep', field: (e) => e.user?.full_name || '' },
  { label: 'Plan', field: (e) => e.plan?.name || '' },
  { label: 'Base Amount', field: (e) => String(e.base_amount ?? '') },
  { label: 'Rate (%)', field: (e) => String(e.commission_rate ?? '') },
  { label: 'Commission', field: (e) => String(e.commission_amount ?? '') },
  { label: 'Status', field: (e) => e.status || '' },
  { label: 'Pay Period', field: (e) => e.pay_period || '' },
  { label: 'Approved At', field: (e) => e.approved_at || '' },
  { label: 'Paid At', field: (e) => e.paid_at || '' },
]

// Shared with both the API export route (CO5) and any future client-side
// download so the column set never drifts between them.
export function commissionsToCsv(earnings: CommissionEarning[]): string {
  const header = CSV_COLUMNS.map((col) => escapeCSVValue(col.label)).join(',')
  const rows = earnings.map((earning) =>
    CSV_COLUMNS.map((col) => escapeCSVValue(col.field(earning))).join(','),
  )
  return [header, ...rows].join('\r\n')
}
