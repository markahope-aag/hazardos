import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, DELETE } from '@/app/api/jobs/[id]/notes/route'

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

vi.mock('@/lib/services/jobs-service', () => ({
  JobsService: {
    addNote: vi.fn(),
    deleteNote: vi.fn(),
  },
}))

import { JobsService } from '@/lib/services/jobs-service'

describe('Job Notes API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth mock - authenticated user
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
  })

  describe('POST /api/jobs/[id]/notes', () => {
    it('should add a note to a job', async () => {
      // Arrange
      const newNote = {
        id: 'note-123',
        job_id: 'job-123',
        content: 'Important note about safety',
        created_by: 'user-123',
        created_at: new Date().toISOString(),
      }
      vi.mocked(JobsService.addNote).mockResolvedValue(newNote)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Important note about safety',
        }),
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.content).toBe('Important note about safety')
      expect(JobsService.addNote).toHaveBeenCalledWith('job-123', {
        content: 'Important note about safety',
      })
    })

    it('should add a note with visibility setting', async () => {
      // Arrange
      const newNote = {
        id: 'note-123',
        job_id: 'job-123',
        content: 'Internal note',
        is_internal: true,
      }
      vi.mocked(JobsService.addNote).mockResolvedValue(newNote)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'Internal note',
          is_internal: true,
        }),
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data.is_internal).toBe(true)
    })

    it('should reject note without content', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(400)
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Test note' }),
      })

      // Act
      const response = await POST(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/jobs/[id]/notes', () => {
    it('should delete a note from a job', async () => {
      // Arrange
      vi.mocked(JobsService.deleteNote).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_id: 'note-123',
        }),
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(JobsService.deleteNote).toHaveBeenCalledWith('note-123')
    })

    it('should reject deletion without note_id', async () => {
      // Arrange
      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(400)
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/jobs/job-123/notes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_id: 'note-123' }),
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'job-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
