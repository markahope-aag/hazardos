import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/notifications/read-all/route'
import { NotificationService } from '@/lib/services/notification-service'

vi.mock('@/lib/services/notification-service', () => ({
  NotificationService: {
    markAllAsRead: vi.fn()
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
          log: { info: vi.fn() },
          requestId: 'test-id'
        }
        return await handler(request, mockContext, {}, {})
      }
    }
  }
})

describe('Notifications Read All API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should mark all notifications as read', async () => {
    vi.mocked(NotificationService.markAllAsRead).mockResolvedValue(undefined)
    const request = new NextRequest('http://localhost:3000/api/notifications/read-all', { method: 'POST' })
    const response = await POST(request)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(NotificationService.markAllAsRead).toHaveBeenCalled()
  })
})
