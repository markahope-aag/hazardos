import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PATCH } from '@/app/api/jobs/[id]/complete/route'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import type { JobCompletion } from '@/types/job-completion'

const createMockCompletion = (overrides: Partial<JobCompletion> = {}): JobCompletion => ({
  id: 'completion-1',
  job_id: 'job-123',
  status: 'draft',
  estimated_hours: 40,
  estimated_material_cost: null,
  estimated_total: null,
  actual_hours: null,
  actual_material_cost: null,
  actual_labor_cost: null,
  actual_total: null,
  hours_variance: null,
  hours_variance_percent: null,
  cost_variance: null,
  cost_variance_percent: null,
  field_notes: 'Work completed successfully',
  issues_encountered: null,
  recommendations: null,
  submitted_at: null,
  submitted_by: null,
  reviewed_at: null,
  reviewed_by: null,
  review_notes: null,
  rejection_reason: null,
  customer_signed: false,
  customer_signed_at: null,
  customer_signature_name: null,
  customer_signature_data: null,
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-01T10:00:00Z',
  ...overrides
})

const createMockCompletionSummary = () => ({
  timeEntries: [],
  materialUsage: [],
  equipment: [],
  photos: [],
  checklist: { safety: [], quality: [], cleanup: [], documentation: [], custom: [] },
  completion: null,
  checklistProgress: { completed: 0, required: 0, total: 0 }
})

// Mock dependencies
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

vi.mock('@/lib/services/job-completion-service', () => ({
  JobCompletionService: {
    getCompletion: vi.fn(),
    getCompletionSummary: vi.fn(),
    createCompletion: vi.fn(),
    submitCompletion: vi.fn(),
    updateCompletion: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Job Completion API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/jobs/[id]/complete', () => {
    it('should get completion details', async () => {
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

      const mockCompletion = createMockCompletion()

      vi.mocked(JobCompletionService.getCompletion).mockResolvedValue(mockCompletion)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/complete')
      const response = await GET(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockCompletion)
    })

    it('should get completion summary when summary=true', async () => {
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

      const mockSummary = createMockCompletionSummary()

      vi.mocked(JobCompletionService.getCompletionSummary).mockResolvedValue(mockSummary)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/complete?summary=true')
      const response = await GET(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSummary)
    })
  })

  describe('POST /api/jobs/[id]/complete', () => {
    it('should create completion', async () => {
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

      const mockCompletion = createMockCompletion()

      vi.mocked(JobCompletionService.createCompletion).mockResolvedValue(mockCompletion)

      const completionData = {
        estimated_hours: 40,
        estimated_material_cost: 1000,
        estimated_total: 5000
      }

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/complete', {
        method: 'POST',
        body: JSON.stringify(completionData)
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockCompletion)
    })

    it('should submit completion when submit=true', async () => {
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

      const mockCompletion = createMockCompletion({ status: 'submitted' })

      vi.mocked(JobCompletionService.submitCompletion).mockResolvedValue(mockCompletion)

      const completionData = {
        submit: true,
        field_notes: 'Work completed'
      }

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/complete', {
        method: 'POST',
        body: JSON.stringify(completionData)
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockCompletion)
    })
  })

  describe('PATCH /api/jobs/[id]/complete', () => {
    it('should update completion', async () => {
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

      const mockUpdated = createMockCompletion({ field_notes: 'Updated notes' })

      vi.mocked(JobCompletionService.updateCompletion).mockResolvedValue(mockUpdated)

      const updateData = {
        field_notes: 'Updated notes'
      }

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/complete', {
        method: 'PATCH',
        body: JSON.stringify(updateData)
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockUpdated)
    })
  })
})
