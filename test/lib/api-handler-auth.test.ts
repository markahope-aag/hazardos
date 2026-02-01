import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler, createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { z } from 'zod'

// Mock dependencies
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
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

describe('API Handler Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createApiHandler - Authentication', () => {
    it('should authenticate valid user and provide context', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = { organization_id: 'org-456', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
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

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, context) => {
          return NextResponse.json({
            userId: context.user.id,
            orgId: context.profile.organization_id,
            role: context.profile.role
          })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.userId).toBe('user-123')
      expect(data.orgId).toBe('org-456')
      expect(data.role).toBe('admin')
      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled()
    })

    it('should reject unauthenticated requests when auth required', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, _context) => {
          return NextResponse.json({ success: true })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should reject when auth error occurs', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' } as any
      })

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, _context) => {
          return NextResponse.json({ success: true })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })

    it('should reject when profile not found', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' } as any
            })
          })
        })
      } as any)

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, _context) => {
          return NextResponse.json({ success: true })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe('Profile not found')
      expect(data.type).toBe('NOT_FOUND')
    })

    it('should reject when profile missing organization_id', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = { organization_id: null, role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
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

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, _context) => {
          return NextResponse.json({ success: true })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe('Profile not found')
      expect(data.type).toBe('NOT_FOUND')
    })

    it('should allow unauthenticated access when requireAuth is false', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const handler = createApiHandler(
        { requireAuth: false },
        async (_request) => {
          return NextResponse.json({ public: true })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.public).toBe(true)
    })
  })

  describe('createApiHandler - Role-based Authorization', () => {
    it('should allow access for users with allowed roles', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = { organization_id: 'org-456', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
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

      const handler = createApiHandler(
        {
          requireAuth: true,
          allowedRoles: ['admin', 'platform_owner']
        },
        async (_request, _context) => {
          return NextResponse.json({ success: true })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject access for users without allowed roles', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = { organization_id: 'org-456', role: 'viewer' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
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

      const handler = createApiHandler(
        {
          requireAuth: true,
          allowedRoles: ['admin', 'platform_owner']
        },
        async (_request, _context) => {
          return NextResponse.json({ success: true })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe('You do not have permission to access this resource')
      expect(data.type).toBe('FORBIDDEN')
    })

    it('should allow platform_owner to access any endpoint', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'admin@platform.com' }
      const mockProfile = { organization_id: 'org-456', role: 'platform_owner' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
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

      const handler = createApiHandler(
        {
          requireAuth: true,
          allowedRoles: ['platform_owner', 'platform_admin']
        },
        async (_request, context) => {
          return NextResponse.json({
            role: context.profile.role,
            access: 'granted'
          })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/platform-admin')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.role).toBe('platform_owner')
      expect(data.access).toBe('granted')
    })
  })

  describe('createApiHandlerWithParams - Authentication with Parameters', () => {
    it('should authenticate and provide params to handler', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = { organization_id: 'org-456', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
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

      const handler = createApiHandlerWithParams(
        { requireAuth: true },
        async (_request, _context, params) => {
          return NextResponse.json({ id: params.id })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test/resource-123')
      const props = { params: Promise.resolve({ id: 'resource-123' }) }

      // Act
      const response = await handler(request, props)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.id).toBe('resource-123')
    })

    it('should reject unauthenticated requests with params', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const handler = createApiHandlerWithParams(
        { requireAuth: true },
        async (_request, _context, params) => {
          return NextResponse.json({ id: params.id })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test/resource-123')
      const props = { params: Promise.resolve({ id: 'resource-123' }) }

      // Act
      const response = await handler(request, props)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication is required')
      expect(data.type).toBe('UNAUTHORIZED')
    })
  })

  describe('Multi-tenant Isolation', () => {
    it('should provide organization_id in context for tenant isolation', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@tenant1.com' }
      const mockProfile = { organization_id: 'org-tenant-1', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
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

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, context) => {
          // Verify handler receives organization_id for filtering queries
          expect(context.profile.organization_id).toBe('org-tenant-1')
          return NextResponse.json({
            orgId: context.profile.organization_id
          })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.orgId).toBe('org-tenant-1')
    })

    it('should provide user ID for audit trails', async () => {
      // Arrange
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = { organization_id: 'org-456', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
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

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, context) => {
          return NextResponse.json({
            userId: context.user.id,
            email: context.user.email
          })
        }
      )

      const request = new NextRequest('http://localhost:3000/api/test')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.userId).toBe('user-123')
      expect(data.email).toBe('test@example.com')
    })
  })
})
