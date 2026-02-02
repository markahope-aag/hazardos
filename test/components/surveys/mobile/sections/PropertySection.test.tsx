import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PropertySection } from '@/components/surveys/mobile/sections/PropertySection'

// Mock survey store
const mockUseSurveyStore = {
  formData: {
    property: {
      address: '',
      city: '',
      state: '',
      zip_code: '',
      building_type: 'residential',
      construction_type: 'wood_frame',
      year_built: null,
      square_footage: null,
      floors: 1,
      occupancy_status: 'occupied',
    },
  },
  updateProperty: vi.fn(),
}

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => mockUseSurveyStore,
}))

// Mock survey types
vi.mock('@/lib/stores/survey-types', () => ({
  BuildingType: {
    RESIDENTIAL: 'residential',
    COMMERCIAL: 'commercial',
    INDUSTRIAL: 'industrial',
    INSTITUTIONAL: 'institutional',
  },
  ConstructionType: {
    WOOD_FRAME: 'wood_frame',
    STEEL_FRAME: 'steel_frame',
    CONCRETE: 'concrete',
    MASONRY: 'masonry',
    MIXED: 'mixed',
  },
  OccupancyStatus: {
    OCCUPIED: 'occupied',
    VACANT: 'vacant',
    PARTIALLY_OCCUPIED: 'partially_occupied',
  },
}))

