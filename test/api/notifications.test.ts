import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/notifications/route'
import { NotificationService } from '@/lib/services/notification-service'

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

vi.mock('@/lib/services/notification-service', () => ({
  NotificationService: {
    getAll: vi.fn(),
    getUnread: vi.fn(),
    create: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  describe('GET /api/notifications', () => {
    it('should get all notifications', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
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

      const mockNotifications = [
        { id: 'notif-1', title: 'New Job', message: 'Job assigned', is_read: false },
        { id: 'notif-2', title: 'Payment', message: 'Payment received', is_read: true }
      ]

      vi.mocked(NotificationService.getAll).mockResolvedValue(mockNotifications)

      const request = new NextRequest('http://localhost:3000/api/notifications')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockNotifications)
    })

    it('should get unread notifications only', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
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

      const mockUnread = [
        { id: 'notif-1', title: 'New Job', message: 'Job assigned', is_read: false }
      ]

      vi.mocked(NotificationService.getUnread).mockResolvedValue(mockUnread)

      const request = new NextRequest('http://localhost:3000/api/notifications?unread=true')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockUnread)
    })

    it('should respect limit parameter', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
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

      vi.mocked(NotificationService.getAll).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/notifications?limit=10')
      await GET(request)

      expect(NotificationService.getAll).toHaveBeenCalledWith(undefined, 10)
    })
  })

  describe('POST /api/notifications', () => {
    it('should create notification', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1', email: 'user@example.com' } },
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

      const mockNotification = {
        id: 'notif-1',
        user_id: 'user-2',
        type: 'job_assigned',
        title: 'New Job',
        message: 'You have been assigned a job'
      }

      vi.mocked(NotificationService.create).mockResolvedValue(mockNotification)

      const notificationData = {
        user_id: 'user-2',
        type: 'job_assigned',
        title: 'New Job',
        message: 'You have been assigned a job'
      }

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notificationData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual(mockNotification)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const notificationData = {
        user_id: 'user-2',
        type: 'job_assigned',
        title: 'New Job',
        message: 'Test'
      }

      const request = new NextRequest('http://localhost:3000/api/notifications', {
        method: 'POST',
        body: JSON.stringify(notificationData)
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })
})
