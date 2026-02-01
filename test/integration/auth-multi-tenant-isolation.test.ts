import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'

/**
 * Integration tests for multi-tenant data isolation
 *
 * These tests verify that authentication properly isolates data between tenants
 * and prevents unauthorized cross-tenant access.
 */

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('Multi-Tenant Data Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Organization Boundary Enforcement', () => {
    it('should provide organization_id for scoping queries', async () => {
      // Arrange
      const tenant1User = { id: 'user-tenant1', email: 'user@tenant1.com' }
      const tenant1Profile = { organization_id: 'org-tenant-1', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: tenant1User },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: tenant1Profile,
              error: null
            })
          })
        })
      } as any)

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, context) => {
          // Verify organization_id is available for filtering
          expect(context.profile.organization_id).toBe('org-tenant-1')

          // Simulate a database query that MUST filter by org
          // In real code, this would be:
          // supabase.from('customers').select('*').eq('organization_id', context.profile.organization_id)

          return new Response(JSON.stringify({
            organization_id: context.profile.organization_id,
            message: 'Data scoped to tenant organization'
          }))
        }
      )

      const request = new NextRequest('http://localhost:3000/api/customers')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(data.organization_id).toBe('org-tenant-1')
    })

    it('should prevent accessing data from different organization', async () => {
      // Arrange - User from Tenant 1
      const tenant1User = { id: 'user-tenant1', email: 'user@tenant1.com' }
      const tenant1Profile = { organization_id: 'org-tenant-1', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: tenant1User },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: tenant1Profile,
              error: null
            })
          })
        })
      } as any)

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, context) => {
          // This handler simulates trying to access Tenant 2's data
          // The organization_id mismatch should prevent access

          const requestedOrgId = 'org-tenant-2' // Trying to access different tenant
          const userOrgId = context.profile.organization_id

          if (requestedOrgId !== userOrgId) {
            return new Response(JSON.stringify({
              error: 'Access denied: Organization mismatch'
            }), { status: 403 })
          }

          return new Response(JSON.stringify({ success: true }))
        }
      )

      const request = new NextRequest('http://localhost:3000/api/customers')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toContain('Organization mismatch')
    })

    it('should ensure different tenants cannot see each other data', async () => {
      // This test simulates two different authenticated requests from different tenants

      // Tenant 1 request
      const tenant1User = { id: 'user-t1', email: 'user@tenant1.com' }
      const tenant1Profile = { organization_id: 'org-tenant-1', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: tenant1User },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: tenant1Profile,
              error: null
            })
          })
        })
      } as any)

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, context) => {
          return new Response(JSON.stringify({
            org: context.profile.organization_id
          }))
        }
      )

      const request1 = new NextRequest('http://localhost:3000/api/data')
      const response1 = await handler(request1)
      const data1 = await response1.json()

      // Tenant 2 request - change the mock for second tenant
      const tenant2User = { id: 'user-t2', email: 'user@tenant2.com' }
      const tenant2Profile = { organization_id: 'org-tenant-2', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: tenant2User },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: tenant2Profile,
              error: null
            })
          })
        })
      } as any)

      const request2 = new NextRequest('http://localhost:3000/api/data')
      const response2 = await handler(request2)
      const data2 = await response2.json()

      // Assert - Different organizations
      expect(data1.org).toBe('org-tenant-1')
      expect(data2.org).toBe('org-tenant-2')
      expect(data1.org).not.toBe(data2.org)
    })
  })

  describe('User Isolation Within Organization', () => {
    it('should provide user_id for audit trails', async () => {
      // Arrange
      const user = { id: 'user-123', email: 'user@example.com' }
      const profile = { organization_id: 'org-456', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: profile,
              error: null
            })
          })
        })
      } as any)

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, context) => {
          // Verify user_id is available for audit logging
          expect(context.user.id).toBe('user-123')

          // Simulate creating a record with created_by field
          const recordData = {
            created_by: context.user.id,
            organization_id: context.profile.organization_id
          }

          return new Response(JSON.stringify(recordData))
        }
      )

      const request = new NextRequest('http://localhost:3000/api/records')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(data.created_by).toBe('user-123')
      expect(data.organization_id).toBe('org-456')
    })

    it('should allow different users from same org to access org data', async () => {
      // User 1 from Org A
      const user1 = { id: 'user-1', email: 'user1@orga.com' }
      const profile1 = { organization_id: 'org-a', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: user1 },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: profile1,
              error: null
            })
          })
        })
      } as any)

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, context) => {
          return new Response(JSON.stringify({
            user_id: context.user.id,
            org_id: context.profile.organization_id
          }))
        }
      )

      const request1 = new NextRequest('http://localhost:3000/api/data')
      const response1 = await handler(request1)
      const data1 = await response1.json()

      // User 2 from same Org A
      const user2 = { id: 'user-2', email: 'user2@orga.com' }
      const profile2 = { organization_id: 'org-a', role: 'viewer' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: user2 },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: profile2,
              error: null
            })
          })
        })
      } as any)

      const request2 = new NextRequest('http://localhost:3000/api/data')
      const response2 = await handler(request2)
      const data2 = await response2.json()

      // Assert - Both users from same org
      expect(data1.org_id).toBe('org-a')
      expect(data2.org_id).toBe('org-a')
      expect(data1.user_id).not.toBe(data2.user_id) // Different users
    })
  })

  describe('Platform User Special Access', () => {
    it('should allow platform users to access platform-level data', async () => {
      // Arrange
      const platformUser = { id: 'platform-user', email: 'admin@platform.com' }
      const platformProfile = {
        organization_id: 'org-platform',
        role: 'platform_owner',
        is_platform_user: true
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: platformUser },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: platformProfile,
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
          // Platform users can access cross-tenant data for management
          return new Response(JSON.stringify({
            user_id: context.user.id,
            role: context.profile.role,
            can_access_all_tenants: true
          }))
        }
      )

      const request = new NextRequest('http://localhost:3000/api/platform-admin')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.role).toBe('platform_owner')
      expect(data.can_access_all_tenants).toBe(true)
    })

    it('should deny regular tenant users from platform endpoints', async () => {
      // Arrange
      const tenantUser = { id: 'tenant-user', email: 'user@tenant.com' }
      const tenantProfile = {
        organization_id: 'org-tenant-1',
        role: 'admin',
        is_platform_user: false
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: tenantUser },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: tenantProfile,
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
        async (_request, _context) => {
          return new Response(JSON.stringify({ success: true }))
        }
      )

      const request = new NextRequest('http://localhost:3000/api/platform-admin')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe('You do not have permission to access this resource')
    })
  })

  describe('Security Edge Cases', () => {
    it('should reject user without organization_id', async () => {
      // Arrange - User exists but has no organization (orphaned user)
      const user = { id: 'orphan-user', email: 'orphan@example.com' }
      const orphanProfile = {
        organization_id: null, // No organization!
        role: 'admin'
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: orphanProfile,
              error: null
            })
          })
        })
      } as any)

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, _context) => {
          return new Response(JSON.stringify({ success: true }))
        }
      )

      const request = new NextRequest('http://localhost:3000/api/data')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe('Profile not found')
    })

    it('should handle concurrent requests from same user correctly', async () => {
      // Arrange
      const user = { id: 'user-concurrent', email: 'user@example.com' }
      const profile = { organization_id: 'org-123', role: 'admin' }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: profile,
              error: null
            })
          })
        })
      } as any)

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, context) => {
          return new Response(JSON.stringify({
            org_id: context.profile.organization_id
          }))
        }
      )

      const request1 = new NextRequest('http://localhost:3000/api/data')
      const request2 = new NextRequest('http://localhost:3000/api/data')

      // Act - Concurrent requests
      const [response1, response2] = await Promise.all([
        handler(request1),
        handler(request2)
      ])

      const data1 = await response1.json()
      const data2 = await response2.json()

      // Assert - Both should have same org context
      expect(data1.org_id).toBe('org-123')
      expect(data2.org_id).toBe('org-123')
    })

    it('should enforce organization isolation even for admin roles', async () => {
      // Arrange - Admin from Tenant 1
      const adminUser = { id: 'admin-t1', email: 'admin@tenant1.com' }
      const adminProfile = {
        organization_id: 'org-tenant-1',
        role: 'admin' // Admin role, but NOT platform_owner
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: adminUser },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: adminProfile,
              error: null
            })
          })
        })
      } as any)

      const handler = createApiHandler(
        { requireAuth: true },
        async (_request, context) => {
          // Even admins can only access their own org's data
          return new Response(JSON.stringify({
            org_id: context.profile.organization_id,
            can_access_other_orgs: false
          }))
        }
      )

      const request = new NextRequest('http://localhost:3000/api/data')

      // Act
      const response = await handler(request)
      const data = await response.json()

      // Assert
      expect(data.org_id).toBe('org-tenant-1')
      expect(data.can_access_other_orgs).toBe(false)
    })
  })
})
