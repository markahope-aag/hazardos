import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/proposals/sign/route'

const proposalSignedMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
vi.mock('@/lib/services/notification-service', () => ({
  NotificationHelpers: { proposalSigned: proposalSignedMock },
}))

// Signing now goes through sign_proposal_by_token(), a SECURITY DEFINER
// function that resolves the token and enforces the expiry/status guards in
// one statement. The token lookup used to be a raw select permitted by an RLS
// policy that never checked which token the caller held, so any authenticated
// user could read another tenant's access_token and sign their contract with
// it (SEC22). The guards live in the database now, so these tests drive the
// function's result shape rather than a query builder.
const mockSupabaseClient = {
  rpc: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null)),
}))

const signatureData = {
  access_token: 'valid-token',
  signer_name: 'John Doe',
  signer_email: 'john@example.com',
  signature_data: 'base64-signature-data',
}

function signRequest(overrides: Partial<typeof signatureData> = {}) {
  return new NextRequest('http://localhost:3000/api/proposals/sign', {
    method: 'POST',
    body: JSON.stringify({ ...signatureData, ...overrides }),
  })
}

describe('POST /api/proposals/sign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should sign a valid proposal', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({
      data: {
        id: 'proposal-1',
        proposal_number: 'PRO-00001',
        estimate_id: 'estimate-1',
        created_by: 'user-1',
        organization_id: 'org-1',
      },
      error: null,
    })

    const response = await POST(signRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(proposalSignedMock).toHaveBeenCalledWith('proposal-1', 'PRO-00001', 'user-1')
  })

  it('passes the signer details and client IP to the function', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({
      data: { id: 'proposal-1', proposal_number: 'PRO-00001', created_by: null },
      error: null,
    })

    const request = new NextRequest('http://localhost:3000/api/proposals/sign', {
      method: 'POST',
      body: JSON.stringify(signatureData),
      headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' },
    })
    await POST(request)

    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('sign_proposal_by_token', {
      p_token: 'valid-token',
      p_signer_name: 'John Doe',
      p_signer_email: 'john@example.com',
      p_signer_ip: '203.0.113.7',
      p_signature_data: 'base64-signature-data',
    })
  })

  it('should reject invalid access token', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({ data: { error: 'not_found' }, error: null })

    const response = await POST(signRequest({ access_token: 'invalid-token' }))

    expect(response.status).toBe(404)
    expect(proposalSignedMock).not.toHaveBeenCalled()
  })

  it('should reject expired token', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({ data: { error: 'expired' }, error: null })

    const response = await POST(signRequest({ access_token: 'expired-token' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('expired')
    expect(proposalSignedMock).not.toHaveBeenCalled()
  })

  it('should reject already signed proposal', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({ data: { error: 'already_signed' }, error: null })

    const response = await POST(signRequest())
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('already been signed')
    expect(proposalSignedMock).not.toHaveBeenCalled()
  })

  it('rejects a proposal that is not in a signable status', async () => {
    mockSupabaseClient.rpc.mockResolvedValue({ data: { error: 'invalid_status' }, error: null })

    const response = await POST(signRequest())

    expect(response.status).toBe(400)
    expect(proposalSignedMock).not.toHaveBeenCalled()
  })
})
