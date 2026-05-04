import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MessagesPage from '@/app/(dashboard)/messages/page'

const mockFetch = vi.fn()
global.fetch = mockFetch

describe('MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ conversations: [] }),
    })
  })

  it('renders heading and empty state', async () => {
    render(<MessagesPage />)
    expect(screen.getByRole('heading', { name: 'Messages' })).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.getByText(/No SMS conversations yet/i),
      ).toBeInTheDocument()
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/sms/conversations?')
  })

  it('opens compose dialog from New message', async () => {
    const user = userEvent.setup()
    render(<MessagesPage />)
    await waitFor(() => expect(screen.getByText(/No SMS conversations yet/i)).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /new message/i }))
    expect(screen.getByRole('heading', { name: 'New message' })).toBeInTheDocument()
  })

  it('shows empty list when conversation fetch fails', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) })
    render(<MessagesPage />)
    await waitFor(() => {
      expect(screen.getByText(/No SMS conversations yet/i)).toBeInTheDocument()
    })
  })
})
