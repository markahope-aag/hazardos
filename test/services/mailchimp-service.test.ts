import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MailchimpService } from '@/lib/services/mailchimp-service'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

global.fetch = vi.fn()

import { createClient } from '@/lib/supabase/server'

describe('MailchimpService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockSupabase = {
      from: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase)

    process.env.MAILCHIMP_CLIENT_ID = 'test_client_id'
    process.env.MAILCHIMP_CLIENT_SECRET = 'test_secret'
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
  })

  describe('getAuthorizationUrl', () => {
    it('should generate correct authorization URL', () => {
      const url = MailchimpService.getAuthorizationUrl('test-state')

      expect(url).toContain('mailchimp.com/oauth2/authorize')
      expect(url).toContain('client_id=test_client_id')
      expect(url).toContain('state=test-state')
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens', async () => {
      const mockTokens = {
        access_token: 'access_123',
        expires_in: 3600,
      }

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockTokens,
      } as Response)

      const tokens = await MailchimpService.exchangeCodeForTokens('code_123')

      expect(tokens.access_token).toBe('access_123')
    })

    it('should throw on failed exchange', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        text: async () => 'Error',
      } as Response)

      await expect(MailchimpService.exchangeCodeForTokens('bad_code')).rejects.toThrow()
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

      await MailchimpService.storeTokens('org-123', {
        access_token: 'access_123',
        expires_in: 3600,
      }, {
        dc: 'us1',
        accountname: 'Test Account',
        api_endpoint: 'https://us1.api.mailchimp.com/3.0'
      })

      expect(storedData.organization_id).toBe('org-123')
      expect(storedData.integration_type).toBe('mailchimp')
      expect(storedData.access_token).toBe('access_123')
      expect(storedData.external_id).toBe('us1')
      expect(storedData.settings.account_name).toBe('Test Account')
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
                  external_id: 'us1',
                  settings: { account_name: 'Test Account' },
                  last_sync_at: '2026-01-01T00:00:00Z'
                },
                error: null,
              }),
            })),
          })),
        })),
      }))

      const status = await MailchimpService.getConnectionStatus('org-123')

      expect(status.is_connected).toBe(true)
      expect(status.account_name).toBe('Test Account')
      expect(status.data_center).toBe('us1')
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

      const status = await MailchimpService.getConnectionStatus('org-123')

      expect(status.is_connected).toBe(false)
    })
  })

  describe('getLists', () => {
    it('should fetch audience lists', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    access_token: 'access_123',
                    external_id: 'us1',
                    settings: { api_endpoint: 'https://us1.api.mailchimp.com/3.0' }
                  },
                  error: null,
                }),
              })),
            })),
          })),
        })),
      }))

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          lists: [
            { id: 'list_1', name: 'Newsletter', stats: { member_count: 100 } },
            { id: 'list_2', name: 'Customers', stats: { member_count: 50 } },
          ],
        }),
      } as Response)

      const lists = await MailchimpService.getLists('org-123')

      expect(lists).toHaveLength(2)
      expect(lists[0].name).toBe('Newsletter')
      expect(lists[0].member_count).toBe(100)
    })
  })

  describe('syncContact', () => {
    it('should sync customer to Mailchimp list', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'organization_integrations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  eq: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: {
                        access_token: 'access_123',
                        external_id: 'us1',
                        settings: { api_endpoint: 'https://us1.api.mailchimp.com/3.0' }
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

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'member_123', status: 'subscribed' }),
      } as Response)

      const result = await MailchimpService.syncContact('org-123', 'cust-1', 'list_1')

      expect(result).toBe('member_123')
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

      await MailchimpService.disconnect('org-123')

      expect(updateCalled).toBe(true)
    })
  })
})
