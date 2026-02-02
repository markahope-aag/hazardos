import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GoogleCalendarService } from '@/lib/services/google-calendar-service'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

global.fetch = vi.fn()

import { createClient } from '@/lib/supabase/server'

describe('GoogleCalendarService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase)

    process.env.GOOGLE_CLIENT_ID = 'test_client_id'
    process.env.GOOGLE_CLIENT_SECRET = 'test_secret'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  })

  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL', () => {
      const url = GoogleCalendarService.getAuthorizationUrl('test-state')

      expect(url).toContain('accounts.google.com/o/oauth2/v2/auth')
      expect(url).toContain('client_id=test_client_id')
      expect(url).toContain('state=test-state')
      expect(url).toContain('access_type=offline')
    })

    it('should include calendar scope', () => {
      const url = GoogleCalendarService.getAuthorizationUrl('test-state')

      expect(url).toContain('calendar.events')
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens', async () => {
      const mockTokens = {
        access_token: 'access_123',
        refresh_token: 'refresh_123',
        expires_in: 3600,
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTokens,
      } as Response)

      const tokens = await GoogleCalendarService.exchangeCodeForTokens('code_123')

      expect(tokens.access_token).toBe('access_123')
      expect(tokens.refresh_token).toBe('refresh_123')
    })

    it('should send correct parameters', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test', expires_in: 3600 }),
      } as Response)

      await GoogleCalendarService.exchangeCodeForTokens('code_123')

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const body = JSON.parse(callArgs[1]?.body as string)

      expect(body.grant_type).toBe('authorization_code')
      expect(body.code).toBe('code_123')
    })
  })

  describe('refreshTokens', () => {
    it('should refresh access token', async () => {
      const mockTokens = {
        access_token: 'new_access_123',
        expires_in: 3600,
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTokens,
      } as Response)

      const tokens = await GoogleCalendarService.refreshTokens('refresh_token_123')

      expect(tokens.access_token).toBe('new_access_123')
    })

    it('should throw on failed refresh', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        text: async () => 'Error',
      } as Response)

      await expect(GoogleCalendarService.refreshTokens('bad_token')).rejects.toThrow()
    })
  })

  describe('storeTokens', () => {
    it('should store tokens in database', async () => {
      let storedData: any

      mockSupabase.from = vi.fn(() => ({
        upsert: vi.fn((data) => {
          storedData = data
          return Promise.resolve({ error: null })
        }),
      }))

      await GoogleCalendarService.storeTokens('org-123', {
        access_token: 'access_123',
        refresh_token: 'refresh_123',
        expires_in: 3600,
      })

      expect(storedData.organization_id).toBe('org-123')
      expect(storedData.integration_type).toBe('google_calendar')
      expect(storedData.access_token).toBe('access_123')
    })

    it('should set correct expiration time', async () => {
      let storedData: any

      mockSupabase.from = vi.fn(() => ({
        upsert: vi.fn((data) => {
          storedData = data
          return Promise.resolve({ error: null })
        }),
      }))

      const now = Date.now()

      await GoogleCalendarService.storeTokens('org-123', {
        access_token: 'test',
        refresh_token: 'test',
        expires_in: 3600,
      })

      const expiresAt = new Date(storedData.token_expires_at)
      const expectedExpiry = new Date(now + 3600 * 1000)

      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000)
    })
  })

  describe('getConnectionStatus', () => {
    it('should return connected status', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { is_active: true },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const status = await GoogleCalendarService.getConnectionStatus('org-123')

      expect(status.connected).toBe(true)
    })

    it('should return disconnected when not found', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            })),
          })),
        })),
      }))

      const status = await GoogleCalendarService.getConnectionStatus('org-123')

      expect(status.connected).toBe(false)
    })
  })

  describe('createEvent', () => {
    it('should create calendar event', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { access_token: 'access_123' },
                error: null,
              }),
            })),
          })),
        })),
      }))

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'event_123',
          summary: 'Test Event',
        }),
      } as Response)

      const event = await GoogleCalendarService.createEvent('org-123', {
        summary: 'Test Event',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
      })

      expect(event.id).toBe('event_123')
    })

    it('should use correct API endpoint', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { access_token: 'access_123' },
                error: null,
              }),
            })),
          })),
        })),
      }))

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      } as Response)

      await GoogleCalendarService.createEvent('org-123', {
        summary: 'Test',
        start: { dateTime: '2026-02-01T10:00:00Z' },
        end: { dateTime: '2026-02-01T11:00:00Z' },
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('www.googleapis.com/calendar/v3/calendars'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer access_123',
          }),
        })
      )
    })

    it('should throw when not connected', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            })),
          })),
        })),
      }))

      await expect(
        GoogleCalendarService.createEvent('org-123', {
          summary: 'Test',
          start: { dateTime: '2026-02-01T10:00:00Z' },
          end: { dateTime: '2026-02-01T11:00:00Z' },
        })
      ).rejects.toThrow()
    })
  })

  describe('updateEvent', () => {
    it('should update calendar event', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { access_token: 'access_123' },
                error: null,
              }),
            })),
          })),
        })),
      }))

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'event_123',
          summary: 'Updated Event',
        }),
      } as Response)

      const event = await GoogleCalendarService.updateEvent('org-123', 'event_123', {
        summary: 'Updated Event',
      })

      expect(event.summary).toBe('Updated Event')
    })
  })

  describe('deleteEvent', () => {
    it('should delete calendar event', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { access_token: 'access_123' },
                error: null,
              }),
            })),
          })),
        })),
      }))

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
      } as Response)

      await GoogleCalendarService.deleteEvent('org-123', 'event_123')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/events/event_123'),
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('disconnect', () => {
    it('should deactivate integration', async () => {
      let updateCalled = false

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => {
          updateCalled = true
          return {
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }),
      }))

      await GoogleCalendarService.disconnect('org-123')

      expect(updateCalled).toBe(true)
    })
  })
})
