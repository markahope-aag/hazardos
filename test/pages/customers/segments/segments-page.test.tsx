import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SegmentsPage from '@/app/(dashboard)/customers/segments/page'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('SegmentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    await expect(async () => {
      render(<SegmentsPage />)
    }).not.toThrow()
  })

  it('displays the page title', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<SegmentsPage />)

    await waitFor(() => {
      expect(screen.getByText('Customer Segments')).toBeInTheDocument()
    })
  })

  it('displays the page description', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<SegmentsPage />)

    await waitFor(() => {
      expect(screen.getByText(/organize customers into groups/i)).toBeInTheDocument()
    })
  })

  it('displays create segment button', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([]),
    })

    render(<SegmentsPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /new segment/i })).toBeInTheDocument()
    })
  })
})
