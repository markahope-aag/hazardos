import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/pipeline/route'
import { PipelineService } from '@/lib/services/pipeline-service'
import type { PipelineStage, Opportunity, PipelineMetrics } from '@/types/sales'

const createMockStage = (overrides: Partial<PipelineStage> = {}): PipelineStage => ({
  id: 'stage-1',
  organization_id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Lead',
  color: '#94a3b8',
  stage_type: 'lead',
  probability: 10,
  sort_order: 1,
  is_active: true,
  created_at: '2026-03-01T10:00:00Z',
  ...overrides
})

const createMockOpportunity = (overrides: Partial<Opportunity> = {}): Opportunity => ({
  id: 'opp-1',
  organization_id: '550e8400-e29b-41d4-a716-446655440000',
  customer_id: '550e8400-e29b-41d4-a716-446655440001',
  company_id: null,
  name: 'Office Renovation',
  description: null,
  stage_id: 'stage-1',
  opportunity_status: null,
  estimated_value: 50000,
  weighted_value: null,
  probability_pct: 10,
  expected_close_date: null,
  actual_close_date: null,
  primary_contact_id: null,
  site_contact_id: null,
  owner_id: null,
  property_id: null,
  service_address_line1: null,
  service_address_line2: null,
  service_city: null,
  service_state: null,
  service_zip: null,
  property_type: null,
  property_age: null,
  location_id: null,
  hazard_types: null,
  estimated_affected_area_sqft: null,
  urgency: null,
  regulatory_trigger: null,
  assessment_date: null,
  estimate_sent_date: null,
  follow_up_date: null,
  estimate_id: null,
  proposal_id: null,
  job_id: null,
  created_from_assessment_id: null,
  outcome: null,
  loss_reason: null,
  loss_notes: null,
  competitor: null,
  lost_to_competitor: null,
  lead_source: null,
  lead_source_detail: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  first_touch_date: null,
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
    role: 'admin'
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
        createMockStage({ id: 'stage-1', name: 'Lead', sort_order: 1 }),
        createMockStage({ id: 'stage-2', name: 'Qualified', stage_type: 'qualified', sort_order: 2 })
      ]

      const mockOpportunities = [
        createMockOpportunity({ id: 'opp-1', name: 'Office Renovation', estimated_value: 50000, stage_id: 'stage-1' })
      ]

      const mockMetrics: PipelineMetrics = {
        total_value: 50000,
        weighted_value: 12500,
        count: 1,
        by_stage: []
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

      const mockOpportunity = createMockOpportunity({
        id: 'opp-1',
        name: 'Factory Abatement',
        estimated_value: 100000,
        stage_id: '550e8400-e29b-41d4-a716-446655440002'
      })

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
