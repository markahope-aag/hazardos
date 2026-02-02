import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/jobs/[id]/checklist/route'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

vi.mock('@/lib/services/job-completion-service', () => ({
  JobCompletionService: {
    getChecklist: vi.fn(),
    getChecklistGrouped: vi.fn(),
    initializeChecklist: vi.fn(),
  },
}))

import { JobCompletionService } from '@/lib/services/job-completion-service'

const mockProfile = {
  organization_id: 'org-123',
  role: 'user'
}

const setupAuthenticatedUser = () => {
  vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
    data: { user: { id: 'user-123', email: 'test@example.com' } },
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

describe('Job Checklist API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/jobs/[id]/checklist', () => {
    it('should return checklist for a job', async () => {
      // Arrange
      setupAuthenticatedUser()
      const mockChecklist = [
        { id: 'item-1', task: 'Complete safety inspection', completed: false },
        { id: 'item-2', task: 'Submit photos', completed: true },
      ]
      vi.mocked(JobCompletionService.getChecklist).mockResolvedValue(mockChecklist)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/checklist')

      // Act
      const response = await GET(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(JobCompletionService.getChecklist).toHaveBeenCalledWith('job-123')
    })

    it('should return grouped checklist when grouped=true', async () => {
      // Arrange
      setupAuthenticatedUser()
      const mockGroupedChecklist = {
        'Pre-Work': [
          { id: 'item-1', task: 'Safety inspection', completed: false },
        ],
        'Completion': [
          { id: 'item-2', task: 'Submit photos', completed: true },
        ],
      }
      vi.mocked(JobCompletionService.getChecklistGrouped).mockResolvedValue(mockGroupedChecklist)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/checklist?grouped=true')

      // Act
      const response = await GET(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data['Pre-Work']).toBeDefined()
      expect(JobCompletionService.getChecklistGrouped).toHaveBeenCalledWith('job-123')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/checklist')

      // Act
      const response = await GET(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/jobs/[id]/checklist', () => {
    it('should initialize default checklist for a job', async () => {
      // Arrange
      setupAuthenticatedUser()
      const mockChecklist = [
        { id: 'item-1', task: 'Complete safety inspection', completed: false },
        { id: 'item-2', task: 'Set up containment', completed: false },
        { id: 'item-3', task: 'Submit final photos', completed: false },
      ]
      vi.mocked(JobCompletionService.initializeChecklist).mockResolvedValue(mockChecklist)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/checklist', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(Array.isArray(data)).toBe(true)
      expect(JobCompletionService.initializeChecklist).toHaveBeenCalledWith('job-123')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/checklist', {
        method: 'POST',
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
