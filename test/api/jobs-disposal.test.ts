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

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@example.com' } },
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

  describe('POST /api/jobs/[id]/disposal', () => {
    it('should add disposal record to job', async () => {
      // Arrange
      setupAuthenticatedUser()

      const mockDisposal = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        job_id: 'job-123',
        hazard_type: 'asbestos',
        disposal_type: 'landfill',
        quantity: 5.5,
        unit: 'tons',
        disposal_facility_name: 'County Waste Facility',
        disposal_cost: 550.00
      }

      vi.mocked(JobsService.addDisposal).mockResolvedValue(mockDisposal)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hazard_type: 'asbestos',
          disposal_type: 'landfill',
          quantity: 5.5,
          unit: 'tons',
          disposal_facility_name: 'County Waste Facility',
          disposal_cost: 550.00
        })
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.hazard_type).toBe('asbestos')
      expect(data.quantity).toBe(5.5)
      expect(data.disposal_cost).toBe(550.00)
      expect(JobsService.addDisposal).toHaveBeenCalled()
    })

    it('should add hazardous waste disposal record', async () => {
      // Arrange
      setupAuthenticatedUser()

      const mockDisposal = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        hazard_type: 'lead_paint',
        disposal_type: 'hazardous_waste',
        quantity: 2.3,
        unit: 'tons',
        disposal_facility_name: 'Hazmat Disposal Inc',
        manifest_number: 'MAN-12345'
      }

      vi.mocked(JobsService.addDisposal).mockResolvedValue(mockDisposal)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hazard_type: 'lead_paint',
          disposal_type: 'hazardous_waste',
          quantity: 2.3,
          unit: 'tons',
          disposal_facility_name: 'Hazmat Disposal Inc',
          manifest_number: 'MAN-12345'
        })
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.hazard_type).toBe('lead_paint')
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
        body: JSON.stringify({ hazard_type: 'asbestos', quantity: 1, unit: 'tons' })
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
      setupAuthenticatedUser()

      const updatedDisposal = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        quantity: 6.0,
        disposal_cost: 600.00
      }

      vi.mocked(JobsService.updateDisposal).mockResolvedValue(updatedDisposal)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposal_id: '550e8400-e29b-41d4-a716-446655440001',
          quantity: 6.0,
          disposal_cost: 600.00
        })
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.quantity).toBe(6.0)
      expect(data.disposal_cost).toBe(600.00)
      expect(JobsService.updateDisposal).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001', {
        quantity: 6.0,
        disposal_cost: 600.00
      })
    })

    it('should update manifest number', async () => {
      // Arrange
      setupAuthenticatedUser()

      const updatedDisposal = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        manifest_number: 'MAN-67890'
      }

      vi.mocked(JobsService.updateDisposal).mockResolvedValue(updatedDisposal)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposal_id: '550e8400-e29b-41d4-a716-446655440001',
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
        body: JSON.stringify({ disposal_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 6.0 })
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
      setupAuthenticatedUser()

      vi.mocked(JobsService.deleteDisposal).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/disposal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disposal_id: '550e8400-e29b-41d4-a716-446655440001' })
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(JobsService.deleteDisposal).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
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
        body: JSON.stringify({ disposal_id: '550e8400-e29b-41d4-a716-446655440001' })
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
