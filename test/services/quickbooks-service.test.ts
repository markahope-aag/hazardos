import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QuickBooksService } from '@/lib/services/quickbooks-service'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock createClient from supabase
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn()
  }
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

describe('QuickBooksService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.QBO_CLIENT_ID = 'test-client-id'
    process.env.QBO_CLIENT_SECRET = 'test-client-secret'
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    process.env.QBO_ENVIRONMENT = 'sandbox'
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('getAuthorizationUrl', () => {
    it('should generate authorization URL with correct parameters', () => {
      const state = 'test-state-123'
      const url = QuickBooksService.getAuthorizationUrl(state)

      expect(url).toContain('https://appcenter.intuit.com/connect/oauth2')
      expect(url).toContain('client_id=test-client-id')
      expect(url).toContain('response_type=code')
      expect(url).toContain('state=test-state-123')
      expect(url).toContain('redirect_uri=https%3A%2F%2Fexample.com%2Fapi%2Fintegrations%2Fquickbooks%2Fcallback')
    })

    it('should include required scopes', () => {
      const state = 'test-state'
      const url = QuickBooksService.getAuthorizationUrl(state)

      expect(url).toContain('scope=com.intuit.quickbooks.accounting')
      expect(url).toContain('openid')
      expect(url).toContain('profile')
      expect(url).toContain('email')
    })
  })

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens
      })

      const result = await QuickBooksService.exchangeCodeForTokens('auth-code-123')

      expect(result).toEqual(mockTokens)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded'
          })
        })
      )
    })

    it('should throw error when token exchange fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => 'Invalid code'
      })

      await expect(
        QuickBooksService.exchangeCodeForTokens('invalid-code')
      ).rejects.toThrow('Token exchange failed')
    })

    it('should include authorization header with base64 encoded credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600
        })
      })

      await QuickBooksService.exchangeCodeForTokens('code')

      const authHeader = mockFetch.mock.calls[0][1].headers.Authorization
      expect(authHeader).toContain('Basic ')
    })
  })

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const mockTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokens
      })

      const result = await QuickBooksService.refreshTokens('old-refresh-token')

      expect(result).toEqual(mockTokens)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('grant_type=refresh_token')
        })
      )
    })

    it('should throw error when refresh fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false
      })

      await expect(
        QuickBooksService.refreshTokens('invalid-token')
      ).rejects.toThrow('Token refresh failed')
    })
  })

  describe('storeTokens', () => {
    it('should store tokens in database successfully', async () => {
      const mockUpsert = vi.fn().mockReturnThis()

      mockSupabaseClient.from.mockReturnValue({
        upsert: mockUpsert
      })

      await QuickBooksService.storeTokens(
        'org-123',
        {
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          expires_in: 3600
        },
        'realm-456'
      )

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_integrations')
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-123',
          integration_type: 'quickbooks',
          access_token: 'access-token',
          refresh_token: 'refresh-token',
          external_id: 'realm-456',
          is_active: true
        }),
        { onConflict: 'organization_id,integration_type' }
      )
    })

    it('should calculate token expiration time correctly', async () => {
      const mockUpsert = vi.fn().mockReturnThis()
      mockSupabaseClient.from.mockReturnValue({
        upsert: mockUpsert
      })

      const beforeTime = Date.now()
      await QuickBooksService.storeTokens(
        'org-123',
        {
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 3600
        },
        'realm-456'
      )
      const afterTime = Date.now()

      const callArgs = mockUpsert.mock.calls[0][0]
      const expiresAt = new Date(callArgs.token_expires_at).getTime()

      // Should be approximately 1 hour from now
      expect(expiresAt).toBeGreaterThan(beforeTime + 3599000)
      expect(expiresAt).toBeLessThan(afterTime + 3601000)
    })
  })

  describe('getValidTokens', () => {
    it('should return valid tokens when not expired', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            access_token: 'valid-token',
            refresh_token: 'refresh-token',
            token_expires_at: futureDate,
            external_id: 'realm-123',
            is_active: true
          }
        })
      })

      const result = await QuickBooksService.getValidTokens('org-123')

      expect(result).toEqual({
        access_token: 'valid-token',
        realmId: 'realm-123'
      })
    })

    it('should return null when no integration found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null })
      })

      const result = await QuickBooksService.getValidTokens('org-123')

      expect(result).toBeNull()
    })

    it('should refresh tokens when expired', async () => {
      const expiredDate = new Date(Date.now() - 1000).toISOString()

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            access_token: 'expired-token',
            refresh_token: 'refresh-token',
            token_expires_at: expiredDate,
            external_id: 'realm-123',
            is_active: true
          }
        }),
        upsert: vi.fn().mockReturnThis()
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: 'new-token',
          refresh_token: 'new-refresh',
          expires_in: 3600
        })
      })

      const result = await QuickBooksService.getValidTokens('org-123')

      expect(result).toEqual({
        access_token: 'new-token',
        realmId: 'realm-123'
      })
      expect(mockFetch).toHaveBeenCalled()
    })

    it('should disconnect when token refresh fails', async () => {
      const expiredDate = new Date(Date.now() - 1000).toISOString()

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            access_token: 'expired-token',
            refresh_token: 'invalid-refresh',
            token_expires_at: expiredDate,
            external_id: 'realm-123',
            is_active: true
          }
        }),
        update: vi.fn().mockReturnThis()
      })

      mockFetch.mockResolvedValueOnce({
        ok: false
      })

      const result = await QuickBooksService.getValidTokens('org-123')

      expect(result).toBeNull()
    })
  })

  describe('getConnectionStatus', () => {
    it('should return connected status when active', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'int-1',
            external_id: 'realm-123',
            is_active: true,
            last_sync_at: '2024-01-01T00:00:00Z',
            access_token: 'token',
            refresh_token: 'refresh',
            token_expires_at: futureDate
          }
        })
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          CompanyInfo: {
            CompanyName: 'Test Company'
          }
        })
      })

      const status = await QuickBooksService.getConnectionStatus('org-123')

      expect(status.is_connected).toBe(true)
      expect(status.realm_id).toBe('realm-123')
    })

    it('should return disconnected when no integration found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null })
      })

      const status = await QuickBooksService.getConnectionStatus('org-123')

      expect(status.is_connected).toBe(false)
    })

    it('should return disconnected when not active', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            is_active: false
          }
        })
      })

      const status = await QuickBooksService.getConnectionStatus('org-123')

      expect(status.is_connected).toBe(false)
    })
  })

  describe('disconnect', () => {
    it('should deactivate integration and clear tokens', async () => {
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()

      mockSupabaseClient.from.mockReturnValue({
        update: mockUpdate,
        eq: mockEq
      })

      await QuickBooksService.disconnect('org-123')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('organization_integrations')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          is_active: false,
          access_token: null,
          refresh_token: null
        })
      )
      expect(mockEq).toHaveBeenCalledWith('organization_id', 'org-123')
      expect(mockEq).toHaveBeenCalledWith('integration_type', 'quickbooks')
    })
  })

  describe('makeRequest', () => {
    it('should make authenticated request to QuickBooks API', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            access_token: 'valid-token',
            token_expires_at: futureDate,
            external_id: 'realm-123',
            is_active: true
          }
        })
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: 'success' })
      })

      const result = await QuickBooksService.makeRequest('org-123', '/test')

      expect(result).toEqual({ result: 'success' })
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v3/company/realm-123/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer valid-token',
            'Accept': 'application/json'
          })
        })
      )
    })

    it('should throw error when not connected', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null })
      })

      await expect(
        QuickBooksService.makeRequest('org-123', '/test')
      ).rejects.toThrow('QuickBooks not connected')
    })

    it('should handle POST requests with body', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            access_token: 'valid-token',
            token_expires_at: futureDate,
            external_id: 'realm-123',
            is_active: true
          }
        })
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ created: true })
      })

      const body = { name: 'Test' }
      await QuickBooksService.makeRequest('org-123', '/create', 'POST', body)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body)
        })
      )
    })

    it('should throw error on API failure', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            access_token: 'valid-token',
            token_expires_at: futureDate,
            external_id: 'realm-123',
            is_active: true
          }
        })
      })

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request'
      })

      await expect(
        QuickBooksService.makeRequest('org-123', '/test')
      ).rejects.toThrow('QuickBooks API error')
    })
  })

  describe('syncCustomerToQBO', () => {
    it('should create new customer in QuickBooks', async () => {
      const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      // Mock getValidTokens
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'organization_integrations') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                access_token: 'token',
                token_expires_at: futureDate,
                external_id: 'realm-123',
                is_active: true
              }
            })
          }
        }
        if (table === 'customers') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'cust-1',
                first_name: 'John',
                last_name: 'Doe',
                email: 'john@example.com',
                phone: '555-1234',
                qb_customer_id: null
              }
            }),
            update: vi.fn().mockReturnThis()
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis()
        }
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          Customer: { Id: 'qb-123' }
        })
      })

      const result = await QuickBooksService.syncCustomerToQBO('org-123', 'cust-1')

      expect(result).toBe('qb-123')
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/customer'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('John')
        })
      )
    })
  })

  describe('logSync', () => {
    it('should log sync results successfully', async () => {
      const mockInsert = vi.fn().mockReturnThis()
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'integration_sync_log') {
          return { insert: mockInsert }
        }
        return {
          update: mockUpdate,
          eq: mockEq
        }
      })

      await QuickBooksService.logSync('org-123', 'customers', 'push', {
        processed: 10,
        succeeded: 8,
        failed: 2,
        errors: [{ entity_id: 'e1', entity_type: 'customer', error: 'Failed' }]
      })

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-123',
          integration_type: 'quickbooks',
          sync_type: 'customers',
          direction: 'push',
          status: 'partial',
          records_processed: 10,
          records_succeeded: 8,
          records_failed: 2
        })
      )
    })

    it('should mark sync as success when no failures', async () => {
      const mockInsert = vi.fn().mockReturnThis()
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'integration_sync_log') {
          return { insert: mockInsert }
        }
        return {
          update: mockUpdate,
          eq: mockEq
        }
      })

      await QuickBooksService.logSync('org-123', 'customers', 'push', {
        processed: 10,
        succeeded: 10,
        failed: 0,
        errors: []
      })

      const callArgs = mockInsert.mock.calls[0][0]
      expect(callArgs.status).toBe('success')
    })

    it('should mark sync as failed when all fail', async () => {
      const mockInsert = vi.fn().mockReturnThis()
      const mockUpdate = vi.fn().mockReturnThis()
      const mockEq = vi.fn().mockReturnThis()

      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'integration_sync_log') {
          return { insert: mockInsert }
        }
        return {
          update: mockUpdate,
          eq: mockEq
        }
      })

      await QuickBooksService.logSync('org-123', 'customers', 'push', {
        processed: 10,
        succeeded: 0,
        failed: 10,
        errors: []
      })

      const callArgs = mockInsert.mock.calls[0][0]
      expect(callArgs.status).toBe('failed')
    })
  })
})
