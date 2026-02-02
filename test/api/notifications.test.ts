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
    organization_id: '550e8400-e29b-41d4-a716-446655440000',
    role: 'user'
  }

  const setupAuthenticatedUser = () => {
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
  }

  describe('GET /api/notifications', () => {
    it('should get all notifications', async () => {
      setupAuthenticatedUser()

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
      setupAuthenticatedUser()

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
      setupAuthenticatedUser()

      vi.mocked(NotificationService.getAll).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/notifications?limit=10')
      await GET(request)

      expect(NotificationService.getAll).toHaveBeenCalledWith(undefined, 10)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/notifications')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/notifications', () => {
    it('should create notification', async () => {
      setupAuthenticatedUser()

      const mockNotification = {
        id: 'notif-1',
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        type: 'job_assigned',
        title: 'New Job',
        message: 'You have been assigned a job'
      }

      vi.mocked(NotificationService.create).mockResolvedValue(mockNotification)

      const notificationData = {
        user_id: '550e8400-e29b-41d4-a716-446655440001',
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
        user_id: '550e8400-e29b-41d4-a716-446655440001',
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
