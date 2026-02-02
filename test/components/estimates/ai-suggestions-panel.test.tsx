import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AISuggestionsPanel, AISuggestionsPanelErrorBoundary } from '@/components/estimates/ai-suggestions-panel'
import type { EstimateSuggestion, SuggestedLineItem } from '@/types/integrations'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock error boundary
vi.mock('@/components/error-boundaries', () => ({
  IntegrationErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockSuggestedItems: SuggestedLineItem[] = [
  {
    description: 'Asbestos abatement - floor tiles',
    quantity: 500,
    unit_price: 12.5,
    category: 'labor',
    hazard_type: 'asbestos',
    reasoning: 'Standard rate for floor tile removal',
  },
  {
    description: 'HEPA air filtration equipment',
    quantity: 2,
    unit_price: 250,
    category: 'equipment',
    hazard_type: 'asbestos',
    reasoning: 'Required for asbestos containment',
  },
  {
    description: 'Disposal bags (6 mil)',
    quantity: 50,
    unit_price: 8.5,
    category: 'materials',
    hazard_type: 'asbestos',
  },
  {
    description: 'Lead paint testing kit',
    quantity: 10,
    unit_price: 45,
    category: 'testing',
    hazard_type: 'lead',
  },
]

const mockSuggestionResponse: EstimateSuggestion = {
  id: 'sugg_123',
  organization_id: 'org_123',
  hazard_types: ['asbestos', 'lead'],
  property_type: 'commercial',
  square_footage: 5000,
  suggested_items: mockSuggestedItems,
  total_amount: 7175,
  model_version: '1.0',
  confidence_score: 0.85,
  reasoning: 'Based on the commercial property size and identified hazards, standard abatement procedures are recommended.',
  created_at: '2024-01-15T00:00:00Z',
}

const defaultProps = {
  hazardTypes: ['asbestos', 'lead'],
  propertyType: 'commercial',
  squareFootage: 5000,
  siteSurveyNotes: 'Possible asbestos in floor tiles. Lead paint visible on window frames.',
  onAcceptItems: vi.fn(),
  onClose: vi.fn(),
}

describe('AISuggestionsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state (not generated)', () => {
    it('should render initial state with hazard information', () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      expect(screen.getByText('AI Estimate Suggestions')).toBeInTheDocument()
      expect(screen.getByText('Generate line items based on hazard types and site details')).toBeInTheDocument()
      expect(screen.getByText('asbestos, lead')).toBeInTheDocument()
      expect(screen.getByText('commercial')).toBeInTheDocument()
      expect(screen.getByText('5,000 sq ft')).toBeInTheDocument()
    })

    it('should show generate suggestions button', () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      expect(screen.getByRole('button', { name: /generate suggestions/i })).toBeInTheDocument()
    })

    it('should show cancel button when onClose is provided', () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should not show cancel button when onClose is not provided', () => {
      const propsWithoutClose = { ...defaultProps, onClose: undefined }
      render(<AISuggestionsPanel {...propsWithoutClose} />)

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })

    it('should disable generate button when no hazard types', () => {
      const propsNoHazards = { ...defaultProps, hazardTypes: [] }
      render(<AISuggestionsPanel {...propsNoHazards} />)

      const generateButton = screen.getByRole('button', { name: /generate suggestions/i })
      expect(generateButton).toBeDisabled()
    })

    it('should show "None specified" when no hazard types', () => {
      const propsNoHazards = { ...defaultProps, hazardTypes: [] }
      render(<AISuggestionsPanel {...propsNoHazards} />)

      expect(screen.getByText('None specified')).toBeInTheDocument()
    })

    it('should call onClose when cancel button clicked', () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('should show loading state when generating suggestions', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('Analyzing site details and generating estimates...')).toBeInTheDocument()
      })
    })

    it('should show spinner during loading', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin')
        expect(spinner).toBeInTheDocument()
      })
    })
  })

  describe('error handling', () => {
    it('should show error message on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'AI service unavailable' }),
      })

      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('AI service unavailable')).toBeInTheDocument()
      })
    })

    it('should show generic error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument()
      })
    })

    it('should show default error message when no error detail', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      })

      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('Failed to generate suggestions')).toBeInTheDocument()
      })
    })

    it('should allow retry after error', async () => {
      // First call fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Temporary error' }),
      })

      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('Temporary error')).toBeInTheDocument()
      })

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestionResponse,
      })

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('4 items suggested')).toBeInTheDocument()
      })
    })
  })

  describe('with suggestions', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestionResponse,
      })
    })

    it('should display suggestions after generation', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('AI Suggestions')).toBeInTheDocument()
        expect(screen.getByText('4 items suggested')).toBeInTheDocument()
      })
    })

    it('should display confidence score', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('(85% confidence)')).toBeInTheDocument()
      })
    })

    it('should display reasoning', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText(/Based on the commercial property size/)).toBeInTheDocument()
      })
    })

    it('should render all suggested items', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('Asbestos abatement - floor tiles')).toBeInTheDocument()
        expect(screen.getByText('HEPA air filtration equipment')).toBeInTheDocument()
        expect(screen.getByText('Disposal bags (6 mil)')).toBeInTheDocument()
        expect(screen.getByText('Lead paint testing kit')).toBeInTheDocument()
      })
    })

    it('should select all items by default', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('4 of 4 selected')).toBeInTheDocument()
      })

      const checkboxes = screen.getAllByRole('checkbox')
      checkboxes.forEach(checkbox => {
        expect(checkbox).toBeChecked()
      })
    })

    it('should display category badges', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('labor')).toBeInTheDocument()
        expect(screen.getByText('equipment')).toBeInTheDocument()
        expect(screen.getByText('materials')).toBeInTheDocument()
        expect(screen.getByText('testing')).toBeInTheDocument()
      })
    })

    it('should display hazard type badges', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        const asbestosBadges = screen.getAllByText('asbestos')
        expect(asbestosBadges.length).toBeGreaterThan(0)
        expect(screen.getByText('lead')).toBeInTheDocument()
      })
    })

    it('should display item pricing', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        // Check quantity x price display
        expect(screen.getByText(/500 ×/)).toBeInTheDocument()
        expect(screen.getByText(/2 ×/)).toBeInTheDocument()
      })
    })

    it('should display item reasoning when available', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('Standard rate for floor tile removal')).toBeInTheDocument()
        expect(screen.getByText('Required for asbestos containment')).toBeInTheDocument()
      })
    })
  })

  describe('item selection', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestionResponse,
      })
    })

    it('should toggle item selection on checkbox click', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('4 of 4 selected')).toBeInTheDocument()
      })

      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      expect(screen.getByText('3 of 4 selected')).toBeInTheDocument()
    })

    it('should update total when items are deselected', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        // Total for all items: 500*12.5 + 2*250 + 50*8.5 + 10*45 = 6250 + 500 + 425 + 450 = $7,625.00
        expect(screen.getByText(/Selected Total:.*\$7,625\.00/)).toBeInTheDocument()
      })

      // Deselect first item (500 * 12.5 = $6,250)
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])

      await waitFor(() => {
        // New total: $7,625 - $6,250 = $1,375
        expect(screen.getByText(/Selected Total:.*\$1,375\.00/)).toBeInTheDocument()
      })
    })

    it('should select all items when clicking Select All', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('4 of 4 selected')).toBeInTheDocument()
      })

      // Deselect some items first
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])
      fireEvent.click(checkboxes[1])

      expect(screen.getByText('2 of 4 selected')).toBeInTheDocument()

      // Click Select All
      fireEvent.click(screen.getByRole('button', { name: /select all/i }))

      expect(screen.getByText('4 of 4 selected')).toBeInTheDocument()
    })

    it('should deselect all items when clicking Select None', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('4 of 4 selected')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /select none/i }))

      expect(screen.getByText('0 of 4 selected')).toBeInTheDocument()
    })

    it('should show zero total when no items selected', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('4 of 4 selected')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /select none/i }))

      expect(screen.getByText(/Selected Total:.*\$0\.00/)).toBeInTheDocument()
    })
  })

  describe('accepting items', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestionResponse,
      })
    })

    it('should call onAcceptItems with selected items', async () => {
      const onAcceptItems = vi.fn()
      render(<AISuggestionsPanel {...defaultProps} onAcceptItems={onAcceptItems} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('4 of 4 selected')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /add selected items/i }))

      expect(onAcceptItems).toHaveBeenCalledWith(mockSuggestedItems)
    })

    it('should only include selected items when accepting', async () => {
      const onAcceptItems = vi.fn()
      render(<AISuggestionsPanel {...defaultProps} onAcceptItems={onAcceptItems} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('4 of 4 selected')).toBeInTheDocument()
      })

      // Deselect first two items
      const checkboxes = screen.getAllByRole('checkbox')
      fireEvent.click(checkboxes[0])
      fireEvent.click(checkboxes[1])

      fireEvent.click(screen.getByRole('button', { name: /add selected items/i }))

      expect(onAcceptItems).toHaveBeenCalledWith([
        mockSuggestedItems[2], // Disposal bags
        mockSuggestedItems[3], // Lead paint testing kit
      ])
    })

    it('should disable add button when no items selected', async () => {
      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('4 of 4 selected')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: /select none/i }))

      const addButton = screen.getByRole('button', { name: /add selected items/i })
      expect(addButton).toBeDisabled()
    })
  })

  describe('regeneration', () => {
    it('should allow regenerating suggestions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestionResponse,
      })

      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(screen.getByText('4 items suggested')).toBeInTheDocument()
      })

      // Mock the second call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockSuggestionResponse,
          suggested_items: mockSuggestedItems.slice(0, 2),
        }),
      })

      fireEvent.click(screen.getByRole('button', { name: /regenerate/i }))

      await waitFor(() => {
        expect(screen.getByText('2 items suggested')).toBeInTheDocument()
      })
    })
  })

  describe('confidence score styling', () => {
    it('should show green color for high confidence (>= 0.8)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockSuggestionResponse, confidence_score: 0.85 }),
      })

      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        const confidenceText = screen.getByText('(85% confidence)')
        expect(confidenceText).toHaveClass('text-green-600')
      })
    })

    it('should show yellow color for medium confidence (0.6-0.8)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockSuggestionResponse, confidence_score: 0.65 }),
      })

      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        const confidenceText = screen.getByText('(65% confidence)')
        expect(confidenceText).toHaveClass('text-yellow-600')
      })
    })

    it('should show red color for low confidence (< 0.6)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockSuggestionResponse, confidence_score: 0.45 }),
      })

      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        const confidenceText = screen.getByText('(45% confidence)')
        expect(confidenceText).toHaveClass('text-red-600')
      })
    })
  })

  describe('API request', () => {
    it('should send correct request payload', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestionResponse,
      })

      render(<AISuggestionsPanel {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /generate suggestions/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/ai/estimate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hazard_types: ['asbestos', 'lead'],
            property_type: 'commercial',
            square_footage: 5000,
            site_survey_notes: 'Possible asbestos in floor tiles. Lead paint visible on window frames.',
          }),
        })
      })
    })
  })

  describe('error boundary wrapper', () => {
    it('should render children within error boundary', () => {
      render(
        <AISuggestionsPanelErrorBoundary>
          <AISuggestionsPanel {...defaultProps} />
        </AISuggestionsPanelErrorBoundary>
      )

      expect(screen.getByText('AI Estimate Suggestions')).toBeInTheDocument()
    })
  })
})
