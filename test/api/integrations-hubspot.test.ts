import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as ConnectGET } from '@/app/api/integrations/hubspot/connect/route'
import { POST as DisconnectPOST } from '@/app/api/integrations/hubspot/disconnect/route'
import { POST as SyncContactsPOST } from '@/app/api/integrations/hubspot/sync/contacts/route'

const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/hubspot-service', () => ({
  HubSpotService: {
    getAuthorizationUrl: vi.fn(),
    disconnect: vi.fn(),
    syncContact: vi.fn(),
    syncAllContacts: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { HubSpotService } from '@/lib/services/hubspot-service'

describe('HubSpot Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  describe('GET /api/integrations/hubspot/connect', () => {
    it('should return OAuth authorization URL', async () => {
      // Arrange
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

      const authUrl = 'https://app.hubspot.com/oauth/authorize?...'
      vi.mocked(HubSpotService.getAuthorizationUrl).mockReturnValue(authUrl)

      const request = new NextRequest('http://localhost:3000/api/integrations/hubspot/connect')

      // Act
      const response = await ConnectGET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.url).toBe(authUrl)
      expect(HubSpotService.getAuthorizationUrl).toHaveBeenCalled()
    })

    it('should set hubspot_state cookie with CSRF token', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      vi.mocked(HubSpotService.getAuthorizationUrl).mockReturnValue('https://hubspot.com/auth')

      const request = new NextRequest('http://localhost:3000/api/integrations/hubspot/connect')

      // Act
      const response = await ConnectGET(request)

      // Assert
      expect(response.status).toBe(200)
      expect(response.cookies.get('hubspot_state')).toBeDefined()
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/integrations/hubspot/connect')

      // Act
      const response = await ConnectGET(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/integrations/hubspot/disconnect', () => {
    it('should disconnect HubSpot integration', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      vi.mocked(HubSpotService.disconnect).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/integrations/hubspot/disconnect', {
        method: 'POST'
      })

      // Act
      const response = await DisconnectPOST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(HubSpotService.disconnect).toHaveBeenCalledWith('org-123')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/integrations/hubspot/disconnect', {
        method: 'POST'
      })

      // Act
      const response = await DisconnectPOST(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/integrations/hubspot/sync/contacts', () => {
    it('should sync single customer to HubSpot', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      const hubspotId = 'hubspot-contact-123'
      vi.mocked(HubSpotService.syncContact).mockResolvedValue(hubspotId)

      const request = new NextRequest('http://localhost:3000/api/integrations/hubspot/sync/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 'customer-123'
        })
      })

      // Act
      const response = await SyncContactsPOST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.hubspot_id).toBe(hubspotId)
      expect(HubSpotService.syncContact).toHaveBeenCalledWith('org-123', 'customer-123')
    })

    it('should sync all customers to HubSpot', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
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

      const syncResults = {
        synced: 10,
        failed: 0,
        total: 10
      }
      vi.mocked(HubSpotService.syncAllContacts).mockResolvedValue(syncResults)

      const request = new NextRequest('http://localhost:3000/api/integrations/hubspot/sync/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      // Act
      const response = await SyncContactsPOST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.synced).toBe(10)
      expect(HubSpotService.syncAllContacts).toHaveBeenCalledWith('org-123')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/integrations/hubspot/sync/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: 'customer-123' })
      })

      // Act
      const response = await SyncContactsPOST(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
