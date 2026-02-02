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
      })

      expect(storedData.organization_id).toBe('org-123')
      expect(storedData.integration_type).toBe('mailchimp')
      expect(storedData.access_token).toBe('access_123')
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

      const status = await MailchimpService.getConnectionStatus('org-123')

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

      const status = await MailchimpService.getConnectionStatus('org-123')

      expect(status.connected).toBe(false)
    })
  })

  describe('getLists', () => {
    it('should fetch audience lists', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { access_token: 'access_123', external_id: 'dc1' },
                error: null,
              }),
            })),
          })),
        })),
      }))

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          lists: [
            { id: 'list_1', name: 'Newsletter' },
            { id: 'list_2', name: 'Customers' },
          ],
        }),
      } as Response)

      const lists = await MailchimpService.getLists('org-123')

      expect(lists).toHaveLength(2)
      expect(lists[0].name).toBe('Newsletter')
    })
  })

  describe('addSubscriber', () => {
    it('should add subscriber to list', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { access_token: 'access_123', external_id: 'dc1' },
                error: null,
              }),
            })),
          })),
        })),
      }))

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'member_123', status: 'subscribed' }),
      } as Response)

      const result = await MailchimpService.addSubscriber('org-123', 'list_1', {
        email_address: 'test@example.com',
        status: 'subscribed',
      })

      expect(result.status).toBe('subscribed')
    })

    it('should use correct API endpoint', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { access_token: 'access_123', external_id: 'dc1' },
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

      await MailchimpService.addSubscriber('org-123', 'list_1', {
        email_address: 'test@example.com',
        status: 'subscribed',
      })

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('dc1.api.mailchimp.com'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer access_123',
          }),
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

      await MailchimpService.disconnect('org-123')

      expect(updateCalled).toBe(true)
    })
  })
})
