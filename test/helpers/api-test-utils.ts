import { vi } from 'vitest'

/**
 * Standard mock profile data for authenticated tests
 */
export const mockProfile = {
  organization_id: 'org-123',
  role: 'user'
}

export const mockAdminProfile = {
  organization_id: 'org-123',
  role: 'admin'
}

export const mockTenantOwnerProfile = {
  organization_id: 'org-123',
  role: 'tenant_owner'
}

/**
 * Creates a mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
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
}

/**
 * Setup authenticated user with profile for API tests
 */
export function setupAuthenticatedUser(
  mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>,
  profile = mockProfile,
  userId = 'user-1',
  email = 'test@example.com'
) {
  vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
    data: { user: { id: userId, email } },
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
}

/**
 * Setup unauthenticated user for API tests
 */
export function setupUnauthenticatedUser(
  mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>
) {
  vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
    data: { user: null },
    error: null
  })
}

/**
 * Common mocks to apply at module level for API tests
 *
 * Usage in test files:
 * ```
 * vi.mock('@/lib/middleware/unified-rate-limit', () => ({
 *   applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
 * }))
 * ```
 */
export const commonMocks = {
  rateLimit: {
    applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
  }
}

/**
 * Valid UUID for test data
 */
export const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000'
export const TEST_UUID_2 = '550e8400-e29b-41d4-a716-446655440001'
export const TEST_UUID_3 = '550e8400-e29b-41d4-a716-446655440002'
