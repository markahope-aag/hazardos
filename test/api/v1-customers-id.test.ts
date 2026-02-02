import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSupabaseClient = { from: vi.fn() }

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/api-key-service', () => ({
  ApiKeyService: { hasScope: vi.fn(() => true) }
}))

// Mock withApiKeyAuth to pass through the context properly
vi.mock('@/lib/middleware/api-key-auth', () => ({
  withApiKeyAuth: (handler: (request: unknown, context: unknown) => Promise<unknown>) => {
    return async (request: unknown) => {
      const mockContext = {
        apiKey: { id: 'key-1', scopes: ['customers:read'], rate_limit: 1000 },
        organizationId: 'org-123'
      }
      return handler(request, mockContext)
    }
  }
}))

vi.mock('@/lib/middleware/cors', () => ({
  handlePreflight: vi.fn(),
  addCorsHeaders: vi.fn((response) => response)
}))

import { GET } from '@/app/api/v1/customers/[id]/route'
import { ApiKeyService } from '@/lib/services/api-key-service'

describe('V1 Customers ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get customer by ID', async () => {
    vi.mocked(ApiKeyService.hasScope).mockReturnValue(true)
    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: '550e8400-e29b-41d4-a716-446655440001', first_name: 'John', last_name: 'Doe' },
              error: null
            })
          })
        })
      })
    } as any)
    const request = new NextRequest('http://localhost:3000/api/v1/customers/550e8400-e29b-41d4-a716-446655440001')
    const response = await GET(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' }) })
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.data.first_name).toBe('John')
  })
})
