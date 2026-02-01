import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/notifications/count/route'
import { NotificationService } from '@/lib/services/notification-service'

vi.mock('@/lib/services/notification-service', () => ({
  NotificationService: {
    getUnreadCount: vi.fn()
  }
}))

vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    createApiHandler: (options: any, handler: any) => {
      return async (request: any) => {
        const mockContext = {
          user: { id: 'user-123' },
          profile: { organization_id: 'org-123', role: 'user' },
          log: { info: vi.fn(), error: vi.fn() },
          requestId: 'test-id'
        }
        return await handler(request, mockContext, {}, {})
      }
    }
  }
})

describe('Notifications Count API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get unread notification count', async () => {
    vi.mocked(NotificationService.getUnreadCount).mockResolvedValue(5)
    const request = new NextRequest('http://localhost:3000/api/notifications/count')
    const response = await GET(request)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.count).toBe(5)
  })

  it('should return zero when no unread notifications', async () => {
    vi.mocked(NotificationService.getUnreadCount).mockResolvedValue(0)
    const request = new NextRequest('http://localhost:3000/api/notifications/count')
    const response = await GET(request)
    const data = await response.json()
    expect(data.count).toBe(0)
  })
})
