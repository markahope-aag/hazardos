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

describe('Jobs From Proposal API', () => {
  const PROPOSAL_UUID = '550e8400-e29b-41d4-a716-446655440001'
  const JOB_UUID = '550e8400-e29b-41d4-a716-446655440002'

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
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

      const newJob = {
        id: JOB_UUID,
        proposal_id: PROPOSAL_UUID,
        status: 'scheduled',
        scheduled_start_date: '2026-03-01',
      }
      vi.mocked(JobsService.createFromProposal).mockResolvedValue(newJob)

      const request = new NextRequest('http://localhost:3000/api/jobs/from-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: PROPOSAL_UUID,
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
      const newJob = {
        id: JOB_UUID,
        proposal_id: PROPOSAL_UUID_2,
        status: 'scheduled',
      }
      vi.mocked(JobsService.createFromProposal).mockResolvedValue(newJob)

      const request = new NextRequest('http://localhost:3000/api/jobs/from-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposal_id: PROPOSAL_UUID_2,
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
          scheduled_start_date: 'invalid-date',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })
})
