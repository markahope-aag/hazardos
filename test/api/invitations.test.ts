import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies
vi.mock('@/lib/utils/secure-error-handler', () => ({
  SecureError: class SecureError extends Error {
    constructor(public code: string, message: string) {
      super(message)
      this.name = 'SecureError'
    }
  },
  throwDbError: vi.fn((error, context) => {
    throw new Error(`Database error in ${context}: ${error.message}`)
  }),
}))

vi.mock('@/lib/auth/roles', () => ({
  ROLES: {
    TENANT_ADMIN: ['tenant_owner', 'admin', 'platform_owner', 'platform_admin'],
  },
}))

// Create a chainable query builder mock
function createQueryBuilder() {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    is: vi.fn(() => builder),
    order: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    single: vi.fn(() => builder),
    then: vi.fn((resolve) => {
      resolve({ data: [], error: null })
    })
  }
  return builder
}

const mockSupabaseClient = {
  from: vi.fn(() => createQueryBuilder())
}

vi.mock('@/lib/utils/api-handler', () => ({
  createApiHandler: vi.fn((options, handler) => {
    return async (request: NextRequest) => {
      let body: any = null
      
      // Handle body parsing for POST requests
      if (request.method === 'POST') {
        try {
          body = await request.json()
        } catch {
          return NextResponse.json(
            { error: 'Invalid JSON body' },
            { status: 400 }
          )
        }
        
        // Mock body schema validation
        if (options.bodySchema) {
          if (!body.email || !body.role) {
            return NextResponse.json(
              { error: 'Validation failed' },
              { status: 400 }
            )
          }
        }
      }

      const context = {
        supabase: mockSupabaseClient,
        profile: { organization_id: 'org-123', role: 'admin' }
      }

      return handler(request, context, body)
    }
  })
}))

// Import after mocks
import { GET, POST } from '@/app/api/invitations/route'

describe('Invitations API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/invitations', () => {
    it('should list pending invitations', async () => {
      const mockInvitations = [
        {
          id: 'inv-1',
          email: 'john@example.com',
          role: 'admin',
          created_at: '2024-01-01T10:00:00Z',
          accepted_at: null
        },
        {
          id: 'inv-2',
          email: 'jane@example.com',
          role: 'estimator',
          created_at: '2024-01-02T10:00:00Z',
          accepted_at: null
        }
      ]

      mockSupabaseClient.from.mockImplementation(() => {
        const builder = createQueryBuilder()
        builder.then.mockImplementation((resolve) => {
          resolve({ data: mockInvitations, error: null })
        })
        return builder
      })

      const request = new NextRequest('http://localhost/api/invitations')
      
      const response = await GET(request)
      expect(response.status).toBe(200)
      
      const json = await response.json()
      expect(json.invitations).toEqual(mockInvitations)
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockImplementation(() => {
        const builder = createQueryBuilder()
        builder.then.mockImplementation((resolve) => {
          resolve({ data: null, error: new Error('Database error') })
        })
        return builder
      })

      const request = new NextRequest('http://localhost/api/invitations')
      
      // Should throw database error
      await expect(GET(request)).rejects.toThrow('Database error in fetch invitations')
    })

    it('should filter by organization and pending status', async () => {
      const mockChain = createQueryBuilder()
      mockSupabaseClient.from.mockReturnValue(mockChain)

      const request = new NextRequest('http://localhost/api/invitations')
      
      await GET(request)
      
      expect(mockChain.eq).toHaveBeenCalledWith('organization_id', 'org-123')
      expect(mockChain.is).toHaveBeenCalledWith('accepted_at', null)
      expect(mockChain.order).toHaveBeenCalledWith('created_at', { ascending: false })
    })
  })

  describe('POST /api/invitations', () => {
    it('should create invitation successfully', async () => {
      const mockInvitation = {
        id: 'inv-123',
        email: 'newuser@example.com',
        role: 'admin',
        organization_id: 'org-123',
        created_at: '2024-01-03T10:00:00Z'
      }

      // Mock user lookup (no existing user)
      mockSupabaseClient.from.mockImplementation((table) => {
        const builder = createQueryBuilder()
        
        if (table === 'profiles') {
          builder.then.mockImplementation((resolve) => {
            resolve({ data: [], error: null }) // No existing user
          })
        } else if (table === 'tenant_invitations') {
          // First call: check existing invitation (none found)
          // Second call: insert new invitation
          builder.then
            .mockImplementationOnce((resolve) => {
              resolve({ data: null, error: null }) // No existing invitation
            })
          builder.single = vi.fn().mockResolvedValue({ 
            data: mockInvitation, 
            error: null 
          })
        }
        
        return builder
      })

      const requestBody = {
        email: 'newuser@example.com',
        role: 'admin'
      }

      const request = new NextRequest('http://localhost/api/invitations', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })
      
      const response = await POST(request)
      expect(response.status).toBe(201)
      
      const json = await response.json()
      expect(json.invitation).toEqual(mockInvitation)
    })

    it('should return 400 for invalid email', async () => {
      const request = new NextRequest('http://localhost/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          role: 'admin'
        })
      })
      
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 for missing role', async () => {
      const request = new NextRequest('http://localhost/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
          // missing role
        })
      })
      
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/invitations', {
        method: 'POST',
        body: 'invalid json'
      })
      
      const response = await POST(request)
      expect(response.status).toBe(400)
      
      const json = await response.json()
      expect(json.error).toBe('Invalid JSON body')
    })

    it('should handle existing user conflict', async () => {
      // Mock user already exists
      mockSupabaseClient.from.mockImplementation((table) => {
        const builder = createQueryBuilder()
        
        if (table === 'profiles') {
          builder.then.mockImplementation((resolve) => {
            resolve({ 
              data: [{ id: 'user-exists', email: 'existing@example.com' }], 
              error: null 
            })
          })
        }
        
        return builder
      })

      const request = new NextRequest('http://localhost/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          role: 'admin'
        })
      })
      
      // Should throw SecureError for existing user
      await expect(POST(request)).rejects.toThrow('User already exists')
    })

    it('should handle existing invitation conflict', async () => {
      // Mock no existing user but existing invitation
      mockSupabaseClient.from.mockImplementation((table) => {
        const builder = createQueryBuilder()
        
        if (table === 'profiles') {
          builder.then.mockImplementation((resolve) => {
            resolve({ data: [], error: null }) // No existing user
          })
        } else if (table === 'tenant_invitations') {
          builder.then.mockImplementation((resolve) => {
            resolve({ 
              data: { id: 'existing-inv', email: 'pending@example.com' }, 
              error: null 
            })
          })
        }
        
        return builder
      })

      const request = new NextRequest('http://localhost/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'pending@example.com',
          role: 'admin'
        })
      })
      
      // Should throw SecureError for existing invitation
      await expect(POST(request)).rejects.toThrow('Invitation already exists')
    })
  })
})