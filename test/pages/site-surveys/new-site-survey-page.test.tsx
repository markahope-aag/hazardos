import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NewSiteSurveyPage from '@/app/(dashboard)/site-surveys/new/page'

// The page now renders the mobile survey wizard once a customer is picked.
// Stub it out so this test stays focused on the page-level behaviour
// (picker visible before selection, heading, back link).
vi.mock('@/components/surveys/mobile/mobile-survey-wizard', () => ({
  default: () => <div data-testid="survey-wizard">Survey Wizard</div>,
}))

vi.mock('@/components/customers/customer-combobox', () => ({
  CustomerCombobox: () => <div data-testid="customer-combobox">Customer Combobox</div>,
}))

vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    organization: { id: 'org-1' },
    user: { id: 'user-1' },
    profile: { id: 'user-1', organization_id: 'org-1' },
  }),
}))

describe('NewSiteSurveyPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<NewSiteSurveyPage />)).not.toThrow()
  })

  it('displays page heading', () => {
    render(<NewSiteSurveyPage />)
    expect(screen.getByText('New Site Survey')).toBeInTheDocument()
  })

  it('displays the contact picker before a customer is chosen', () => {
    render(<NewSiteSurveyPage />)
    expect(screen.getByText('Select Contact')).toBeInTheDocument()
    expect(screen.getByTestId('customer-combobox')).toBeInTheDocument()
  })

  it('has back link to site-surveys when no customer in URL', () => {
    render(<NewSiteSurveyPage />)
    const backLink = screen.getByRole('link', { name: /back/i })
    expect(backLink).toHaveAttribute('href', '/site-surveys')
  })
})
