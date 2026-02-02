import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, DELETE } from '@/app/api/jobs/[id]/crew/route'
import { JobsService } from '@/lib/services/jobs-service'

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

vi.mock('@/lib/services/jobs-service', () => ({
  JobsService: {
    assignCrew: vi.fn(),
    removeCrew: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Job Crew Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@example.com' } },
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

  describe('POST /api/jobs/[id]/crew', () => {
    it('should assign crew member to job', async () => {
      setupAuthenticatedUser()

      const mockCrew = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        job_id: 'job-123',
        profile_id: '550e8400-e29b-41d4-a716-446655440002'
      }

      vi.mocked(JobsService.assignCrew).mockResolvedValue(mockCrew)

      const crewData = {
        profile_id: '550e8400-e29b-41d4-a716-446655440002',
        role: 'lead'
      }

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/crew', {
        method: 'POST',
        body: JSON.stringify(crewData)
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockCrew)
    })
  })

  describe('DELETE /api/jobs/[id]/crew', () => {
    it('should remove crew member from job', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.removeCrew).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/crew', {
        method: 'DELETE',
        body: JSON.stringify({ profile_id: '550e8400-e29b-41d4-a716-446655440002' })
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })
})
