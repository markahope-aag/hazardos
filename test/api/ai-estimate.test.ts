import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai/estimate/route'
import { AIEstimateService } from '@/lib/services/ai-estimate-service'
import type { EstimateSuggestion } from '@/types/integrations'

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
    role: 'admin'
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

    const mockEstimate: EstimateSuggestion = {
      id: 'estimate-suggestion-1',
      organization_id: 'org-123',
      hazard_types: ['asbestos'],
      suggested_items: [
        { description: 'Asbestos removal', quantity: 1, unit_price: 3000, category: 'labor' },
        { description: 'Disposal fees', quantity: 1, unit_price: 500, category: 'disposal' },
        { description: 'Labor', quantity: 40, unit_price: 37.5, category: 'labor' }
      ],
      total_amount: 5000,
      confidence_score: 0.8,
      reasoning: 'Estimate based on similar asbestos abatement projects',
      created_at: '2024-01-01T00:00:00Z'
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

    const mockEstimate: EstimateSuggestion = {
      id: 'estimate-suggestion-2',
      organization_id: 'org-123',
      hazard_types: ['asbestos', 'mold', 'lead'],
      suggested_items: [],
      total_amount: 12000,
      confidence_score: 0.75,
      reasoning: 'Multi-hazard remediation project',
      created_at: '2024-01-01T00:00:00Z'
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

    const mockEstimate: EstimateSuggestion = {
      id: 'estimate-suggestion-3',
      organization_id: 'org-123',
      hazard_types: ['mold'],
      suggested_items: [],
      total_amount: 3000,
      confidence_score: 0.6,
      reasoning: 'Basic estimate - more details needed for accuracy',
      created_at: '2024-01-01T00:00:00Z'
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
