import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, PATCH, DELETE } from '@/app/api/jobs/[id]/disposal/route'

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
    addDisposal: vi.fn(),
    updateDisposal: vi.fn(),
    deleteDisposal: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { JobsService } from '@/lib/services/jobs-service'

describe('Job Disposal Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('POST /api/jobs/[id]/disposal', () => {
    it('should add disposal record to job', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      const mockDisposal = {
        id: 'disposal-1',
        job_id: 'job-123',
        disposal_type: 'landfill',
        facility_name: 'County Waste Facility',
        weight_tons: 5.5,
        disposal_date: '2026-02-01',
        cost: 550.00
      }

      vi.mocked(JobsService.addDisposal).mockResolvedValue(mockDisposal)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposal_type: 'landfill',
          facility_name: 'County Waste Facility',
          weight_tons: 5.5,
          disposal_date: '2026-02-01',
          cost: 550.00
        })
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.disposal_type).toBe('landfill')
      expect(data.weight_tons).toBe(5.5)
      expect(data.cost).toBe(550.00)
      expect(JobsService.addDisposal).toHaveBeenCalled()
    })

    it('should add hazardous waste disposal record', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      const mockDisposal = {
        id: 'disposal-2',
        disposal_type: 'hazardous_waste',
        facility_name: 'Hazmat Disposal Inc',
        weight_tons: 2.3,
        manifest_number: 'MAN-12345'
      }

      vi.mocked(JobsService.addDisposal).mockResolvedValue(mockDisposal)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposal_type: 'hazardous_waste',
          facility_name: 'Hazmat Disposal Inc',
          weight_tons: 2.3,
          manifest_number: 'MAN-12345'
        })
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.disposal_type).toBe('hazardous_waste')
      expect(data.manifest_number).toBe('MAN-12345')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disposal_type: 'landfill' })
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/jobs/[id]/disposal', () => {
    it('should update disposal record', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      const updatedDisposal = {
        id: 'disposal-1',
        weight_tons: 6.0,
        cost: 600.00
      }

      vi.mocked(JobsService.updateDisposal).mockResolvedValue(updatedDisposal)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposal_id: 'disposal-1',
          weight_tons: 6.0,
          cost: 600.00
        })
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.weight_tons).toBe(6.0)
      expect(data.cost).toBe(600.00)
      expect(JobsService.updateDisposal).toHaveBeenCalledWith('disposal-1', {
        weight_tons: 6.0,
        cost: 600.00
      })
    })

    it('should update manifest number', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      const updatedDisposal = {
        id: 'disposal-1',
        manifest_number: 'MAN-67890'
      }

      vi.mocked(JobsService.updateDisposal).mockResolvedValue(updatedDisposal)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposal_id: 'disposal-1',
          manifest_number: 'MAN-67890'
        })
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.manifest_number).toBe('MAN-67890')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disposal_id: 'disposal-1', weight_tons: 6.0 })
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/jobs/[id]/disposal', () => {
    it('should delete disposal record', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      vi.mocked(JobsService.deleteDisposal).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disposal_id: 'disposal-1' })
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(JobsService.deleteDisposal).toHaveBeenCalledWith('disposal-1')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disposal_id: 'disposal-1' })
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
