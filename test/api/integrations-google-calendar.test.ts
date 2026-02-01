import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/integrations/google-calendar/connect/route'
import { POST as DisconnectPOST } from '@/app/api/integrations/google-calendar/disconnect/route'
import { POST as SyncPOST } from '@/app/api/integrations/google-calendar/sync/route'
import { GoogleCalendarService } from '@/lib/services/google-calendar-service'

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

vi.mock('@/lib/services/google-calendar-service', () => ({
  GoogleCalendarService: {
    getAuthorizationUrl: vi.fn(),
    disconnect: vi.fn(),
    syncJobToCalendar: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Google Calendar Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  describe('GET /api/integrations/google-calendar/connect', () => {
    it('should return OAuth authorization URL', async () => {
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

      const authUrl = 'https://accounts.google.com/o/oauth2/auth?...'
      vi.mocked(GoogleCalendarService.getAuthorizationUrl).mockReturnValue(authUrl)

      const request = new NextRequest('http://localhost:3000/api/integrations/google-calendar/connect')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.url).toBe(authUrl)
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/integrations/google-calendar/connect')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/integrations/google-calendar/disconnect', () => {
    it('should disconnect Google Calendar', async () => {
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

      vi.mocked(GoogleCalendarService.disconnect).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/integrations/google-calendar/disconnect', {
        method: 'POST'
      })
      const response = await DisconnectPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(GoogleCalendarService.disconnect).toHaveBeenCalledWith('org-123')
    })
  })

  describe('POST /api/integrations/google-calendar/sync', () => {
    it('should sync job to Google Calendar', async () => {
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

      const eventId = 'gcal-event-123'
      vi.mocked(GoogleCalendarService.syncJobToCalendar).mockResolvedValue(eventId)

      const syncData = {
        job_id: '550e8400-e29b-41d4-a716-446655440000'
      }

      const request = new NextRequest('http://localhost:3000/api/integrations/google-calendar/sync', {
        method: 'POST',
        body: JSON.stringify(syncData)
      })
      const response = await SyncPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.event_id).toBe(eventId)
    })

    it('should validate job_id is UUID', async () => {
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

      const syncData = {
        job_id: 'invalid-uuid'
      }

      const request = new NextRequest('http://localhost:3000/api/integrations/google-calendar/sync', {
        method: 'POST',
        body: JSON.stringify(syncData)
      })
      const response = await SyncPOST(request)

      expect(response.status).toBe(400)
    })
  })
})
