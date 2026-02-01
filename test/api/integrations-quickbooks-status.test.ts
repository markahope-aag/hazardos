import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/integrations/quickbooks/status/route'

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

vi.mock('@/lib/services/quickbooks-service', () => ({
  QuickBooksService: {
    getConnectionStatus: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { QuickBooksService } from '@/lib/services/quickbooks-service'

describe('QuickBooks Status API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('GET /api/integrations/quickbooks/status', () => {
    it('should return QuickBooks connection status when connected', async () => {
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

      const mockStatus = {
        connected: true,
        company_name: 'ABC Construction Inc',
        realm_id: 'qb-realm-123',
        last_sync: '2026-02-01T10:00:00Z',
        sync_enabled: true
      }

      vi.mocked(QuickBooksService.getConnectionStatus).mockResolvedValue(mockStatus)

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/status')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.connected).toBe(true)
      expect(data.company_name).toBe('ABC Construction Inc')
      expect(data.realm_id).toBe('qb-realm-123')
      expect(QuickBooksService.getConnectionStatus).toHaveBeenCalledWith('org-123')
    })

    it('should return disconnected status when not connected', async () => {
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

      const mockStatus = {
        connected: false,
        company_name: null,
        realm_id: null,
        last_sync: null,
        sync_enabled: false
      }

      vi.mocked(QuickBooksService.getConnectionStatus).mockResolvedValue(mockStatus)

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/status')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.connected).toBe(false)
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/integrations/quickbooks/status')

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
