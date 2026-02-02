import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/notifications/[id]/read/route'
import { NotificationService } from '@/lib/services/notification-service'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/notification-service', () => ({
  NotificationService: {
    markAsRead: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Notification Mark Read API', () => {
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

  describe('POST /api/notifications/[id]/read', () => {
    it('should mark notification as read', async () => {
      setupAuthenticatedUser()

      vi.mocked(NotificationService.markAsRead).mockResolvedValue()

      const request = new NextRequest('http://localhost:3000/api/notifications/notif-123/read', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'notif-123' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(NotificationService.markAsRead).toHaveBeenCalledWith('notif-123')
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/notifications/notif-123/read', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'notif-123' } })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
    })

    it('should handle errors securely', async () => {
      setupAuthenticatedUser()

      vi.mocked(NotificationService.markAsRead).mockRejectedValue(
        new Error('Database error')
      )

      const request = new NextRequest('http://localhost:3000/api/notifications/notif-123/read', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'notif-123' } })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
      expect(data.type).toBe('INTERNAL_ERROR')
    })

    it('should accept valid UUID notification ID', async () => {
      setupAuthenticatedUser()

      vi.mocked(NotificationService.markAsRead).mockResolvedValue()

      const notificationId = '550e8400-e29b-41d4-a716-446655440001'
      const request = new NextRequest(`http://localhost:3000/api/notifications/${notificationId}/read`, {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: notificationId } })

      expect(response.status).toBe(200)
      expect(NotificationService.markAsRead).toHaveBeenCalledWith(notificationId)
    })

    it('should work for any notification belonging to user', async () => {
      setupAuthenticatedUser()

      vi.mocked(NotificationService.markAsRead).mockResolvedValue()

      const request = new NextRequest('http://localhost:3000/api/notifications/notif-456/read', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'notif-456' } })

      expect(response.status).toBe(200)
      expect(NotificationService.markAsRead).toHaveBeenCalledWith('notif-456')
    })
  })
})
