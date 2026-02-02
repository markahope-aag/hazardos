import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, PATCH, DELETE } from '@/app/api/jobs/[id]/equipment/route'

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
    addEquipment: vi.fn(),
    updateEquipmentStatus: vi.fn(),
    deleteEquipment: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { JobsService } from '@/lib/services/jobs-service'

describe('Job Equipment Management', () => {
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

  describe('POST /api/jobs/[id]/equipment', () => {
    it('should add equipment to job', async () => {
      // Arrange
      setupAuthenticatedUser()

      const mockEquipment = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        job_id: 'job-123',
        equipment_name: 'HEPA Vacuum',
        equipment_type: 'hepa_vacuum',
        quantity: 2,
        status: 'assigned'
      }

      vi.mocked(JobsService.addEquipment).mockResolvedValue(mockEquipment)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_name: 'HEPA Vacuum',
          equipment_type: 'hepa_vacuum',
          quantity: 2
        })
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.equipment_name).toBe('HEPA Vacuum')
      expect(data.quantity).toBe(2)
      expect(JobsService.addEquipment).toHaveBeenCalled()
    })

    it('should add negative air machine to job', async () => {
      // Arrange
      setupAuthenticatedUser()

      const mockEquipment = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        equipment_name: 'Negative Air Machine',
        equipment_type: 'negative_air_machine',
        quantity: 3
      }

      vi.mocked(JobsService.addEquipment).mockResolvedValue(mockEquipment)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_name: 'Negative Air Machine',
          equipment_type: 'negative_air_machine',
          quantity: 3
        })
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.equipment_name).toBe('Negative Air Machine')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment_name: 'HEPA Vacuum' })
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/jobs/[id]/equipment', () => {
    it('should update equipment status to deployed', async () => {
      // Arrange
      setupAuthenticatedUser()

      const updatedEquipment = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'deployed'
      }

      vi.mocked(JobsService.updateEquipmentStatus).mockResolvedValue(updatedEquipment)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/equipment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'deployed'
        })
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe('deployed')
      expect(JobsService.updateEquipmentStatus).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001', 'deployed')
    })

    it('should update equipment status to returned', async () => {
      // Arrange
      setupAuthenticatedUser()

      const updatedEquipment = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        status: 'returned'
      }

      vi.mocked(JobsService.updateEquipmentStatus).mockResolvedValue(updatedEquipment)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/equipment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipment_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'returned'
        })
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.status).toBe('returned')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/equipment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment_id: '550e8400-e29b-41d4-a716-446655440001', status: 'deployed' })
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/jobs/[id]/equipment', () => {
    it('should delete equipment from job', async () => {
      // Arrange
      setupAuthenticatedUser()

      vi.mocked(JobsService.deleteEquipment).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/equipment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment_id: '550e8400-e29b-41d4-a716-446655440001' })
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(JobsService.deleteEquipment).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/equipment', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment_id: '550e8400-e29b-41d4-a716-446655440001' })
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
