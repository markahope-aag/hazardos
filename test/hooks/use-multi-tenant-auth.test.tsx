import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useMultiTenantAuth, usePermissions } from '@/lib/hooks/use-multi-tenant-auth'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Environment variables used by the hook
const SUPABASE_URL = 'http://localhost:54321'
const SUPABASE_KEY = 'test-anon-key'

function setupMocks(opts: {
  user?: { id: string; email?: string } | null
  profile?: Record<string, unknown> | null
  org?: Record<string, unknown> | null
  profileError?: boolean
}) {
  const { user = null, profile = null, org = null, profileError = false } = opts

  // Mock getSession
  mockSupabaseClient.auth.getSession.mockResolvedValue({
    data: {
      session: user
        ? { user, access_token: 'test-token' }
        : null,
    },
    error: null,
  })

  // Mock fetch for profile and org REST calls
  const originalFetch = global.fetch
  global.fetch = vi.fn().mockImplementation((url: string, options?: RequestInit) => {
    const urlStr = String(url)

    // Profile fetch
    if (urlStr.includes('/rest/v1/profiles')) {
      if (options?.method === 'PATCH') {
        // Update last login - fire and forget
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      }
      if (profileError) {
        return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(profile),
      })
    }

    // Org fetch
    if (urlStr.includes('/rest/v1/organizations')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(org),
      })
    }

    // Fallback to original
    if (originalFetch) return originalFetch(url, options as RequestInit)
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) })
  }) as typeof global.fetch

  return () => {
    global.fetch = originalFetch
  }
}

