import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/v1/customers/[id]/route'

const mockSupabaseClient = { from: vi.fn() }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/api-key-service', () => ({
  ApiKeyService: { hasScope: vi.fn() }
}))

vi.mock('@/lib/middleware/api-key-auth', () => ({
  withApiKeyAuth: (handler: Function) => handler
}))

import { ApiKeyService } from '@/lib/services/api-key-service'

describe('V1 Customers ID API', () => {
  it('should get customer by ID', async () => {
    vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)
    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'cust-1', first_name: 'John', last_name: 'Doe' },
              error: null
            })
          })
        })
      })
    } as any)
    const request = new NextRequest('http://localhost:3000/api/v1/customers/cust-1')
    const response = await GET(request, { params: Promise.resolve({ id: 'cust-1' }), organizationId: 'org-123', apiKey: { scopes: ['customers:read'] } } as any)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.data.first_name).toBe('John')
  })
})
