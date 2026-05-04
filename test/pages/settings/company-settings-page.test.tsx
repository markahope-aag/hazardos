import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import CompanyProfilePage from '@/app/(dashboard)/settings/company/page'

const toastFn = vi.fn()
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: toastFn }),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('CompanyProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    toastFn.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          organization: {
            name: 'Acme Remediation',
            email: 'hello@acme.test',
            phone: '555-0100',
            website: 'https://acme.test',
            license_number: 'LIC-1',
            address: '1 Main',
            city: 'Austin',
            state: 'TX',
            zip: '78701',
            timezone: 'America/Chicago',
            photo_retention_days: 1095,
          },
        }),
    })
  })

  it('loads company data and shows form sections', async () => {
    render(<CompanyProfilePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Company Profile' })).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/organizations/me')
    expect(screen.getByText('Business')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('Office address')).toBeInTheDocument()
    expect(screen.getByLabelText(/company name/i)).toHaveValue('Acme Remediation')
  })

  it('toasts when organization fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    render(<CompanyProfilePage />)
    await waitFor(() => {
      expect(toastFn).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Failed to load',
          variant: 'destructive',
        }),
      )
    })
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Company Profile' })).toBeInTheDocument()
    })
  })
})
