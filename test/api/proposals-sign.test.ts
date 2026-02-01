import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

// Import the route handler
import { POST } from '@/app/api/proposals/sign/route'
import { createClient } from '@/lib/supabase/server'

describe('Proposals Sign API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/proposals/sign', () => {
    const validSignData = {
      access_token: 'valid-access-token',
      signer_name: 'John Doe',
      signer_email: 'john@example.com',
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'
    }

    it('should sign proposal with valid access token', async () => {
      const mockProposal = {
        id: 'proposal-1',
        status: 'sent',
        access_token_expires_at: '2026-03-01T00:00:00Z',
        estimate_id: 'estimate-1'
      }

      const mockSigned = {
        ...mockProposal,
        status: 'signed',
        signed_at: '2026-02-01T10:00:00Z',
        signer_name: validSignData.signer_name,
        signer_email: validSignData.signer_email,
        signer_ip: 'unknown',
        signature_data: validSignData.signature_data
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
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: mockSigned,
                    error: null
                  })
                })
              })
            })
          } as any
        }
        if (table === 'estimates') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        body: JSON.stringify(validSignData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.signed_at).toBe(mockSigned.signed_at)
    })

    it('should validate required access_token field', async () => {
      const invalidData = { ...validSignData }
      delete invalidData.access_token

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('access_token is required')
    })

    it('should validate required signer_name field', async () => {
      const invalidData = { ...validSignData }
      delete invalidData.signer_name

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('signer_name is required')
    })

    it('should validate required signer_email field', async () => {
      const invalidData = { ...validSignData }
      delete invalidData.signer_email

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('signer_email is required')
    })

    it('should validate required signature_data field', async () => {
      const invalidData = { ...validSignData }
      delete invalidData.signature_data

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        body: JSON.stringify(invalidData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('signature_data is required')
    })

    it('should reject invalid access token', async () => {
      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'proposals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'No rows found', code: 'PGRST116' }
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        body: JSON.stringify(validSignData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Invalid or expired access token')
    })

    it('should reject expired access token', async () => {
      const mockProposal = {
        id: 'proposal-1',
        status: 'sent',
        access_token_expires_at: '2025-01-01T00:00:00Z', // Expired
        estimate_id: 'estimate-1'
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
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        body: JSON.stringify(validSignData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Access token has expired')
    })

    it('should reject already signed proposal', async () => {
      const mockProposal = {
        id: 'proposal-1',
        status: 'signed',
        access_token_expires_at: '2026-03-01T00:00:00Z',
        estimate_id: 'estimate-1'
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
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        body: JSON.stringify(validSignData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Proposal has already been signed')
    })

    it('should reject proposal not in valid status', async () => {
      const mockProposal = {
        id: 'proposal-1',
        status: 'draft',
        access_token_expires_at: '2026-03-01T00:00:00Z',
        estimate_id: 'estimate-1'
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
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        body: JSON.stringify(validSignData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('cannot be signed')
    })

    it('should capture client IP from x-forwarded-for header', async () => {
      const mockProposal = {
        id: 'proposal-1',
        status: 'sent',
        access_token_expires_at: '2026-03-01T00:00:00Z',
        estimate_id: 'estimate-1'
      }

      let capturedIp = ''

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
            update: vi.fn().mockImplementation((data: any) => {
              capturedIp = data.signer_ip
              return {
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockReturnValue({
                    single: vi.fn().mockResolvedValue({
                      data: { ...mockProposal, ...data },
                      error: null
                    })
                  })
                })
              }
            })
          } as any
        }
        if (table === 'estimates') {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.1.100, 10.0.0.1'
        },
        body: JSON.stringify(validSignData)
      })

      await POST(request)

      expect(capturedIp).toBe('192.168.1.100')
    })

    it('should update estimate status to accepted after signing', async () => {
      const mockProposal = {
        id: 'proposal-1',
        status: 'sent',
        access_token_expires_at: '2026-03-01T00:00:00Z',
        estimate_id: 'estimate-1'
      }

      const estimateUpdateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
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
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockProposal, status: 'signed' },
                    error: null
                  })
                })
              })
            })
          } as any
        }
        if (table === 'estimates') {
          return {
            update: estimateUpdateMock
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        body: JSON.stringify(validSignData)
      })

      await POST(request)

      expect(estimateUpdateMock).toHaveBeenCalledWith({ status: 'accepted' })
    })

    it('should handle database update errors securely', async () => {
      const mockProposal = {
        id: 'proposal-1',
        status: 'sent',
        access_token_expires_at: '2026-03-01T00:00:00Z',
        estimate_id: 'estimate-1'
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
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Update failed', code: '42501' }
                  })
                })
              })
            })
          } as any
        }
        return {} as any
      })

      const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
        method: 'POST',
        body: JSON.stringify(validSignData)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to sign proposal')
    })
  })
})
