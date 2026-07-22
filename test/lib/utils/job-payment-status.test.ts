import { describe, it, expect } from 'vitest'
import { getJobPaymentStatus } from '@/lib/utils/job-payment-status'

/**
 * This module was created as the single source of truth after the CRM jobs
 * list and the job detail page disagreed about payment status (JB11), and then
 * shipped with no test file. Its Overdue branch read `job.invoice_due_date`, a
 * column that exists in neither the schema nor any query, and the
 * `Record<string, unknown>` parameter meant nothing caught it — Overdue could
 * never render on either surface. These tests pin the whole ladder, including
 * that Overdue only fires when a due date is actually supplied.
 */
describe('getJobPaymentStatus', () => {
  it('reports Paid when the job status is paid', () => {
    expect(getJobPaymentStatus({ status: 'paid' }).label).toBe('Paid')
  })

  it('reports Paid when a final payment has been recorded, whatever the status', () => {
    expect(
      getJobPaymentStatus({ status: 'invoiced', final_payment_date: '2026-07-01' }).label
    ).toBe('Paid')
  })

  it('shows no badge for a cancelled job', () => {
    expect(getJobPaymentStatus({ status: 'cancelled' }).label).toBe('—')
  })

  it('reports Invoiced from an invoice date', () => {
    expect(getJobPaymentStatus({ status: 'completed', final_invoice_date: '2026-07-01' }).label)
      .toBe('Invoiced')
  })

  it('reports Invoiced from the status alone', () => {
    expect(getJobPaymentStatus({ status: 'invoiced' }).label).toBe('Invoiced')
  })

  it('reports Overdue when an invoiced job is past its due date', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    expect(getJobPaymentStatus({ status: 'invoiced' }, yesterday).label).toBe('Overdue')
  })

  it('stays Invoiced when the due date has not passed', () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString()
    expect(getJobPaymentStatus({ status: 'invoiced' }, tomorrow).label).toBe('Invoiced')
  })

  it('does not report Overdue without a due date, however old the invoice', () => {
    // The regression: callers do not join invoices, so no due date is passed.
    // It must degrade to Invoiced rather than inventing an Overdue state.
    expect(getJobPaymentStatus({ status: 'invoiced', final_invoice_date: '2020-01-01' }).label)
      .toBe('Invoiced')
  })

  it('never reports Overdue for a job that is not invoiced', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    expect(getJobPaymentStatus({ status: 'scheduled' }, yesterday).label).toBe('Not Yet Billed')
  })

  it('prefers Paid over Overdue', () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    expect(getJobPaymentStatus({ status: 'paid', final_invoice_date: '2026-01-01' }, yesterday).label)
      .toBe('Paid')
  })

  it('reports Deposit Received when a deposit exists and nothing is invoiced', () => {
    expect(getJobPaymentStatus({ status: 'in_progress', deposit_received_date: '2026-06-01' }).label)
      .toBe('Deposit Received')
  })

  it('prefers Invoiced over Deposit Received', () => {
    expect(
      getJobPaymentStatus({
        status: 'invoiced',
        deposit_received_date: '2026-06-01',
      }).label
    ).toBe('Invoiced')
  })

  it('reports Pending Invoice for a completed job with nothing billed', () => {
    expect(getJobPaymentStatus({ status: 'completed' }).label).toBe('Pending Invoice')
  })

  it('reports Not Yet Billed for scheduled and in-progress jobs', () => {
    expect(getJobPaymentStatus({ status: 'scheduled' }).label).toBe('Not Yet Billed')
    expect(getJobPaymentStatus({ status: 'in_progress' }).label).toBe('Not Yet Billed')
  })

  it('falls back to no badge for an unrecognised status', () => {
    expect(getJobPaymentStatus({ status: 'something_new' }).label).toBe('—')
    expect(getJobPaymentStatus({}).label).toBe('—')
  })
})
