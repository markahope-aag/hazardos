import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/jobs/from-proposal/route'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/jobs-service', () => ({
  JobsService: {
    createFromProposal: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { JobsService } from '@/lib/services/jobs-service'
import type { Job } from '@/types/jobs'

const createMockJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  organization_id: 'org-123',
  proposal_id: null,
  estimate_id: null,
  customer_id: 'customer-1',
  site_survey_id: null,
  job_number: 'JOB-0001',
  name: null,
  status: 'scheduled',
  hazard_types: ['asbestos'],
  scheduled_start_date: '2026-03-01',
  scheduled_start_time: null,
  scheduled_end_date: null,
  scheduled_end_time: null,
  estimated_duration_hours: null,
  estimated_labor_hours: null,
  actual_labor_hours: null,
  actual_start_at: null,
  actual_end_at: null,
  job_address: '123 Main St',
  job_city: null,
  job_state: null,
  job_zip: null,
  job_latitude: null,
  job_longitude: null,
  access_notes: null,
  gate_code: null,
  lockbox_code: null,
  contact_onsite_name: null,
  contact_onsite_phone: null,
  contract_amount: null,
  change_order_amount: 0,
  final_amount: null,
  completion_notes: null,
  completion_photos: [],
  customer_signed_off: false,
  customer_signoff_at: null,
  customer_signoff_name: null,
  inspection_required: false,
  inspection_passed: null,
  inspection_date: null,
  inspection_notes: null,
  internal_notes: null,
  special_instructions: null,
  location_id: null,
  created_by: null,
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-01T00:00:00Z',
  ...overrides
})

describe('Jobs From Proposal API', () => {
  const PROPOSAL_UUID = '550e8400-e29b-41d4-a716-446655440001'
  const JOB_UUID = '550e8400-e29b-41d4-a716-446655440002'

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/jobs/from-proposal', () => {
    it('should create job from signed proposal', async () => {
      setupAuthenticatedUser()

      // Mock proposal status check
      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'proposals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { status: 'signed' },
                  error: null
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        } as any
      })

      const newJob = createMockJob({
        id: JOB_UUID,
        proposal_id: PROPOSAL_UUID,
        status: 'scheduled',
        scheduled_start_date: '2026-03-01',
      })
      vi.mocked(JobsService.createFromProposal).mockResolvedValue(newJob)

      const request = new NextRequest('http://localhost:3000/api/jobs/from-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: PROPOSAL_UUID,
          assigned_to: '550e8400-e29b-41d4-a716-446655440055',
          scheduled_start_date: '2026-03-01',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(newJob)
      expect(JobsService.createFromProposal).toHaveBeenCalledWith(
        expect.objectContaining({
          proposal_id: PROPOSAL_UUID,
          scheduled_start_date: '2026-03-01',
        })
      )
    })

    it('should create job from accepted proposal', async () => {
      setupAuthenticatedUser()

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'proposals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { status: 'accepted' },
                  error: null
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        } as any
      })

      const PROPOSAL_UUID_2 = '550e8400-e29b-41d4-a716-446655440003'
      const newJob = createMockJob({
        id: JOB_UUID,
        proposal_id: PROPOSAL_UUID_2,
        status: 'scheduled',
      })
      vi.mocked(JobsService.createFromProposal).mockResolvedValue(newJob)

      const request = new NextRequest('http://localhost:3000/api/jobs/from-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: PROPOSAL_UUID_2,
          assigned_to: '550e8400-e29b-41d4-a716-446655440055',
          scheduled_start_date: '2026-03-15',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should reject job creation from unsigned proposal', async () => {
      setupAuthenticatedUser()

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'proposals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { status: 'draft' },
                  error: null
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/from-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: PROPOSAL_UUID,
          assigned_to: '550e8400-e29b-41d4-a716-446655440055',
          scheduled_start_date: '2026-03-01',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should reject job creation for non-existent proposal', async () => {
      setupAuthenticatedUser()

      const NONEXISTENT_UUID = '550e8400-e29b-41d4-a716-446655440099'

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'proposals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Not found' }
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        } as any
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/from-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: NONEXISTENT_UUID,
          assigned_to: '550e8400-e29b-41d4-a716-446655440055',
          scheduled_start_date: '2026-03-01',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('should reject invalid date format', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/jobs/from-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: PROPOSAL_UUID,
          assigned_to: '550e8400-e29b-41d4-a716-446655440055',
          scheduled_start_date: 'invalid-date',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
