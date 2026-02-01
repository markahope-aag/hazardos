import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/ai/photo-analysis/route'
import { PhotoAnalysisService } from '@/lib/services/photo-analysis-service'

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

vi.mock('@/lib/services/photo-analysis-service', () => ({
  PhotoAnalysisService: {
    analyzePhoto: vi.fn(),
    analyzeMultiplePhotos: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('POST /api/ai/photo-analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  describe('Single photo analysis', () => {
    it('should analyze single photo for authenticated user', async () => {
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

      const mockAnalysis = {
        hazards_detected: ['asbestos', 'mold'],
        confidence: 0.85,
        description: 'Detected asbestos ceiling tiles and mold growth',
        recommendations: ['Professional asbestos removal required', 'Mold remediation needed']
      }

      vi.mocked(PhotoAnalysisService.analyzePhoto).mockResolvedValue(mockAnalysis)

      // Create a proper request with JSON content type
      const photoData = {
        image: 'base64-encoded-image-data',
        context: {
          property_type: 'residential',
          known_hazards: ['asbestos'],
          additional_context: 'Basement ceiling'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/ai/photo-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(photoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockAnalysis)
      expect(PhotoAnalysisService.analyzePhoto).toHaveBeenCalledWith(
        'org-123',
        'base64-encoded-image-data',
        {
          property_type: 'residential',
          known_hazards: ['asbestos'],
          additional_context: 'Basement ceiling'
        }
      )
    })

    it('should analyze photo without context', async () => {
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

      const mockAnalysis = {
        hazards_detected: [],
        confidence: 0.95,
        description: 'No hazards detected',
        recommendations: []
      }

      vi.mocked(PhotoAnalysisService.analyzePhoto).mockResolvedValue(mockAnalysis)

      const photoData = {
        image: 'base64-encoded-image-data'
      }

      const request = new NextRequest('http://localhost:3000/api/ai/photo-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(photoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockAnalysis)
      expect(PhotoAnalysisService.analyzePhoto).toHaveBeenCalledWith(
        'org-123',
        'base64-encoded-image-data',
        undefined
      )
    })
  })

  describe('Multiple photo analysis', () => {
    it('should analyze multiple photos for authenticated user', async () => {
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

      const mockResult = {
        overall_summary: 'Multiple hazards detected across property',
        hazards_detected: ['asbestos', 'mold', 'lead'],
        individual_analyses: [
          { image_index: 0, hazards: ['asbestos'], confidence: 0.9 },
          { image_index: 1, hazards: ['mold'], confidence: 0.85 },
          { image_index: 2, hazards: ['lead'], confidence: 0.8 }
        ],
        recommendations: ['Comprehensive hazard assessment required']
      }

      vi.mocked(PhotoAnalysisService.analyzeMultiplePhotos).mockResolvedValue(mockResult)

      const multiplePhotosData = {
        images: [
          { base64: 'image-data-1', context: { property_type: 'commercial' } },
          { base64: 'image-data-2' },
          { base64: 'image-data-3', context: { known_hazards: ['lead'] } }
        ]
      }

      const request = new NextRequest('http://localhost:3000/api/ai/photo-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(multiplePhotosData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockResult)
      expect(PhotoAnalysisService.analyzeMultiplePhotos).toHaveBeenCalledWith(
        'org-123',
        expect.arrayContaining([
          expect.objectContaining({ base64: 'image-data-1' }),
          expect.objectContaining({ base64: 'image-data-2' }),
          expect.objectContaining({ base64: 'image-data-3' })
        ])
      )
    })

    it('should return error when images array is empty', async () => {
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

      const emptyImagesData = {
        images: []
      }

      const request = new NextRequest('http://localhost:3000/api/ai/photo-analysis', {
        method: 'POST',
        body: JSON.stringify(emptyImagesData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
    })
  })

  describe('Validation', () => {
    it('should return error when neither image nor images is provided', async () => {
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

      const request = new NextRequest('http://localhost:3000/api/ai/photo-analysis', {
        method: 'POST',
        body: JSON.stringify({})
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

      const photoData = {
        image: 'base64-encoded-image-data'
      }

      const request = new NextRequest('http://localhost:3000/api/ai/photo-analysis', {
        method: 'POST',
        body: JSON.stringify(photoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.type).toBe('UNAUTHORIZED')
    })
  })

  describe('Error handling', () => {
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

      vi.mocked(PhotoAnalysisService.analyzePhoto).mockRejectedValue(
        new Error('Anthropic API key invalid')
      )

      const photoData = {
        image: 'base64-encoded-image-data'
      }

      const request = new NextRequest('http://localhost:3000/api/ai/photo-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(photoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.type).toBe('INTERNAL_ERROR')
      expect(data.error).not.toContain('Anthropic')
      expect(data.error).not.toContain('API key')
    })

    it('should handle invalid image format error', async () => {
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

      vi.mocked(PhotoAnalysisService.analyzePhoto).mockRejectedValue(
        new Error('Invalid image format')
      )

      const photoData = {
        image: 'invalid-base64-data'
      }

      const request = new NextRequest('http://localhost:3000/api/ai/photo-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(photoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.type).toBe('INTERNAL_ERROR')
    })

    it('should handle AI quota exceeded error', async () => {
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

      vi.mocked(PhotoAnalysisService.analyzePhoto).mockRejectedValue(
        new Error('Monthly AI analysis quota exceeded')
      )

      const photoData = {
        image: 'base64-encoded-image-data'
      }

      const request = new NextRequest('http://localhost:3000/api/ai/photo-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(photoData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.type).toBe('INTERNAL_ERROR')
    })
  })
})
