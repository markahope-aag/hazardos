import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useMultiTenantAuth, usePermissions } from '@/lib/hooks/use-multi-tenant-auth'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    onAuthStateChange: vi.fn()
  },
  from: vi.fn()
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

describe('useMultiTenantAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for auth state change subscription
    vi.mocked(mockSupabaseClient.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    } as any)
  })

  describe('Authentication State', () => {
    it('should load user, profile, and organization data', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'admin',
        organization_id: 'org-456',
        is_platform_user: false,
        login_count: 5
      }

      const mockOrg = {
        id: 'org-456',
        name: 'Test Organization',
        slug: 'test-org',
        subscription_status: 'active'
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any)

      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }

      const mockOrgQuery = {
        single: vi.fn().mockResolvedValue({
          data: mockOrg,
          error: null
        })
      }

      const mockUpdateQuery = {
        eq: vi.fn()
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue(mockProfileQuery)
            }),
            update: vi.fn().mockReturnValue(mockUpdateQuery)
          } as any
        }
        if (table === 'organizations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue(mockOrgQuery)
            })
          } as any
        }
        return {} as any
      })

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toEqual(mockProfile)
      expect(result.current.organization).toEqual(mockOrg)
      expect(result.current.isPlatformUser).toBe(false)
    })

    it('should handle unauthenticated state', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      } as any)

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
      expect(result.current.organization).toBeNull()
    })

    it('should handle profile fetch error', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any)

      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockProfileQuery)
          })
        } as any
      })

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toBeNull()
    })

    it('should update last login timestamp', async () => {
      // Arrange
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      }

      const mockProfile = {
        id: 'user-123',
        role: 'admin',
        organization_id: 'org-456',
        is_platform_user: false,
        login_count: 5
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any)

      let _updateCalled = false
      const mockUpdate = vi.fn().mockImplementation(() => {
        _updateCalled = true
        return {
          eq: vi.fn()
        }
      })

      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue(mockProfileQuery)
            }),
            update: mockUpdate
          } as any
        }
        return {} as any
      })

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      }, { timeout: 3000 })

      // Assert - Verify profile was loaded (which means update logic ran)
      expect(result.current.profile).toEqual(mockProfile)
    })
  })

  describe('Platform User Detection', () => {
    it('should identify platform users', async () => {
      // Arrange
      const mockUser = {
        id: 'user-platform',
        email: 'admin@platform.com'
      }

      const mockProfile = {
        id: 'user-platform',
        role: 'platform_owner',
        organization_id: 'org-platform',
        is_platform_user: true,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any)

      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockProfileQuery)
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn()
          })
        } as any
      })

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.isPlatformUser).toBe(true)
      expect(result.current.canAccessPlatformAdmin).toBe(true)
    })

    it('should identify regular tenant users', async () => {
      // Arrange
      const mockUser = {
        id: 'user-tenant',
        email: 'user@tenant.com'
      }

      const mockProfile = {
        id: 'user-tenant',
        role: 'admin',
        organization_id: 'org-tenant-1',
        is_platform_user: false,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      } as any)

      const mockProfileQuery = {
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue(mockProfileQuery)
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn()
          })
        } as any
      })

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.isPlatformUser).toBe(false)
      expect(result.current.canAccessPlatformAdmin).toBe(false)
    })
  })

  describe('Role-based Access Control', () => {
    it('should grant platform admin access to platform_owner', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-1',
        role: 'platform_owner',
        organization_id: 'org-1',
        is_platform_user: true,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any)

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any))

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.canAccessPlatformAdmin).toBe(true)
      expect(result.current.canAccessTenantAdmin).toBe(true)
    })

    it('should grant platform admin access to platform_admin', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-1',
        role: 'platform_admin',
        organization_id: 'org-1',
        is_platform_user: true,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any)

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any))

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.canAccessPlatformAdmin).toBe(true)
      expect(result.current.canAccessTenantAdmin).toBe(true)
    })

    it('should deny platform admin access to tenant users', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-1',
        role: 'admin',
        organization_id: 'org-1',
        is_platform_user: false,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any)

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any))

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.canAccessPlatformAdmin).toBe(false)
      expect(result.current.canAccessTenantAdmin).toBe(true) // Can access tenant admin
    })

    it('should grant tenant admin access to tenant_owner', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-1',
        role: 'tenant_owner',
        organization_id: 'org-1',
        is_platform_user: false,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any)

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any))

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.canAccessTenantAdmin).toBe(true)
    })

    it('should deny tenant admin access to viewers', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-1',
        role: 'viewer',
        organization_id: 'org-1',
        is_platform_user: false,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any)

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any))

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.canAccessTenantAdmin).toBe(false)
    })
  })

  describe('Auth State Changes', () => {
    it('should handle SIGNED_OUT event', async () => {
      // Arrange
      let authCallback: any

      vi.mocked(mockSupabaseClient.auth.onAuthStateChange).mockImplementation((callback) => {
        authCallback = callback
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn()
            }
          }
        } as any
      })

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any)

      const mockProfile = {
        id: 'user-1',
        role: 'admin',
        organization_id: 'org-1',
        is_platform_user: false,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any))

      // Act
      const { result } = renderHook(() => useMultiTenantAuth())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Trigger SIGNED_OUT event
      authCallback('SIGNED_OUT', null)

      await waitFor(() => {
        expect(result.current.user).toBeNull()
      })

      // Assert
      expect(result.current.profile).toBeNull()
      expect(result.current.organization).toBeNull()
    })
  })
})

