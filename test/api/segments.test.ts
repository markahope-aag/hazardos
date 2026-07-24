import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/segments/route'
import { SegmentationService } from '@/lib/services/segmentation-service'
import type { CustomerSegment } from '@/types/integrations'

const createMockSegment = (overrides: Partial<CustomerSegment> = {}): CustomerSegment => ({
  id: 'seg-1',
  organization_id: 'org-123',
  name: 'High Value Customers',
  segment_type: 'dynamic',
  rules: [],
  member_count: 0,
  is_active: true,
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-01T10:00:00Z',
  ...overrides
})

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/segmentation-service', () => ({
  SegmentationService: {
    list: vi.fn(),
    create: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Segments API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/segments', () => {
    it('should list segments', async () => {
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

      const mockSegments = [
        createMockSegment({ id: 'seg-1', name: 'High Value Customers' }),
        createMockSegment({ id: 'seg-2', name: 'Repeat Customers' })
      ]

      vi.mocked(SegmentationService.list).mockResolvedValue(mockSegments)

      const request = new NextRequest('http://localhost:3000/api/segments')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.segments).toEqual(mockSegments)
    })
  })

  describe('POST /api/segments', () => {
    it('should create a new segment', async () => {
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

      const mockSegment = createMockSegment({
        name: 'Premium Customers',
        rules: [{ field: 'total_spent', operator: '>=', value: 10000 }]
      })

      vi.mocked(SegmentationService.create).mockResolvedValue(mockSegment)

      const segmentData = {
        name: 'Premium Customers',
        criteria: { total_spent: { gte: 10000 } }
      }

      const request = new NextRequest('http://localhost:3000/api/segments', {
        method: 'POST',
        body: JSON.stringify(segmentData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.segment).toEqual(mockSegment)
    })
  })
})
