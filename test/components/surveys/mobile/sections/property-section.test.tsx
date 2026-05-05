import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { PropertySection } from '@/components/surveys/mobile/sections/property-section'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'

// Mock survey store
const mockUpdateProperty = vi.fn()

const mockUseSurveyStore = {
  formData: {
    property: {
      address: '',
      city: '',
      state: '',
      zip: '',
      buildingType: 'residential_single',
      constructionType: 'wood_frame',
      yearBuilt: null as number | null,
      squareFootage: null as number | null,
      stories: 1,
      occupancyStatus: 'occupied',
      occupiedHoursStart: '',
      occupiedHoursEnd: '',
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
    },
  },
  updateProperty: mockUpdateProperty,
}

vi.mock('@/lib/stores/survey-store', () => ({
  useSurveyStore: () => mockUseSurveyStore,
}))

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn((success, error) => {
    success({
      coords: {
        latitude: 40.7128,
        longitude: -74.0060,
      },
    })
  }),
}

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
})

// Mock fetch for geocoding
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        address: {
          house_number: '123',
          road: 'Main Street',
          city: 'New York',
          state: 'NY',
          postcode: '10001',
        },
      }),
  })
) as any

describe('PropertySection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers() // Ensure real timers are used by default
    mockUseSurveyStore.formData.property = {
      address: '',
      city: '',
      state: '',
      zip: '',
      buildingType: 'residential_single',
      constructionType: 'wood_frame',
      yearBuilt: null,
      squareFootage: null,
      stories: 1,
      occupancyStatus: 'occupied',
      occupiedHoursStart: '',
      occupiedHoursEnd: '',
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
    }
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

    expect(screen.getByText('Single-Family')).toBeInTheDocument()
    expect(screen.getByText('Multi-Family')).toBeInTheDocument()
    expect(screen.getByText('Commercial')).toBeInTheDocument()
    expect(screen.getByText('Industrial')).toBeInTheDocument()
  })

  it('should render construction type dropdown', () => {
    render(<PropertySection />)

    expect(screen.getByText('Construction Type')).toBeInTheDocument()
  })

  it('should render year built and square footage fields', () => {
    render(<PropertySection />)

    expect(screen.getByText('Year Built')).toBeInTheDocument()
    expect(screen.getByText('Square Footage')).toBeInTheDocument()
  })

  it('should update address when input changes', async () => {
    const user = userEvent.setup()
    render(<PropertySection />)

    const addressInput = screen.getByLabelText(/street address/i)
    await user.type(addressInput, '1')

    // Check that updateProperty was called with address field
    expect(mockUpdateProperty).toHaveBeenCalledWith(
      expect.objectContaining({ address: expect.any(String) })
    )
  })

  it('should update city when input changes', async () => {
    const user = userEvent.setup()
    render(<PropertySection />)

    const cityInput = screen.getByLabelText(/city/i)
    await user.type(cityInput, 'N')

    expect(mockUpdateProperty).toHaveBeenCalledWith(
      expect.objectContaining({ city: expect.any(String) })
    )
  })

  it('should update zip code when input changes', async () => {
    const user = userEvent.setup()
    render(<PropertySection />)

    const zipInput = screen.getByLabelText(/zip code/i)
    await user.type(zipInput, '1')

    expect(mockUpdateProperty).toHaveBeenCalledWith(
      expect.objectContaining({ zip: expect.any(String) })
    )
  })

  it('should show current values from store', () => {
    mockUseSurveyStore.formData.property = {
      address: '456 Oak Ave',
      city: 'Los Angeles',
      state: 'CA',
      zip: '90210',
      buildingType: 'commercial',
      constructionType: 'steel',
      yearBuilt: 1990 as number | null,
      squareFootage: 5000 as number | null,
      stories: 2,
      occupancyStatus: 'occupied',
      occupiedHoursStart: '',
      occupiedHoursEnd: '',
      ownerName: '',
      ownerPhone: '',
      ownerEmail: '',
    }

    render(<PropertySection />)

    expect(screen.getByDisplayValue('456 Oak Ave')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Los Angeles')).toBeInTheDocument()
    expect(screen.getByDisplayValue('90210')).toBeInTheDocument()
  })

  it('should have use location button', () => {
    render(<PropertySection />)

    const locationButton = screen.getByRole('button', { name: /use location/i })
    expect(locationButton).toBeInTheDocument()
  })

  it('should trigger geolocation when use location is clicked', async () => {
    const user = userEvent.setup()
    render(<PropertySection />)

    const locationButton = screen.getByRole('button', { name: /use location/i })
    await user.click(locationButton)

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()
  })

  it('should call geolocation when fetching location', async () => {
    const user = userEvent.setup()
    mockGeolocation.getCurrentPosition = vi.fn((success) => {
      // Call success immediately for test simplicity
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      })
    })

    render(<PropertySection />)

    const locationButton = screen.getByRole('button', { name: /use location/i })
    await user.click(locationButton)

    // Verify geolocation API was called
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled()
  })

  it('should show building type descriptions', () => {
    render(<PropertySection />)

    expect(screen.getByText(/house, townhome/i)).toBeInTheDocument()
    expect(screen.getByText(/apartments, condos/i)).toBeInTheDocument()
  })

  it('should show warning for pre-1978 buildings', () => {
    ;(mockUseSurveyStore.formData.property.yearBuilt as number | null) = 1975

    render(<PropertySection />)

    expect(screen.getByText(/pre-1978 building/i)).toBeInTheDocument()
    expect(screen.getByText(/lead paint and asbestos/i)).toBeInTheDocument()
  })

  it('should not show warning for buildings after 1978', () => {
    ;(mockUseSurveyStore.formData.property.yearBuilt as number | null) = 1985

    render(<PropertySection />)

    expect(screen.queryByText(/pre-1978 building/i)).not.toBeInTheDocument()
  })

  it('should render number of stories selection', () => {
    render(<PropertySection />)

    expect(screen.getByText('Number of Stories')).toBeInTheDocument()
  })

  it('should render occupancy status selection', () => {
    render(<PropertySection />)

    expect(screen.getByText('Occupancy Status')).toBeInTheDocument()
  })

  it('should show hours of operation when occupied', () => {
    mockUseSurveyStore.formData.property.occupancyStatus = 'occupied'

    render(<PropertySection />)

    expect(screen.getByText('Hours of Operation')).toBeInTheDocument()
    expect(screen.getByLabelText(/start/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end/i)).toBeInTheDocument()
  })

  it('should not show hours of operation when vacant', () => {
    mockUseSurveyStore.formData.property.occupancyStatus = 'vacant'

    render(<PropertySection />)

    expect(screen.queryByText('Hours of Operation')).not.toBeInTheDocument()
  })

  it('should render owner contact fields', () => {
    render(<PropertySection />)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('should update owner name when input changes', async () => {
    const user = userEvent.setup()
    render(<PropertySection />)

    const nameInput = screen.getByLabelText(/name/i)
    await user.type(nameInput, 'J')

    expect(mockUpdateProperty).toHaveBeenCalledWith(
      expect.objectContaining({ ownerName: expect.any(String) })
    )
  })

  it('should update owner phone when input changes', async () => {
    const user = userEvent.setup()
    render(<PropertySection />)

    const phoneInput = screen.getByLabelText(/phone/i)
    await user.type(phoneInput, '5')

    expect(mockUpdateProperty).toHaveBeenCalledWith(
      expect.objectContaining({ ownerPhone: expect.any(String) })
    )
  })

  it('should update owner email when input changes', async () => {
    const user = userEvent.setup()
    render(<PropertySection />)

    const emailInput = screen.getByLabelText(/email/i)
    await user.type(emailInput, 't')

    expect(mockUpdateProperty).toHaveBeenCalledWith(
      expect.objectContaining({ ownerEmail: expect.any(String) })
    )
  })

  it('should have proper form sections', () => {
    render(<PropertySection />)

    expect(screen.getByText('Property Address')).toBeInTheDocument()
    expect(screen.getByText('Building Type')).toBeInTheDocument()
    expect(screen.getByText('Owner/Contact (Optional)')).toBeInTheDocument()
  })

  it('should render all building type options', () => {
    render(<PropertySection />)

    expect(screen.getByText('Single-Family')).toBeInTheDocument()
    expect(screen.getByText('Multi-Family')).toBeInTheDocument()
    expect(screen.getByText('Commercial')).toBeInTheDocument()
    expect(screen.getByText('Industrial')).toBeInTheDocument()
    expect(screen.getByText('Institutional')).toBeInTheDocument()
    expect(screen.getByText('Warehouse')).toBeInTheDocument()
    expect(screen.getByText('Retail')).toBeInTheDocument()
  })

  it('should have input placeholders', () => {
    render(<PropertySection />)

    expect(screen.getByPlaceholderText('123 Main Street')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('City')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('12345')).toBeInTheDocument()
  })

  it('should have proper input types', () => {
    render(<PropertySection />)

    const phoneInput = screen.getByLabelText(/phone/i)
    expect(phoneInput).toHaveAttribute('type', 'tel')

    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toHaveAttribute('type', 'email')
  })

  it('should have numeric input mode for zip code', () => {
    render(<PropertySection />)

    const zipInput = screen.getByLabelText(/zip code/i)
    expect(zipInput).toHaveAttribute('inputMode', 'numeric')
    expect(zipInput).toHaveAttribute('maxLength', '10')
  })
})