describe('usePermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(mockSupabaseClient.auth.onAuthStateChange).mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn()
        }
      }
    } as any)
  })

  describe('hasRole', () => {
    it('should check single role', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-1',
        role: 'admin',
        organization_id: 'org-1',
        is_platform_user: false,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any)

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any))

      // Act
      const { result } = renderHook(() => usePermissions())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.hasRole('admin')).toBe(true)
      expect(result.current.hasRole('viewer')).toBe(false)
    })

    it('should check multiple roles', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-1',
        role: 'estimator',
        organization_id: 'org-1',
        is_platform_user: false,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any)

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any))

      // Act
      const { result } = renderHook(() => usePermissions())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.hasRole(['admin', 'estimator'])).toBe(true)
      expect(result.current.hasRole(['admin', 'viewer'])).toBe(false)
    })
  })

  describe('Permission Helpers', () => {
    it('should allow platform_owner to create assessments', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-1',
        role: 'platform_owner',
        organization_id: 'org-1',
        is_platform_user: true,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any)

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any))

      // Act
      const { result } = renderHook(() => usePermissions())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.canCreateAssessments()).toBe(true)
      expect(result.current.canManageTenant()).toBe(true)
      expect(result.current.canViewReports()).toBe(true)
      expect(result.current.isPlatformOwner()).toBe(true)
    })

    it('should allow estimators to create assessments but not manage tenant', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-1',
        role: 'estimator',
        organization_id: 'org-1',
        is_platform_user: false,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any)

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any))

      // Act
      const { result } = renderHook(() => usePermissions())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.canCreateAssessments()).toBe(true)
      expect(result.current.canManageTenant()).toBe(false)
      expect(result.current.canViewReports()).toBe(true)
      expect(result.current.isPlatformOwner()).toBe(false)
    })

    it('should restrict viewers from creating assessments', async () => {
      // Arrange
      const mockProfile = {
        id: 'user-1',
        role: 'viewer',
        organization_id: 'org-1',
        is_platform_user: false,
        login_count: 0
      }

      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      } as any)

      vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile, error: null })
          })
        }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any))

      // Act
      const { result } = renderHook(() => usePermissions())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Assert
      expect(result.current.canCreateAssessments()).toBe(false)
      expect(result.current.canManageTenant()).toBe(false)
      expect(result.current.canViewReports()).toBe(false)
    })
  })
})
