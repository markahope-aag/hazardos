import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/proposals/[id]/send/route'
import { ProposalService } from '@/lib/services/proposal-service'

vi.mock('@/lib/services/proposal-service', () => ({
  ProposalService: { sendProposal: vi.fn() }
}))

vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    createApiHandlerWithParams: (options: any, handler: any) => {
      return async (request: any, props: any) => {
        const mockContext = {
          user: { id: 'user-123' },
          profile: { organization_id: 'org-123', role: 'admin' },
          log: { info: vi.fn() },
          requestId: 'test-id'
        }
        const params = await props.params
        let body = {}
        if (options.bodySchema) {
          try { body = await request.json() } catch {}
        }
        return await handler(request, mockContext, params, body, {})
      }
    }
  }
})

describe('Proposals Send API', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should send a proposal', async () => {
    vi.mocked(ProposalService.sendProposal).mockResolvedValue(undefined)
    const request = new NextRequest('http://localhost:3000/api/proposals/prop-1/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_email: 'customer@example.com' })
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'prop-1' }) })
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(ProposalService.sendProposal).toHaveBeenCalledWith('prop-1', 'customer@example.com')
  })
})