describe('useMultiTenantAuth', () => {
  let cleanupFetch: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })

    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_KEY

    // Default mock for auth state change subscription
    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })

    cleanupFetch = () => {}
  })

  afterEach(() => {
    cleanupFetch()
    vi.useRealTimers()
  })

  describe('Authentication State', () => {
    it('should load user, profile, and organization data', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'admin',
        organization_id: 'org-456',
        is_platform_user: false,
        login_count: 5,
      }
      const mockOrg = {
        id: 'org-456',
        name: 'Test Organization',
        slug: 'test-org',
        subscription_status: 'active',
      }

      cleanupFetch = setupMocks({ user: mockUser, profile: mockProfile, org: mockOrg })

      const { result } = renderHook(() => useMultiTenantAuth())

      // Allow setTimeout(0) in the hook to execute
      await act(async () => {
        vi.advanceTimersByTime(10)
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toEqual(mockProfile)
      expect(result.current.organization).toEqual(mockOrg)
      expect(result.current.isPlatformUser).toBe(false)
    })

    it('should handle unauthenticated state', async () => {
      cleanupFetch = setupMocks({ user: null })

      const { result } = renderHook(() => useMultiTenantAuth())

      await act(async () => {
        vi.advanceTimersByTime(10)
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
      expect(result.current.organization).toBeNull()
    })

    it('should handle profile fetch error', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }

      cleanupFetch = setupMocks({ user: mockUser, profileError: true })

      const { result } = renderHook(() => useMultiTenantAuth())

      await act(async () => {
        vi.advanceTimersByTime(10)
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // When profile fetch fails, user is set but profile stays null
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toBeNull()
    })

    it('should update last login timestamp', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const mockProfile = {
        id: 'user-123',
        role: 'admin',
        organization_id: 'org-456',
        is_platform_user: false,
        login_count: 5,
      }

      cleanupFetch = setupMocks({ user: mockUser, profile: mockProfile })

      const { result } = renderHook(() => useMultiTenantAuth())

      await act(async () => {
        vi.advanceTimersByTime(10)
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Verify the PATCH call was made for last login update
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const patchCall = fetchCalls.find(
        (call: unknown[]) =>
          String(call[0]).includes('/rest/v1/profiles') &&
          (call[1] as RequestInit)?.method === 'PATCH'
      )
      expect(patchCall).toBeDefined()
      expect(result.current.profile).toEqual(mockProfile)
    })
  })

  describe('Platform User Detection', () => {
    it('should identify platform users', async () => {
      const mockUser = { id: 'user-platform', email: 'admin@platform.com' }
      const mockProfile = {
        id: 'user-platform',
        role: 'platform_owner',
        organization_id: 'org-platform',
        is_platform_user: true,
        login_count: 0,
      }

      cleanupFetch = setupMocks({ user: mockUser, profile: mockProfile })

      const { result } = renderHook(() => useMultiTenantAuth())

      await act(async () => {
        vi.advanceTimersByTime(10)
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isPlatformUser).toBe(true)
      expect(result.current.canAccessPlatformAdmin).toBe(true)
    })

    it('should identify regular tenant users', async () => {
      const mockUser = { id: 'user-tenant', email: 'user@tenant.com' }
      const mockProfile = {
        id: 'user-tenant',
        role: 'admin',
        organization_id: 'org-tenant-1',
        is_platform_user: false,
        login_count: 0,
      }

      cleanupFetch = setupMocks({ user: mockUser, profile: mockProfile })

      const { result } = renderHook(() => useMultiTenantAuth())

      await act(async () => {
        vi.advanceTimersByTime(10)
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.isPlatformUser).toBe(false)
      expect(result.current.canAccessPlatformAdmin).toBe(false)
    })
  })

  describe('Role-based Access Control', () => {
    const testRoleAccess = async (
      role: string,
      isPlatformUser: boolean,
      expected: { canAccessPlatformAdmin: boolean; canAccessTenantAdmin: boolean }
    ) => {
      const mockUser = { id: 'user-1' }
      const mockProfile = {
        id: 'user-1',
        role,
        organization_id: 'org-1',
        is_platform_user: isPlatformUser,
        login_count: 0,
      }

      const cleanup = setupMocks({ user: mockUser, profile: mockProfile })

      const { result } = renderHook(() => useMultiTenantAuth())

      await act(async () => {
        vi.advanceTimersByTime(10)
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.canAccessPlatformAdmin).toBe(expected.canAccessPlatformAdmin)
      expect(result.current.canAccessTenantAdmin).toBe(expected.canAccessTenantAdmin)

      cleanup()
    }

    it('should grant platform admin access to platform_owner', async () => {
      cleanupFetch = () => {}
      await testRoleAccess('platform_owner', true, {
        canAccessPlatformAdmin: true,
        canAccessTenantAdmin: true,
      })
    })

    it('should grant platform admin access to platform_admin', async () => {
      cleanupFetch = () => {}
      await testRoleAccess('platform_admin', true, {
        canAccessPlatformAdmin: true,
        canAccessTenantAdmin: true,
      })
    })

    it('should deny platform admin access to tenant users', async () => {
      cleanupFetch = () => {}
      await testRoleAccess('admin', false, {
        canAccessPlatformAdmin: false,
        canAccessTenantAdmin: true,
      })
    })

    it('should grant tenant admin access to tenant_owner', async () => {
      cleanupFetch = () => {}
      await testRoleAccess('tenant_owner', false, {
        canAccessPlatformAdmin: false,
        canAccessTenantAdmin: true,
      })
    })

    it('should deny tenant admin access to viewers', async () => {
      cleanupFetch = () => {}
      await testRoleAccess('viewer', false, {
        canAccessPlatformAdmin: false,
        canAccessTenantAdmin: false,
      })
    })
  })

  describe('Auth State Changes', () => {
    it('should handle SIGNED_OUT event', async () => {
      let authCallback: (event: string, session: unknown) => void

      mockSupabaseClient.auth.onAuthStateChange.mockImplementation(
        (callback: (event: string, session: unknown) => void) => {
          authCallback = callback
          return {
            data: {
              subscription: {
                unsubscribe: vi.fn(),
              },
            },
          }
        }
      )

      const mockUser = { id: 'user-1' }
      const mockProfile = {
        id: 'user-1',
        role: 'admin',
        organization_id: 'org-1',
        is_platform_user: false,
        login_count: 0,
      }

      cleanupFetch = setupMocks({ user: mockUser, profile: mockProfile })

      const { result } = renderHook(() => useMultiTenantAuth())

      await act(async () => {
        vi.advanceTimersByTime(10)
      })

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Trigger SIGNED_OUT event
      await act(async () => {
        authCallback!('SIGNED_OUT', null)
        vi.advanceTimersByTime(10)
      })

      await waitFor(() => {
        expect(result.current.user).toBeNull()
      })

      expect(result.current.profile).toBeNull()
      expect(result.current.organization).toBeNull()
    })
  })
})

describe('usePermissions', () => {
  let cleanupFetch: () => void

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })

    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_KEY

    mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })

    cleanupFetch = () => {}
  })

  afterEach(() => {
    cleanupFetch()
    vi.useRealTimers()
  })

  const setupPermissionsTest = async (role: string, isPlatformUser: boolean) => {
    const mockUser = { id: 'user-1' }
    const mockProfile = {
      id: 'user-1',
      role,
      organization_id: 'org-1',
      is_platform_user: isPlatformUser,
      login_count: 0,
    }

    cleanupFetch = setupMocks({ user: mockUser, profile: mockProfile })

    const { result } = renderHook(() => usePermissions())

    await act(async () => {
      vi.advanceTimersByTime(10)
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    return result
  }

  describe('hasRole', () => {
    it('should check single role', async () => {
      const result = await setupPermissionsTest('admin', false)

      expect(result.current.hasRole('admin')).toBe(true)
      expect(result.current.hasRole('viewer')).toBe(false)
    })

    it('should check multiple roles', async () => {
      const result = await setupPermissionsTest('estimator', false)

      expect(result.current.hasRole(['admin', 'estimator'])).toBe(true)
      expect(result.current.hasRole(['admin', 'viewer'])).toBe(false)
    })
  })

  describe('Permission Helpers', () => {
    it('should allow platform_owner to create assessments', async () => {
      const result = await setupPermissionsTest('platform_owner', true)

      expect(result.current.canCreateAssessments()).toBe(true)
      expect(result.current.canManageTenant()).toBe(true)
      expect(result.current.canViewReports()).toBe(true)
      expect(result.current.isPlatformOwner()).toBe(true)
    })

    it('should allow estimators to create assessments but not manage tenant', async () => {
      const result = await setupPermissionsTest('estimator', false)

      expect(result.current.canCreateAssessments()).toBe(true)
      expect(result.current.canManageTenant()).toBe(false)
      expect(result.current.canViewReports()).toBe(true)
      expect(result.current.isPlatformOwner()).toBe(false)
    })

    it('should restrict viewers from creating assessments', async () => {
      const result = await setupPermissionsTest('viewer', false)

      expect(result.current.canCreateAssessments()).toBe(false)
      expect(result.current.canManageTenant()).toBe(false)
      expect(result.current.canViewReports()).toBe(false)
    })
  })
})
