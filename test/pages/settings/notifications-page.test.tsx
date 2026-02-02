import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import NotificationSettingsPage from '@/app/(dashboard)/settings/notifications/page'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('NotificationSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return empty preferences after loading
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })
  })

  it('renders without crashing', () => {
    expect(() => render(<NotificationSettingsPage />)).not.toThrow()
  })

  it('displays loading state initially', () => {
    // Set fetch to never resolve
    mockFetch.mockReturnValue(new Promise(() => {}))
    render(<NotificationSettingsPage />)
    // Should show spinner during loading
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('displays page heading after loading', async () => {
    render(<NotificationSettingsPage />)
    expect(await screen.findByText('Notification Settings')).toBeInTheDocument()
  })

  it('displays page description', async () => {
    render(<NotificationSettingsPage />)
    expect(await screen.findByText('Manage how you receive notifications')).toBeInTheDocument()
  })

  it('displays notification channels card', async () => {
    render(<NotificationSettingsPage />)
    expect(await screen.findByText('Notification Channels')).toBeInTheDocument()
  })

  it('displays channel types', async () => {
    render(<NotificationSettingsPage />)
    expect(await screen.findByText('In-App')).toBeInTheDocument()
    expect(await screen.findByText('Email')).toBeInTheDocument()
    expect(await screen.findByText('Push')).toBeInTheDocument()
  })

  it('displays bulk actions card', async () => {
    render(<NotificationSettingsPage />)
    expect(await screen.findByText('Bulk Actions')).toBeInTheDocument()
  })

  it('displays bulk action buttons', async () => {
    render(<NotificationSettingsPage />)
    expect(await screen.findByRole('button', { name: /enable all in-app/i })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /enable all email/i })).toBeInTheDocument()
  })
})

describe('NotificationSettingsPage - With Preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        { notification_type: 'job_assigned', in_app: true, email: true, push: false },
        { notification_type: 'job_completed', in_app: true, email: false, push: false },
      ]),
    })
  })

  it('displays job notification category', async () => {
    render(<NotificationSettingsPage />)
    expect(await screen.findByText('Jobs')).toBeInTheDocument()
  })
})
