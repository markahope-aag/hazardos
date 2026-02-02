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
      let callCount = 0

      // Mock both calls to from() - one for getConnectionStatus, one for getValidTokens
      mockSupabase.from = vi.fn((table) => {
        callCount++
        if (table === 'organization_integrations') {
          if (callCount === 1) {
            // First call from getConnectionStatus
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: 'int-1',
                        is_active: true,
                        external_id: 'portal_123',
                        last_sync_at: '2026-01-01T00:00:00Z'
                      },
                      error: null,
                    }),
                  })),
                })),
              })),
            }
          } else {
            // Second call from getValidTokens
            return {
              select: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    eq: vi.fn(() => ({
                      single: vi.fn().mockResolvedValue({
                        data: {
                          id: 'int-1',
                          access_token: 'access_123',
                          refresh_token: 'refresh_123',
                          token_expires_at: new Date(Date.now() + 3600000).toISOString(),
                          external_id: 'portal_123',
                        },
                        error: null,
                      }),
                    })),
                  })),
                })),
              })),
            }
          }
        }
        return {}
      })

      // Mock the API call for account info
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ portalId: 12345 }),
      } as Response)

      const status = await HubSpotService.getConnectionStatus('org-123')

      expect(status.is_connected).toBe(true)
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

      expect(status.is_connected).toBe(false)
      expect(status.portal_id).toBeUndefined()
    })

    it('should return disconnected when not active', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  is_active: false,
                  external_id: 'portal_123',
                },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const status = await HubSpotService.getConnectionStatus('org-123')

      expect(status.is_connected).toBe(false)
    })
  })

  describe('syncContact', () => {
    it('should sync customer to HubSpot', async () => {
      let fetchCallCount = 0

      mockSupabase.from = vi.fn((table) => {
        if (table === 'organization_integrations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        id: 'int-1',
                        access_token: 'access_123',
                        refresh_token: 'refresh_123',
                        token_expires_at: new Date(Date.now() + 3600000).toISOString(),
                        external_id: 'portal_123'
                      },
                      error: null,
                    }),
                  })),
                })),
              })),
            })),
          }
        }
        if (table === 'customers') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'cust-1',
                    email: 'test@example.com',
                    first_name: 'John',
                    last_name: 'Doe',
                    phone: '555-1234',
                    hubspot_id: null
                  },
                  error: null,
                }),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }
        if (table === 'marketing_sync_log') {
          return {
            insert: vi.fn().mockResolvedValue({ error: null }),
          }
        }
        return {}
      })

      vi.mocked(global.fetch).mockImplementation(async () => {
        fetchCallCount++
        if (fetchCallCount === 1) {
          // First call is search
          return {
            ok: true,
            json: async () => ({ results: [] }),
          } as Response
        } else {
          // Second call is create
          return {
            ok: true,
            json: async () => ({ id: 'hs_contact_123' }),
          } as Response
        }
      })

      const result = await HubSpotService.syncContact('org-123', 'cust-1')

      expect(result).toBe('hs_contact_123')
    })

    it('should throw error when not connected', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              })),
            })),
          })),
        })),
      }))

      await expect(
        HubSpotService.syncContact('org-123', 'cust-1')
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
