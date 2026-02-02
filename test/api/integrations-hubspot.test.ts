import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

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

import { GET as ConnectGET } from '@/app/api/integrations/hubspot/connect/route'
import { POST as DisconnectPOST } from '@/app/api/integrations/hubspot/disconnect/route'
import { POST as SyncContactsPOST } from '@/app/api/integrations/hubspot/sync/contacts/route'
import { HubSpotService } from '@/lib/services/hubspot-service'

describe('HubSpot Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  const setupAuthenticatedUser = () => {
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
  }

  const setupUnauthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })
  }

  describe('GET /api/integrations/hubspot/connect', () => {
    it('should return OAuth authorization URL', async () => {
      // Arrange
      setupAuthenticatedUser()

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
      setupAuthenticatedUser()

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
      setupUnauthenticatedUser()

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
      setupAuthenticatedUser()

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
      setupUnauthenticatedUser()

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
      setupAuthenticatedUser()

      const hubspotId = 'hubspot-contact-123'
      vi.mocked(HubSpotService.syncContact).mockResolvedValue(hubspotId)

      // Use a valid UUID for customer_id
      const customerId = '550e8400-e29b-41d4-a716-446655440000'
      const request = new NextRequest('http://localhost:3000/api/integrations/hubspot/sync/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: customerId
        })
      })

      // Act
      const response = await SyncContactsPOST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.hubspot_id).toBe(hubspotId)
      expect(HubSpotService.syncContact).toHaveBeenCalledWith('org-123', customerId)
    })

    it('should sync all customers to HubSpot when no customer_id provided', async () => {
      // Arrange
      setupAuthenticatedUser()

      const syncResults = {
        synced: 10,
        failed: 0,
        total: 10
      }
      vi.mocked(HubSpotService.syncAllContacts).mockResolvedValue(syncResults)

      // Send request with empty object - no customer_id triggers sync all
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
      expect(data.failed).toBe(0)
      expect(data.total).toBe(10)
      expect(HubSpotService.syncAllContacts).toHaveBeenCalledWith('org-123')
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      setupUnauthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/integrations/hubspot/sync/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_id: '550e8400-e29b-41d4-a716-446655440000' })
      })

      // Act
      const response = await SyncContactsPOST(request)

      // Assert
      expect(response.status).toBe(401)
    })

    it('should validate customer_id is a valid UUID when provided', async () => {
      // Arrange
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/integrations/hubspot/sync/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: 'not-a-valid-uuid'
        })
      })

      // Act
      const response = await SyncContactsPOST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
    })
  })
})
