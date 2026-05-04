import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MobileSurveyPage from '@/app/(dashboard)/site-surveys/mobile/page'

vi.mock('@/components/surveys/mobile/mobile-survey-wizard', () => ({
  __esModule: true,
  default: function StubWizard() {
    return <div>Mobile survey wizard (stub)</div>
  },
}))

vi.mock('@/components/pwa/pwa-install-prompt', () => ({
  PWAInstallPrompt: () => null,
}))

vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({ organization: { id: 'org-123' } }),
}))

describe('MobileSurveyPage', () => {
  it('renders stubbed wizard inside layout', async () => {
    render(<MobileSurveyPage />)
    expect(await screen.findByText('Mobile survey wizard (stub)')).toBeInTheDocument()
  })
})
