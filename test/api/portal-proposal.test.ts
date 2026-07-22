import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/portal/proposal/[token]/route'

// The route no longer selects proposals off the table. It calls two
// SECURITY DEFINER functions — get_proposal_by_token() returns the whole portal
// payload for exactly the token it is given, and record_proposal_view() applies
// the status/count transition. The RLS policy behind the old raw select let any
// tenant read every tokened proposal (SEC22), so these tests mock rpc() rather
// than a query builder.
const mockSupabaseClient = {
  rpc: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null)),
}))

/** Route the two RPCs the handler calls so assertions can target each. */
function mockRpc({ proposal, error = null }: { proposal: unknown; error?: unknown }) {
  mockSupabaseClient.rpc.mockImplementation((fn: string) => {
    if (fn === 'get_proposal_by_token') return Promise.resolve({ data: proposal, error })
    return Promise.resolve({ data: null, error: null })
  })
}

describe('Portal Proposal API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/portal/proposal/[token]', () => {
    it('should return proposal with token', async () => {
      // The function returns relations already shaped as objects, so the route
      // no longer has to un-array PostgREST's join output.
      mockRpc({
        proposal: {
          id: 'proposal-123',
          proposal_number: 'PROP-2026-001',
          status: 'sent',
          cover_letter: 'Thank you for the opportunity',
          viewed_count: 0,
          estimate: {
            id: 'estimate-123',
            estimate_number: 'EST-2026-001',
            project_name: 'Asbestos Removal Project',
            total: 15000,
            line_items: [
              { id: 'li-1', description: 'Labor', quantity: 40, unit_price: 75, total_price: 3000, sort_order: 1 },
              { id: 'li-2', description: 'Materials', quantity: 1, unit_price: 5000, total_price: 5000, sort_order: 2 },
            ],
            site_survey: { id: 'survey-1', job_name: 'Main Building', site_address: '123 Main St' },
          },
          customer: { id: 'customer-1', company_name: 'ABC Corp', email: 'contact@abc.com' },
          organization: { id: 'org-1', name: 'Hazard Removal Inc', phone: '555-0100' },
        },
      })

      const request = new NextRequest('http://localhost:3000/api/portal/proposal/valid-token-123')
      const response = await GET(request, { params: Promise.resolve({ token: 'valid-token-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.proposal.id).toBe('proposal-123')
      expect(data.proposal.proposal_number).toBe('PROP-2026-001')
      expect(data.proposal.estimate.line_items).toHaveLength(2)
      expect(data.proposal.estimate.line_items[0].sort_order).toBe(1)
    })

    it('looks the proposal up by the token in the URL', async () => {
      mockRpc({ proposal: { id: 'proposal-123', status: 'sent' } })

      const request = new NextRequest('http://localhost:3000/api/portal/proposal/token-abc')
      await GET(request, { params: Promise.resolve({ token: 'token-abc' }) })

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('get_proposal_by_token', {
        p_token: 'token-abc',
      })
    })

    it('records the view through the RPC', async () => {
      // The status/count transition now lives in the function. It was
      // previously an anon UPDATE that RLS silently refused, so the counter
      // never actually moved for portal visitors.
      mockRpc({ proposal: { id: 'proposal-456', status: 'sent', viewed_count: 0 } })

      const request = new NextRequest('http://localhost:3000/api/portal/proposal/token-456')
      await GET(request, { params: Promise.resolve({ token: 'token-456' }) })

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('record_proposal_view', {
        p_token: 'token-456',
      })
    })

    it('should return 404 when proposal not found', async () => {
      // No proposal carries this token — the function returns null rather than
      // an error row.
      mockRpc({ proposal: null })

      const request = new NextRequest('http://localhost:3000/api/portal/proposal/invalid-token')
      const response = await GET(request, { params: Promise.resolve({ token: 'invalid-token' }) })

      expect(response.status).toBe(404)
    })

    it('does not record a view for an unknown token', async () => {
      mockRpc({ proposal: null })

      const request = new NextRequest('http://localhost:3000/api/portal/proposal/invalid-token')
      await GET(request, { params: Promise.resolve({ token: 'invalid-token' }) })

      expect(mockSupabaseClient.rpc).not.toHaveBeenCalledWith('record_proposal_view', expect.anything())
    })

    it('should return error when token is expired', async () => {
      // A matching but lapsed token is reported distinctly from "not found" so
      // the portal can tell the visitor their link expired.
      mockRpc({ proposal: { expired: true } })

      const request = new NextRequest('http://localhost:3000/api/portal/proposal/expired-token')
      const response = await GET(request, { params: Promise.resolve({ token: 'expired-token' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('expired')
    })
  })
})
