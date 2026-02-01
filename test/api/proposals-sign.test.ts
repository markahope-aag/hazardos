import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/proposals/sign/route'

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({ single: vi.fn() }))
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('POST /api/proposals/sign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should sign a valid proposal', async () => {
    const mockProposal = {
      id: 'proposal-1',
      status: 'sent',
      access_token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      estimate_id: 'estimate-1'
    }

    const mockUpdated = {
      ...mockProposal,
      status: 'signed',
      signed_at: new Date().toISOString()
    }

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProposal,
            error: null
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUpdated,
              error: null
            })
          })
        })
      })
    } as any)

    const signatureData = {
      access_token: 'valid-token',
      signer_name: 'John Doe',
      signer_email: 'john@example.com',
      signature_data: 'base64-signature-data'
    }

    const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
      method: 'POST',
      body: JSON.stringify(signatureData)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should reject invalid access token', async () => {
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

    const signatureData = {
      access_token: 'invalid-token',
      signer_name: 'John Doe',
      signer_email: 'john@example.com',
      signature_data: 'base64-signature-data'
    }

    const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
      method: 'POST',
      body: JSON.stringify(signatureData)
    })

    const response = await POST(request)

    expect(response.status).toBeGreaterThanOrEqual(400)
  })

  it('should reject expired token', async () => {
    const mockProposal = {
      id: 'proposal-1',
      status: 'sent',
      access_token_expires_at: new Date(Date.now() - 86400000).toISOString(),
      estimate_id: 'estimate-1'
    }

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProposal,
            error: null
          })
        })
      })
    } as any)

    const signatureData = {
      access_token: 'expired-token',
      signer_name: 'John Doe',
      signer_email: 'john@example.com',
      signature_data: 'base64-signature-data'
    }

    const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
      method: 'POST',
      body: JSON.stringify(signatureData)
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('should reject already signed proposal', async () => {
    const mockProposal = {
      id: 'proposal-1',
      status: 'signed',
      access_token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      estimate_id: 'estimate-1'
    }

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProposal,
            error: null
          })
        })
      })
    } as any)

    const signatureData = {
      access_token: 'valid-token',
      signer_name: 'John Doe',
      signer_email: 'john@example.com',
      signature_data: 'base64-signature-data'
    }

    const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
      method: 'POST',
      body: JSON.stringify(signatureData)
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })
})
