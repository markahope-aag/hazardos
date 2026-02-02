import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HubSpotService } from '@/lib/services/hubspot-service'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

// Mock fetch
global.fetch = vi.fn()

import { createClient } from '@/lib/supabase/server'

describe('HubSpotService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase)

    // Set environment variables
    process.env.HUBSPOT_CLIENT_ID = 'test_client_id'
    process.env.HUBSPOT_CLIENT_SECRET = 'test_client_secret'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  })

  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL', () => {
      const url = HubSpotService.getAuthorizationUrl('test-state-123')

      expect(url).toContain('app.hubspot.com/oauth/authorize')
      expect(url).toContain('client_id=test_client_id')
      expect(url).toContain('state=test-state-123')
      expect(url).toContain('response_type=code')
      expect(url).toContain('redirect_uri=')
    })

    it('should include required scopes', () => {
      const url = HubSpotService.getAuthorizationUrl('test-state')

      expect(url).toContain('crm.objects.contacts.read')
      expect(url).toContain('crm.objects.contacts.write')
      expect(url).toContain('crm.objects.deals.read')
      expect(url).toContain('crm.lists.read')
    })

    it('should URL encode parameters', () => {
      const url = HubSpotService.getAuthorizationUrl('state with spaces')

      // Check that spaces are properly encoded
      expect(url).toContain('state=state+with+spaces')
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('should exchange authorization code for tokens', async () => {
      const mockTokens = {
        access_token: 'access_123',
        refresh_token: 'refresh_123',
        expires_in: 3600,
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTokens,
      } as Response)

      const tokens = await HubSpotService.exchangeCodeForTokens('auth_code_123')

      expect(tokens.access_token).toBe('access_123')
      expect(tokens.refresh_token).toBe('refresh_123')
      expect(tokens.expires_in).toBe(3600)
    })

    it('should send correct parameters', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test', refresh_token: 'test', expires_in: 3600 }),
      } as Response)

      await HubSpotService.exchangeCodeForTokens('auth_code_123')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('oauth/v1/token'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        })
      )
    })

    it('should throw error on failed exchange', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        text: async () => 'Invalid code',
      } as Response)

      await expect(HubSpotService.exchangeCodeForTokens('bad_code')).rejects.toThrow(
        'Token exchange failed'
      )
    })
  })

  describe('refreshTokens', () => {
    it('should refresh access token', async () => {
      const mockTokens = {
        access_token: 'new_access_123',
        refresh_token: 'new_refresh_123',
        expires_in: 3600,
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTokens,
      } as Response)

      const tokens = await HubSpotService.refreshTokens('old_refresh_token')

      expect(tokens.access_token).toBe('new_access_123')
      expect(tokens.refresh_token).toBe('new_refresh_123')
    })

    it('should use refresh_token grant type', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ access_token: 'test', refresh_token: 'test', expires_in: 3600 }),
      } as Response)

      await HubSpotService.refreshTokens('refresh_token_123')

      const callArgs = vi.mocked(global.fetch).mock.calls[0]
      const body = callArgs[1]?.body as URLSearchParams

      expect(body.get('grant_type')).toBe('refresh_token')
      expect(body.get('refresh_token')).toBe('refresh_token_123')
    })

    it('should throw error on failed refresh', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        text: async () => 'Invalid refresh token',
      } as Response)

      await expect(HubSpotService.refreshTokens('bad_token')).rejects.toThrow(
        'Token refresh failed'
      )
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

      await HubSpotService.storeTokens(
        'org-123',
        {
          access_token: 'access_123',
          refresh_token: 'refresh_123',
          expires_in: 3600,
        },
        'portal_123'
      )

      expect(storedData.organization_id).toBe('org-123')
      expect(storedData.integration_type).toBe('hubspot')
      expect(storedData.access_token).toBe('access_123')
      expect(storedData.external_id).toBe('portal_123')
      expect(storedData.is_active).toBe(true)
    })

    it('should calculate correct expiration time', async () => {
      let storedData: any

      mockSupabase.from = vi.fn(() => ({
        upsert: vi.fn((data) => {
          storedData = data
          return Promise.resolve({ error: null })
        }),
      }))

      const now = Date.now()

      await HubSpotService.storeTokens(
        'org-123',
        {
          access_token: 'test',
          refresh_token: 'test',
          expires_in: 3600,
        },
        'portal_123'
      )

      const expiresAt = new Date(storedData.token_expires_at)
      const expectedExpiry = new Date(now + 3600 * 1000)

      // Should be within 1 second of expected
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(1000)
    })

    it('should set default integration settings', async () => {
      let storedData: any

      mockSupabase.from = vi.fn(() => ({
        upsert: vi.fn((data) => {
          storedData = data
          return Promise.resolve({ error: null })
        }),
      }))

      await HubSpotService.storeTokens(
        'org-123',
        { access_token: 'test', refresh_token: 'test', expires_in: 3600 },
        'portal_123'
      )

      expect(storedData.settings).toEqual({
        auto_sync_contacts: false,
        sync_companies: false,
        sync_deals: false,
      })
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
                  token_expires_at: new Date(Date.now() + 3600000).toISOString(),
                  external_id: 'portal_123',
                },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const status = await HubSpotService.getConnectionStatus('org-123')

      expect(status.connected).toBe(true)
      expect(status.portal_id).toBe('portal_123')
    })

    it('should return disconnected when no integration found', async () => {
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

      const status = await HubSpotService.getConnectionStatus('org-123')

      expect(status.connected).toBe(false)
      expect(status.portal_id).toBeUndefined()
    })

    it('should detect expired token', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  is_active: true,
                  token_expires_at: new Date(Date.now() - 1000).toISOString(),
                  external_id: 'portal_123',
                },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const status = await HubSpotService.getConnectionStatus('org-123')

      expect(status.connected).toBe(true) // Still connected, but...
      expect(status.needs_refresh).toBe(true) // Needs refresh
    })
  })

  describe('syncContact', () => {
    it('should create contact in HubSpot', async () => {
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
        json: async () => ({ id: 'hs_contact_123' }),
      } as Response)

      const result = await HubSpotService.syncContact('org-123', {
        email: 'test@example.com',
        firstname: 'John',
        lastname: 'Doe',
        phone: '555-1234',
      })

      expect(result.id).toBe('hs_contact_123')
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
        json: async () => ({ id: 'contact_123' }),
      } as Response)

      await HubSpotService.syncContact('org-123', {
        email: 'test@example.com',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.hubapi.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer access_123',
          }),
        })
      )
    })

    it('should throw error when not connected', async () => {
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
        HubSpotService.syncContact('org-123', { email: 'test@example.com' })
      ).rejects.toThrow()
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

      await HubSpotService.disconnect('org-123')

      expect(updateCalled).toBe(true)
    })

    it('should set is_active to false', async () => {
      let updatedData: any

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn((data) => {
          updatedData = data
          return {
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }),
      }))

      await HubSpotService.disconnect('org-123')

      expect(updatedData.is_active).toBe(false)
    })
  })
})
