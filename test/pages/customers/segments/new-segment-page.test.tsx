import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import NewSegmentPage from '@/app/(dashboard)/customers/segments/new/page'

// Mock SegmentBuilder component
vi.mock('@/components/customers/segment-builder', () => ({
  SegmentBuilder: ({ availableFields }: { availableFields: unknown[] }) => (
    <div data-testid="segment-builder">
      Fields: {Array.isArray(availableFields) ? availableFields.length : 0}
    </div>
  ),
}))

// Mock SegmentationService
vi.mock('@/lib/services/segmentation-service', () => ({
  SegmentationService: {
    getAvailableFields: () => [
      { name: 'status', label: 'Status', type: 'select' },
      { name: 'created_at', label: 'Created At', type: 'date' },
    ],
  },
}))

describe('NewSegmentPage', () => {
  it('renders without crashing', () => {
    expect(() => render(<NewSegmentPage />)).not.toThrow()
  })

  it('displays the page title', () => {
    render(<NewSegmentPage />)
    expect(screen.getByText('Create Segment')).toBeInTheDocument()
  })

  it('displays the page description', () => {
    render(<NewSegmentPage />)
    expect(screen.getByText('Define rules to automatically group customers')).toBeInTheDocument()
  })

  it('renders the segment builder component', () => {
    render(<NewSegmentPage />)
    expect(screen.getByTestId('segment-builder')).toBeInTheDocument()
  })

  it('passes available fields to segment builder', () => {
    render(<NewSegmentPage />)
    expect(screen.getByText(/Fields: 2/)).toBeInTheDocument()
  })
})
