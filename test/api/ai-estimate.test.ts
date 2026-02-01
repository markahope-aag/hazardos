import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai/estimate/route'
import { AIEstimateService } from '@/lib/services/ai-estimate-service'

// Mock dependencies
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/ai-estimate-service', () => ({
  AIEstimateService: {
    suggestEstimate: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('POST /api/ai/estimate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  it('should generate AI estimate for authenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const mockEstimate = {
      estimated_cost: 5000,
      estimated_duration_hours: 40,
      line_items: [
        { description: 'Asbestos removal', quantity: 1, unit_price: 3000, total: 3000 },
        { description: 'Disposal fees', quantity: 1, unit_price: 500, total: 500 },
        { description: 'Labor', quantity: 40, unit_price: 37.5, total: 1500 }
      ],
      notes: 'Estimate based on similar asbestos abatement projects',
      confidence: 0.8
    }

    vi.mocked(AIEstimateService.suggestEstimate).mockResolvedValue(mockEstimate)

    const estimateData = {
      hazard_types: ['asbestos'],
      property_type: 'residential',
      square_footage: 1200,
      photos: ['photo-base64-1', 'photo-base64-2'],
      site_survey_notes: 'Asbestos ceiling tiles in basement',
      customer_notes: 'Customer wants work completed within 2 weeks'
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(estimateData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockEstimate)
    expect(AIEstimateService.suggestEstimate).toHaveBeenCalledWith(
      'org-123',
      {
        hazard_types: ['asbestos'],
        property_type: 'residential',
        square_footage: 1200,
        photos: ['photo-base64-1', 'photo-base64-2'],
        site_survey_notes: 'Asbestos ceiling tiles in basement',
        customer_notes: 'Customer wants work completed within 2 weeks'
      }
    )
  })

  it('should generate estimate with multiple hazard types', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const mockEstimate = {
      estimated_cost: 12000,
      estimated_duration_hours: 80,
      line_items: [],
      notes: 'Multi-hazard remediation project',
      confidence: 0.75
    }

    vi.mocked(AIEstimateService.suggestEstimate).mockResolvedValue(mockEstimate)

    const estimateData = {
      hazard_types: ['asbestos', 'mold', 'lead'],
      property_type: 'commercial',
      square_footage: 5000
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(estimateData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockEstimate)
    expect(AIEstimateService.suggestEstimate).toHaveBeenCalledWith(
      'org-123',
      expect.objectContaining({
        hazard_types: ['asbestos', 'mold', 'lead']
      })
    )
  })

  it('should generate estimate without optional fields', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const mockEstimate = {
      estimated_cost: 3000,
      estimated_duration_hours: 24,
      line_items: [],
      notes: 'Basic estimate - more details needed for accuracy',
      confidence: 0.6
    }

    vi.mocked(AIEstimateService.suggestEstimate).mockResolvedValue(mockEstimate)

    const minimalData = {
      hazard_types: ['mold']
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(minimalData)
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
    expect(AIEstimateService.suggestEstimate).toHaveBeenCalledWith(
      'org-123',
      expect.objectContaining({
        hazard_types: ['mold'],
        property_type: undefined,
        square_footage: undefined,
        photos: undefined,
        site_survey_notes: undefined,
        customer_notes: undefined
      })
    )
  })

  it('should validate hazard_types is required', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const invalidData = {
      property_type: 'residential',
      square_footage: 1000
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should validate hazard_types is not empty', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const invalidData = {
      hazard_types: [],
      property_type: 'residential'
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should validate hazard_types contains valid values', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const invalidData = {
      hazard_types: ['invalid-hazard-type']
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should validate property_type when provided', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const invalidData = {
      hazard_types: ['asbestos'],
      property_type: 'invalid-property-type'
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should validate square_footage is non-negative', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const invalidData = {
      hazard_types: ['asbestos'],
      square_footage: -100
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should validate site_survey_notes length', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const longNotes = 'a'.repeat(5001)

    const invalidData = {
      hazard_types: ['asbestos'],
      site_survey_notes: longNotes
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should validate customer_notes length', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    const longNotes = 'b'.repeat(5001)

    const invalidData = {
      hazard_types: ['mold'],
      customer_notes: longNotes
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(invalidData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.type).toBe('VALIDATION_ERROR')
  })

  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const estimateData = {
      hazard_types: ['asbestos']
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(estimateData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.type).toBe('UNAUTHORIZED')
  })

  it('should handle AI service errors securely', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    vi.mocked(AIEstimateService.suggestEstimate).mockRejectedValue(
      new Error('OpenAI API key invalid')
    )

    const estimateData = {
      hazard_types: ['asbestos']
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(estimateData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
    expect(data.error).not.toContain('OpenAI')
    expect(data.error).not.toContain('API key')
  })

  it('should handle insufficient data error', async () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com' } },
      error: null
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)

    vi.mocked(AIEstimateService.suggestEstimate).mockRejectedValue(
      new Error('Insufficient data for accurate estimate')
    )

    const estimateData = {
      hazard_types: ['asbestos']
    }

    const request = new NextRequest('http://localhost:3000/api/ai/estimate', {
      method: 'POST',
      body: JSON.stringify(estimateData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.type).toBe('INTERNAL_ERROR')
  })
})
