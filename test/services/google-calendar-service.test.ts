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
        json: async () => ({ access_token: 'test', refresh_token: 'test', expires_in: 3600 }),
      } as Response)

      await GoogleCalendarService.exchangeCodeForTokens('code_123')

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const body = new URLSearchParams(callArgs[1]?.body as string)

      expect(body.get('grant_type')).toBe('authorization_code')
      expect(body.get('code')).toBe('code_123')
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
                data: {
                  is_active: true,
                  external_id: 'test@example.com',
                  last_sync_at: '2026-01-01T00:00:00Z'
                },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const status = await GoogleCalendarService.getConnectionStatus('org-123')

      expect(status.is_connected).toBe(true)
      expect(status.email).toBe('test@example.com')
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

      expect(status.is_connected).toBe(false)
    })
  })

  describe('storeTokens', () => {
    it('should store tokens with email', async () => {
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
      }, 'test@example.com')

      expect(storedData.organization_id).toBe('org-123')
      expect(storedData.integration_type).toBe('google_calendar')
      expect(storedData.access_token).toBe('access_123')
      expect(storedData.external_id).toBe('test@example.com')
      expect(storedData.settings.email).toBe('test@example.com')
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
