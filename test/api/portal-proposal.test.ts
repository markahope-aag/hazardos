import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/portal/proposal/[token]/route'

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    })),
    update: vi.fn(() => ({ eq: vi.fn() }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Portal Proposal API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/portal/proposal/[token]', () => {
    it('should return proposal with token', async () => {
      // Arrange
      const mockProposal = {
        id: 'proposal-123',
        proposal_number: 'PROP-2026-001',
        status: 'sent',
        access_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        cover_letter: 'Thank you for the opportunity',
        viewed_count: 0,
        estimate: [{
          id: 'estimate-123',
          estimate_number: 'EST-2026-001',
          project_name: 'Asbestos Removal Project',
          total: 15000,
          line_items: [
            { id: 'li-1', description: 'Labor', quantity: 40, unit_price: 75, total_price: 3000, sort_order: 1 },
            { id: 'li-2', description: 'Materials', quantity: 1, unit_price: 5000, total_price: 5000, sort_order: 2 }
          ],
          site_survey: [{ id: 'survey-1', job_name: 'Main Building', site_address: '123 Main St' }]
        }],
        customer: [{ id: 'customer-1', company_name: 'ABC Corp', email: 'contact@abc.com' }],
        organization: [{ id: 'org-1', name: 'Hazard Removal Inc', phone: '555-0100' }]
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'proposals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockProposal,
                  error: null
                })
              })
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null })
            })
          } as any
        }
        return mockSupabaseClient.from(table)
      })

      const request = new NextRequest('http://localhost:3000/api/portal/proposal/valid-token-123')

      // Act
      const response = await GET(request, { params: Promise.resolve({ token: 'valid-token-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.proposal.id).toBe('proposal-123')
      expect(data.proposal.proposal_number).toBe('PROP-2026-001')
      expect(data.proposal.estimate.line_items).toHaveLength(2)
      expect(data.proposal.estimate.line_items[0].sort_order).toBe(1)
    })

    it('should update status to viewed when first accessed', async () => {
      // Arrange
      const mockProposal = {
        id: 'proposal-456',
        proposal_number: 'PROP-2026-002',
        status: 'sent',
        access_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        viewed_count: 0,
        estimate: [{ id: 'est-1', total: 10000, line_items: [] }],
        customer: [{ id: 'cust-1' }],
        organization: [{ id: 'org-1' }]
      }

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'proposals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockProposal,
                  error: null
                })
              })
            }),
            update: updateMock
          } as any
        }
        return mockSupabaseClient.from(table)
      })

      const request = new NextRequest('http://localhost:3000/api/portal/proposal/token-456')

      // Act
      await GET(request, { params: Promise.resolve({ token: 'token-456' }) })

      // Assert
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'viewed',
          viewed_count: 1
        })
      )
    })

    it('should increment view count for already viewed proposals', async () => {
      // Arrange
      const mockProposal = {
        id: 'proposal-789',
        status: 'viewed',
        access_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        viewed_count: 3,
        estimate: [{ line_items: [] }],
        customer: [{}],
        organization: [{}]
      }

      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null })
      })

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'proposals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockProposal,
                  error: null
                })
              })
            }),
            update: updateMock
          } as any
        }
        return mockSupabaseClient.from(table)
      })

      const request = new NextRequest('http://localhost:3000/api/portal/proposal/token-789')

      // Act
      await GET(request, { params: Promise.resolve({ token: 'token-789' }) })

      // Assert
      expect(updateMock).toHaveBeenCalledWith({ viewed_count: 4 })
    })

    it('should return 404 when proposal not found', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' }
            })
          })
        })
      } as any)

      const request = new NextRequest('http://localhost:3000/api/portal/proposal/invalid-token')

      // Act
      const response = await GET(request, { params: Promise.resolve({ token: 'invalid-token' }) })

      // Assert
      expect(response.status).toBe(404)
    })

    it('should return error when token is expired', async () => {
      // Arrange
      const expiredProposal = {
        id: 'proposal-expired',
        access_token_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        estimate: [{}],
        customer: [{}],
        organization: [{}]
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: expiredProposal,
              error: null
            })
          })
        })
      } as any)

      const request = new NextRequest('http://localhost:3000/api/portal/proposal/expired-token')

      // Act
      const response = await GET(request, { params: Promise.resolve({ token: 'expired-token' }) })

      // Assert
      expect(response.status).toBe(400)
    })
  })
})
