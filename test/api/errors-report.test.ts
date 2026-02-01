import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/errors/report/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn()
  }
}))

import { logger } from '@/lib/utils/logger'

describe('Error Report API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/errors/report', () => {
    it('should log client-side errors', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-123', email: 'test@example.com' } },
        error: null
      })

      const errorPayload = {
        name: 'TypeError',
        message: 'Cannot read property of undefined',
        stack: 'Error: Cannot read property\n  at Component.tsx:42',
        componentStack: 'at Dashboard\n  at App',
        context: { page: '/dashboard' },
        userAgent: 'Mozilla/5.0',
        url: 'https://app.example.com/dashboard',
        timestamp: new Date().toISOString()
      }

      const request = new NextRequest('http://localhost:3000/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorPayload)
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            name: 'TypeError',
            message: 'Cannot read property of undefined'
          }),
          userId: 'user-123'
        }),
        'Client-side error reported'
      )
    })

    it('should handle errors from unauthenticated users', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const errorPayload = {
        name: 'NetworkError',
        message: 'Failed to fetch',
        timestamp: new Date().toISOString()
      }

      const request = new NextRequest('http://localhost:3000/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorPayload)
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(logger.error).toHaveBeenCalled()
    })

    it('should return 400 if name is missing', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/errors/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Error occurred',
          timestamp: new Date().toISOString()
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBeTruthy()
    })
  })
})