// Mock input components
vi.mock('../inputs', () => ({
  NumericStepper: ({ value, onChange, label }: any) => (
    <div>
      <label>{label}</label>
      <input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(parseInt(e.target.value) || null)}
        data-testid={`numeric-${label?.toLowerCase().replace(/\s+/g, '-')}`}
      />
    </div>
  ),
  SegmentedControl: ({ value, onChange, options }: any) => (
    <div>
      {options.map((option: any) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          data-testid={`segment-${option.value}`}
          className={value === option.value ? 'selected' : ''}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
  RadioCardGroup: ({ value, onChange, options }: any) => (
    <div>
      {options.map((option: any) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          data-testid={`radio-${option.value}`}
          className={value === option.value ? 'selected' : ''}
        >
          {option.label}
        </button>
      ))}
    </div>
  ),
}))

describe('PropertySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render property form fields', () => {
    render(<PropertySection />)
    
    expect(screen.getByLabelText(/street address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/zip code/i)).toBeInTheDocument()
  })

  it('should render building type selection', () => {
    render(<PropertySection />)
    
    expect(screen.getByTestId('radio-residential')).toBeInTheDocument()
    expect(screen.getByTestId('radio-commercial')).toBeInTheDocument()
    expect(screen.getByTestId('radio-industrial')).toBeInTheDocument()
    expect(screen.getByTestId('radio-institutional')).toBeInTheDocument()
  })

  it('should render construction type selection', () => {
    render(<PropertySection />)
    
    expect(screen.getByTestId('segment-wood_frame')).toBeInTheDocument()
    expect(screen.getByTestId('segment-steel_frame')).toBeInTheDocument()
    expect(screen.getByTestId('segment-concrete')).toBeInTheDocument()
    expect(screen.getByTestId('segment-masonry')).toBeInTheDocument()
    expect(screen.getByTestId('segment-mixed')).toBeInTheDocument()
  })

  it('should render numeric input fields', () => {
    render(<PropertySection />)
    
    expect(screen.getByTestId('numeric-year-built')).toBeInTheDocument()
    expect(screen.getByTestId('numeric-square-footage')).toBeInTheDocument()
    expect(screen.getByTestId('numeric-floors')).toBeInTheDocument()
  })

  it('should update address when input changes', () => {
    render(<PropertySection />)
    
    const addressInput = screen.getByLabelText(/street address/i)
    fireEvent.change(addressInput, { target: { value: '123 Main St' } })
    
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      address: '123 Main St',
    })
  })

  it('should update city when input changes', () => {
    render(<PropertySection />)
    
    const cityInput = screen.getByLabelText(/city/i)
    fireEvent.change(cityInput, { target: { value: 'New York' } })
    
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      city: 'New York',
    })
  })

  it('should update state when selected', () => {
    render(<PropertySection />)
    
    const stateSelect = screen.getByRole('combobox')
    fireEvent.click(stateSelect)
    
    // Select California
    const caOption = screen.getByText('CA')
    fireEvent.click(caOption)
    
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      state: 'CA',
    })
  })

  it('should update zip code when input changes', () => {
    render(<PropertySection />)
    
    const zipInput = screen.getByLabelText(/zip code/i)
    fireEvent.change(zipInput, { target: { value: '10001' } })
    
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      zip_code: '10001',
    })
  })

  it('should update building type when selected', () => {
    render(<PropertySection />)
    
    const commercialButton = screen.getByTestId('radio-commercial')
    fireEvent.click(commercialButton)
    
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      building_type: 'commercial',
    })
  })

  it('should update construction type when selected', () => {
    render(<PropertySection />)
    
    const steelFrameButton = screen.getByTestId('segment-steel_frame')
    fireEvent.click(steelFrameButton)
    
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      construction_type: 'steel_frame',
    })
  })

  it('should update year built when numeric input changes', () => {
    render(<PropertySection />)
    
    const yearInput = screen.getByTestId('numeric-year-built')
    fireEvent.change(yearInput, { target: { value: '1985' } })
    
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      year_built: 1985,
    })
  })

  it('should update square footage when numeric input changes', () => {
    render(<PropertySection />)
    
    const sqftInput = screen.getByTestId('numeric-square-footage')
    fireEvent.change(sqftInput, { target: { value: '2500' } })
    
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      square_footage: 2500,
    })
  })

  it('should update floors when numeric input changes', () => {
    render(<PropertySection />)
    
    const floorsInput = screen.getByTestId('numeric-floors')
    fireEvent.change(floorsInput, { target: { value: '3' } })
    
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      floors: 3,
    })
  })

  it('should show current values from store', () => {
    mockUseSurveyStore.formData.property = {
      address: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zip_code: '90210',
      building_type: 'commercial',
      construction_type: 'steel_frame',
      year_built: 1990,
      square_footage: 5000,
      floors: 2,
      occupancy_status: 'occupied',
    }

    render(<PropertySection />)
    
    expect(screen.getByDisplayValue('456 Oak Ave')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Los Angeles')).toBeInTheDocument()
    expect(screen.getByDisplayValue('90210')).toBeInTheDocument()
    expect(screen.getByTestId('radio-commercial')).toHaveClass('selected')
    expect(screen.getByTestId('segment-steel_frame')).toHaveClass('selected')
  })

  it('should render all US states in dropdown', () => {
    render(<PropertySection />)
    
    const stateSelect = screen.getByRole('combobox')
    fireEvent.click(stateSelect)
    
    // Check for a few key states
    expect(screen.getByText('CA')).toBeInTheDocument()
    expect(screen.getByText('NY')).toBeInTheDocument()
    expect(screen.getByText('TX')).toBeInTheDocument()
    expect(screen.getByText('FL')).toBeInTheDocument()
    expect(screen.getByText('DC')).toBeInTheDocument()
  })

  it('should show building type descriptions', () => {
    render(<PropertySection />)
    
    // Building type options should show descriptions
    expect(screen.getByText(/single family homes/i)).toBeInTheDocument()
    expect(screen.getByText(/office buildings/i)).toBeInTheDocument()
    expect(screen.getByText(/manufacturing/i)).toBeInTheDocument()
    expect(screen.getByText(/schools/i)).toBeInTheDocument()
  })

  it('should show construction type descriptions', () => {
    render(<PropertySection />)
    
    // Construction type options should show descriptions
    expect(screen.getByText(/traditional wood/i)).toBeInTheDocument()
    expect(screen.getByText(/steel structural/i)).toBeInTheDocument()
    expect(screen.getByText(/concrete block/i)).toBeInTheDocument()
    expect(screen.getByText(/brick or stone/i)).toBeInTheDocument()
    expect(screen.getByText(/combination/i)).toBeInTheDocument()
  })

  it('should handle empty numeric values', () => {
    render(<PropertySection />)
    
    const yearInput = screen.getByTestId('numeric-year-built')
    fireEvent.change(yearInput, { target: { value: '' } })
    
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      year_built: null,
    })
  })

  it('should validate year built range', () => {
    render(<PropertySection />)
    
    const yearInput = screen.getByTestId('numeric-year-built')
    
    // Test minimum year
    fireEvent.change(yearInput, { target: { value: '1800' } })
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      year_built: 1800,
    })
    
    // Test maximum year (current year)
    const currentYear = new Date().getFullYear()
    fireEvent.change(yearInput, { target: { value: currentYear.toString() } })
    expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
      year_built: currentYear,
    })
  })

  it('should have proper form structure', () => {
    render(<PropertySection />)
    
    // Should have proper form sections
    expect(screen.getByText(/property address/i)).toBeInTheDocument()
    expect(screen.getByText(/building information/i)).toBeInTheDocument()
    expect(screen.getByText(/construction details/i)).toBeInTheDocument()
  })

  it('should show occupancy status selection', () => {
    render(<PropertySection />)
    
    expect(screen.getByText(/occupied/i)).toBeInTheDocument()
    expect(screen.getByText(/vacant/i)).toBeInTheDocument()
    expect(screen.getByText(/partially occupied/i)).toBeInTheDocument()
  })

  it('should handle address autocomplete trigger', async () => {
    render(<PropertySection />)
    
    const addressInput = screen.getByLabelText(/street address/i)
    fireEvent.change(addressInput, { target: { value: '123 Main' } })
    
    // Should trigger address lookup after typing
    await waitFor(() => {
      expect(mockUseSurveyStore.updateProperty).toHaveBeenCalledWith({
        address: '123 Main',
      })
    })
  })

  it('should show loading state for address lookup', () => {
    render(<PropertySection />)
    
    const addressInput = screen.getByLabelText(/street address/i)
    fireEvent.change(addressInput, { target: { value: '123 Main St' } })
    
    // Should show loading indicator
    expect(screen.getByRole('generic', { name: '' })).toHaveClass('animate-spin')
  })

  it('should handle address lookup error', async () => {
    render(<PropertySection />)
    
    const addressInput = screen.getByLabelText(/street address/i)
    fireEvent.change(addressInput, { target: { value: 'Invalid Address' } })
    
    await waitFor(() => {
      expect(screen.getByText(/address not found/i)).toBeInTheDocument()
    })
  })

  it('should clear address error when input changes', async () => {
    render(<PropertySection />)
    
    const addressInput = screen.getByLabelText(/street address/i)
    
    // Trigger error
    fireEvent.change(addressInput, { target: { value: 'Invalid Address' } })
    await waitFor(() => {
      expect(screen.getByText(/address not found/i)).toBeInTheDocument()
    })
    
    // Clear error by changing input
    fireEvent.change(addressInput, { target: { value: '123 Valid St' } })
    await waitFor(() => {
      expect(screen.queryByText(/address not found/i)).not.toBeInTheDocument()
    })
  })

  it('should have proper accessibility attributes', () => {
    render(<PropertySection />)
    
    // Form fields should have proper labels
    const addressInput = screen.getByLabelText(/street address/i)
    expect(addressInput).toHaveAttribute('type', 'text')
    expect(addressInput).toHaveAttribute('required')
    
    const cityInput = screen.getByLabelText(/city/i)
    expect(cityInput).toHaveAttribute('type', 'text')
    
    const zipInput = screen.getByLabelText(/zip code/i)
    expect(zipInput).toHaveAttribute('type', 'text')
    expect(zipInput).toHaveAttribute('pattern', '[0-9]{5}(-[0-9]{4})?')
  })
})