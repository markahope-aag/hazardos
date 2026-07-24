import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/notifications/preferences/route'
import { NotificationService } from '@/lib/services/notification-service'
import type { NotificationPreference } from '@/types/notifications'

const createMockPreference = (overrides: Partial<NotificationPreference> = {}): NotificationPreference => ({
  id: 'pref-1',
  user_id: 'user-123',
  organization_id: 'org-123',
  notification_type: 'job_assigned',
  in_app: true,
  email: true,
  push: false,
  created_at: '2026-03-01T10:00:00Z',
  updated_at: '2026-03-01T10:00:00Z',
  ...overrides
})

vi.mock('@/lib/services/notification-service', () => ({
  NotificationService: {
    getPreferences: vi.fn(),
    updatePreference: vi.fn()
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
          profile: { organization_id: 'org-123', role: 'admin' },
          log: { info: vi.fn() },
          requestId: 'test-id'
        }
        let body = {}
        if (options.bodySchema && request.method === 'PATCH') {
          try { body = await request.json() } catch {}
        }
        return await handler(request, mockContext, body, {})
      }
    }
  }
})

describe('Notifications Preferences API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/notifications/preferences', () => {
    it('should get notification preferences', async () => {
      const mockPrefs = [
        createMockPreference({ id: 'pref-1', notification_type: 'job_assigned', in_app: true, email: true, push: false }),
        createMockPreference({ id: 'pref-2', notification_type: 'job_completed', in_app: true, email: false, push: false })
      ]
      vi.mocked(NotificationService.getPreferences).mockResolvedValue(mockPrefs)
      const request = new NextRequest('http://localhost:3000/api/notifications/preferences')
      const response = await GET(request)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
    })
  })

  describe('PATCH /api/notifications/preferences', () => {
    it('should update notification preference', async () => {
      const mockPref = createMockPreference({ notification_type: 'job_assigned', in_app: true, email: false, push: true })
      vi.mocked(NotificationService.updatePreference).mockResolvedValue(mockPref)
      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notification_type: 'job_assigned', in_app: true, email: false, push: true })
      })
      const response = await PATCH(request)
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.email).toBe(false)
      expect(data.push).toBe(true)
    })
  })
})
