import { escapeCSVValue } from '@/lib/utils/sanitize'
import type { Customer } from '@/types/database'

const CSV_COLUMNS: { label: string; field: (c: Customer) => string }[] = [
  { label: 'Name', field: (c) => c.name || '' },
  { label: 'Company', field: (c) => c.company_name || '' },
  { label: 'Email', field: (c) => c.email || '' },
  { label: 'Phone', field: (c) => c.mobile_phone || c.office_phone || c.phone || '' },
  { label: 'Type', field: (c) => c.contact_type || '' },
  { label: 'Status', field: (c) => c.status || '' },
  { label: 'Lifetime Value', field: (c) => String(c.lifetime_value ?? '') },
  { label: 'Total Jobs', field: (c) => String(c.total_jobs ?? '') },
  { label: 'Last Job Date', field: (c) => c.last_job_date || '' },
  { label: 'Source', field: (c) => c.referral_source || c.lead_source || '' },
]

export function customersToCsv(customers: Customer[]): string {
  const header = CSV_COLUMNS.map((col) => escapeCSVValue(col.label)).join(',')
  const rows = customers.map((customer) =>
    CSV_COLUMNS.map((col) => escapeCSVValue(col.field(customer))).join(',')
  )
  return [header, ...rows].join('\r\n')
}

export function downloadCustomersCsv(customers: Customer[], filename = 'contacts.csv'): void {
  const csv = customersToCsv(customers)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
