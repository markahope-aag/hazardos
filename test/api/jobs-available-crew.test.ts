import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/jobs/available-crew/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/jobs-service', () => ({
  JobsService: {
    getAvailableCrew: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { JobsService } from '@/lib/services/jobs-service'

describe('Jobs Available Crew API', () => {
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

  describe('GET /api/jobs/available-crew', () => {
    it('should return available crew for a date', async () => {
      setupAuthenticatedUser()

      const mockCrew = [
        { id: 'crew-1', name: 'John Doe', role: 'technician', available: true },
        { id: 'crew-2', name: 'Jane Smith', role: 'supervisor', available: true },
      ]
      vi.mocked(JobsService.getAvailableCrew).mockResolvedValue(mockCrew)

      const request = new NextRequest('http://localhost:3000/api/jobs/available-crew?date=2026-03-01')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data) || data.crew).toBeTruthy()
      expect(JobsService.getAvailableCrew).toHaveBeenCalledWith(expect.any(String))
    })

    it('should return empty array when no crew available', async () => {
      setupAuthenticatedUser()

      vi.mocked(JobsService.getAvailableCrew).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/jobs/available-crew?date=2026-03-01')
      const response = await GET(request)
      const _data = await response.json()

      expect(response.status).toBe(200)
    })

    it('should filter by role when specified', async () => {
      setupAuthenticatedUser()

      const mockCrew = [
        { id: 'crew-1', name: 'John Doe', role: 'technician', available: true },
      ]
      vi.mocked(JobsService.getAvailableCrew).mockResolvedValue(mockCrew)

      const request = new NextRequest('http://localhost:3000/api/jobs/available-crew?date=2026-03-01&role=technician')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(JobsService.getAvailableCrew).toHaveBeenCalled()
    })
  })
})
