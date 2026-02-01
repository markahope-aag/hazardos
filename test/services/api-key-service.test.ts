import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiKeyService } from '@/lib/services/api-key-service'
import { createHash } from 'crypto'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          // For list queries
        }))
      })),
      is: vi.fn(() => ({
        order: vi.fn()
      })),
      order: vi.fn()
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

describe('ApiKeyService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create a new API key with correct format', async () => {
      // Arrange
      const mockInsert = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'key-123' },
            error: null
          })
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        insert: vi.fn().mockReturnValue(mockInsert)
      } as any)

      // Act
      const result = await ApiKeyService.create(
        'org-456',
        'user-789',
        {
          name: 'Test API Key',
          scopes: ['customers:read', 'jobs:read']
        }
      )

      // Assert
      expect(result.key).toMatch(/^hzd_live_/)
      expect(result.id).toBe('key-123')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('api_keys')
    })

    it('should hash the API key for secure storage', async () => {
      // Arrange
      const mockInsert = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'key-123' },
            error: null
          })
        })
      }

      let insertedData: any = null
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data
          return mockInsert
        })
      } as any)

      // Act
      const result = await ApiKeyService.create(
        'org-456',
        'user-789',
        {
          name: 'Test API Key',
          scopes: ['customers:read']
        }
      )

      // Assert
      expect(insertedData.key_hash).toBeDefined()
      expect(insertedData.key_hash).not.toBe(result.key)
      expect(insertedData.key_hash).toHaveLength(64) // SHA-256 produces 64 hex chars
    })

    it('should set default rate limit if not provided', async () => {
      // Arrange
      const mockInsert = {
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'key-123' },
            error: null
          })
        })
      }

      let insertedData: any = null
      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        insert: vi.fn().mockImplementation((data) => {
          insertedData = data
          return mockInsert
        })
      } as any)

      // Act
      await ApiKeyService.create(
        'org-456',
        'user-789',
        {
          name: 'Test API Key',
          scopes: ['customers:read']
        }
      )

      // Assert
      expect(insertedData.rate_limit).toBe(1000)
    })
  })

  describe('validate', () => {
    it('should validate a correct API key', async () => {
      // Arrange
      const testKey = 'hzd_live_testkey123456'
      const keyHash = createHash('sha256').update(testKey).digest('hex')
      const keyPrefix = testKey.substring(0, 16)

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'key-123',
          organization_id: 'org-456',
          key_hash: keyHash,
          key_prefix: keyPrefix,
          scopes: ['customers:read'],
          rate_limit: 1000,
          is_active: true,
          revoked_at: null,
          expires_at: null
        },
        error: null
      })

      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: mockEq1 }),
        update: vi.fn().mockReturnValue({ eq: vi.fn() })
      } as any)

      // Act
      const result = await ApiKeyService.validate(testKey)

      // Assert
      expect(result.valid).toBe(true)
      expect(result.organizationId).toBe('org-456')
      expect(result.apiKey).toBeDefined()
    })

    it('should reject API key with invalid format', async () => {
      // Arrange
      const invalidKey = 'invalid_key_format'

      // Act
      const result = await ApiKeyService.validate(invalidKey)

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid key format')
    })

    it('should reject revoked API key', async () => {
      // Arrange
      const testKey = 'hzd_live_testkey123456'
      const keyHash = createHash('sha256').update(testKey).digest('hex')

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'key-123',
          organization_id: 'org-456',
          key_hash: keyHash,
          scopes: ['customers:read'],
          is_active: true,
          revoked_at: '2026-01-31T10:00:00Z', // Revoked
          expires_at: null
        },
        error: null
      })

      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: mockEq1 })
      } as any)

      // Act
      const result = await ApiKeyService.validate(testKey)

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe('API key has been revoked')
    })

    it('should reject inactive API key', async () => {
      // Arrange
      const testKey = 'hzd_live_testkey123456'
      const keyHash = createHash('sha256').update(testKey).digest('hex')

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'key-123',
          organization_id: 'org-456',
          key_hash: keyHash,
          scopes: ['customers:read'],
          is_active: false, // Inactive
          revoked_at: null,
          expires_at: null
        },
        error: null
      })

      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: mockEq1 })
      } as any)

      // Act
      const result = await ApiKeyService.validate(testKey)

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe('API key is inactive')
    })

    it('should reject expired API key', async () => {
      // Arrange
      const testKey = 'hzd_live_testkey123456'
      const keyHash = createHash('sha256').update(testKey).digest('hex')
      const pastDate = new Date('2025-01-01T00:00:00Z').toISOString()

      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'key-123',
          organization_id: 'org-456',
          key_hash: keyHash,
          scopes: ['customers:read'],
          is_active: true,
          revoked_at: null,
          expires_at: pastDate // Expired
        },
        error: null
      })

      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: mockEq1 })
      } as any)

      // Act
      const result = await ApiKeyService.validate(testKey)

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe('API key has expired')
    })

    it('should reject API key that does not exist', async () => {
      // Arrange
      const testKey = 'hzd_live_nonexistent'

      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' }
      })

      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: mockEq1 })
      } as any)

      // Act
      const result = await ApiKeyService.validate(testKey)

      // Assert
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid API key')
    })
  })

  describe('hasScope', () => {
    it('should return true when API key has required scope', () => {
      // Arrange
      const apiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read', 'customers:write', 'jobs:read']
      } as any

      // Act
      const result = ApiKeyService.hasScope(apiKey, 'customers:read')

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when API key lacks required scope', () => {
      // Arrange
      const apiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read']
      } as any

      // Act
      const result = ApiKeyService.hasScope(apiKey, 'customers:write')

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('hasAnyScope', () => {
    it('should return true when API key has any of the required scopes', () => {
      // Arrange
      const apiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read', 'jobs:read']
      } as any

      // Act
      const result = ApiKeyService.hasAnyScope(apiKey, ['customers:write', 'jobs:read'])

      // Assert
      expect(result).toBe(true)
    })

    it('should return false when API key has none of the required scopes', () => {
      // Arrange
      const apiKey = {
        id: 'key-123',
        organization_id: 'org-456',
        scopes: ['customers:read']
      } as any

      // Act
      const result = ApiKeyService.hasAnyScope(apiKey, ['customers:write', 'jobs:write'])

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('revoke', () => {
    it('should set revoked_at and is_active to false', async () => {
      // Arrange
      let updateData: any = null
      const mockUpdate = {
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        update: vi.fn().mockImplementation((data) => {
          updateData = data
          return mockUpdate
        })
      } as any)

      // Act
      await ApiKeyService.revoke('key-123')

      // Assert
      expect(updateData.is_active).toBe(false)
      expect(updateData.revoked_at).toBeDefined()
      expect(mockUpdate.eq).toHaveBeenCalledWith('id', 'key-123')
    })
  })

  describe('checkRateLimit', () => {
    it('should allow request when under rate limit', async () => {
      // Arrange
      const futureResetDate = new Date(Date.now() + 3600000).toISOString()

      const mockEq = {
        single: vi.fn().mockResolvedValue({
          data: {
            rate_limit: 1000,
            rate_limit_count: 500,
            rate_limit_reset_at: futureResetDate
          },
          error: null
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockEq)
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn()
        })
      } as any)

      // Act
      const result = await ApiKeyService.checkRateLimit('key-123')

      // Assert
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(499) // 1000 - 500 - 1
    })

    it('should deny request when rate limit exceeded', async () => {
      // Arrange
      const futureResetDate = new Date(Date.now() + 3600000).toISOString()

      const mockEq = {
        single: vi.fn().mockResolvedValue({
          data: {
            rate_limit: 1000,
            rate_limit_count: 1000, // At limit
            rate_limit_reset_at: futureResetDate
          },
          error: null
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockEq)
        })
      } as any)

      // Act
      const result = await ApiKeyService.checkRateLimit('key-123')

      // Assert
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reset counter when reset time has passed', async () => {
      // Arrange
      const pastResetDate = new Date(Date.now() - 3600000).toISOString()

      const mockEq = {
        single: vi.fn().mockResolvedValue({
          data: {
            rate_limit: 1000,
            rate_limit_count: 1000, // Was at limit
            rate_limit_reset_at: pastResetDate // But reset time passed
          },
          error: null
        })
      }

      let updateData: any = null
      const mockUpdate = {
        eq: vi.fn()
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockEq)
        }),
        update: vi.fn().mockImplementation((data) => {
          updateData = data
          return mockUpdate
        })
      } as any)

      // Act
      const result = await ApiKeyService.checkRateLimit('key-123')

      // Assert
      expect(result.allowed).toBe(true)
      expect(updateData.rate_limit_count).toBe(1) // Reset to 1
      expect(updateData.rate_limit_reset_at).toBeDefined()
    })
  })

  describe('list', () => {
    it('should list API keys for an organization', async () => {
      // Arrange
      const mockKeys = [
        { id: 'key-1', name: 'Key 1', organization_id: 'org-123' },
        { id: 'key-2', name: 'Key 2', organization_id: 'org-123' }
      ]

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockKeys,
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              order: mockOrder
            })
          })
        })
      } as any)

      // Act
      const result = await ApiKeyService.list('org-123')

      // Assert
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('key-1')
    })

    it('should filter out revoked keys', async () => {
      // Arrange
      const mockIsFilter = {
        order: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      const mockEqFilter = {
        is: vi.fn().mockImplementation((field, value) => {
          expect(field).toBe('revoked_at')
          expect(value).toBe(null)
          return mockIsFilter
        })
      }

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockEqFilter)
        })
      } as any)

      // Act
      await ApiKeyService.list('org-123')

      // Assert
      expect(mockEqFilter.is).toHaveBeenCalledWith('revoked_at', null)
    })
  })
})
