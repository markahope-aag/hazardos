import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import SecuritySettingsPage from '@/app/(dashboard)/settings/security/page'

describe('SecuritySettingsPage', () => {
  it('renders password card and 2FA placeholder', () => {
    render(<SecuritySettingsPage />)
    expect(screen.getByRole('heading', { name: 'Security' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Password' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Two-factor authentication' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Active sessions' })).toBeInTheDocument()
    expect(screen.getAllByText('Coming soon').length).toBeGreaterThanOrEqual(1)
  })
})
