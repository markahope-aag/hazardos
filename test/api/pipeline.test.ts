import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/pipeline/route'
import { PipelineService } from '@/lib/services/pipeline-service'

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

vi.mock('@/lib/services/pipeline-service', () => ({
  PipelineService: {
    getStages: vi.fn(),
    getOpportunities: vi.fn(),
    getPipelineMetrics: vi.fn(),
    createOpportunity: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Pipeline API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'user'
  }

  const setupAuthenticatedUser = () => {
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
  }

  describe('GET /api/pipeline', () => {
    it('should return pipeline data with stages, opportunities, and metrics', async () => {
      setupAuthenticatedUser()

      const mockStages = [
        { id: 'stage-1', name: 'Lead', order: 1 },
        { id: 'stage-2', name: 'Qualified', order: 2 }
      ]

      const mockOpportunities = [
        { id: 'opp-1', name: 'Office Renovation', value: 50000, stage_id: 'stage-1' }
      ]

      const mockMetrics = {
        total_value: 50000,
        count: 1,
        conversion_rate: 0.25
      }

      vi.mocked(PipelineService.getStages).mockResolvedValue(mockStages)
      vi.mocked(PipelineService.getOpportunities).mockResolvedValue({
        opportunities: mockOpportunities,
        total: 1,
        limit: 50,
        offset: 0
      })
      vi.mocked(PipelineService.getPipelineMetrics).mockResolvedValue(mockMetrics)

      const request = new NextRequest('http://localhost:3000/api/pipeline')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.stages).toEqual(mockStages)
      expect(data.opportunities).toEqual(mockOpportunities)
      expect(data.metrics).toEqual(mockMetrics)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/pipeline')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/pipeline', () => {
    it('should create new opportunity', async () => {
      setupAuthenticatedUser()

      const mockOpportunity = {
        id: 'opp-1',
        name: 'Factory Abatement',
        value: 100000,
        stage_id: '550e8400-e29b-41d4-a716-446655440002'
      }

      vi.mocked(PipelineService.createOpportunity).mockResolvedValue(mockOpportunity)

      const oppData = {
        name: 'Factory Abatement',
        value: 100000,
        stage_id: '550e8400-e29b-41d4-a716-446655440002',
        customer_id: '550e8400-e29b-41d4-a716-446655440001'
      }

      const request = new NextRequest('http://localhost:3000/api/pipeline', {
        method: 'POST',
        body: JSON.stringify(oppData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockOpportunity)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const oppData = {
        name: 'Factory Abatement',
        value: 100000,
        stage_id: '550e8400-e29b-41d4-a716-446655440002',
        customer_id: '550e8400-e29b-41d4-a716-446655440001'
      }

      const request = new NextRequest('http://localhost:3000/api/pipeline', {
        method: 'POST',
        body: JSON.stringify(oppData)
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })
})
