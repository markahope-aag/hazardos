import { describe, it, expect } from 'vitest'
import { redirect } from 'next/navigation'
import JobsPage from '@/app/(dashboard)/jobs/page'

// /jobs used to render a second, separately-maintained jobs list alongside
// /crm/jobs — different filters, pagination and status config, so ordinary
// navigation could show two Jobs lists that disagreed. It is now a redirect to
// the canonical CRM list, matching /customers -> /crm/contacts. The list
// rendering itself is covered by the CRM jobs page tests.

describe('JobsPage (legacy dashboard index)', () => {
  it('redirects to the canonical CRM jobs list', () => {
    expect(() => JobsPage()).toThrowError(/NEXT_REDIRECT/)
    expect(redirect).toHaveBeenCalledWith('/crm/jobs')
  })
})
