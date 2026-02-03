import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { defaultConfig, shouldTrack, isExcludedPath, sanitizeProperties } from '@/lib/analytics/config'

describe('analytics config', () => {
  const originalEnv = process.env
  const originalWindow = global.window
  const originalNavigator = global.navigator

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    global.window = originalWindow
    global.navigator = originalNavigator
  })

  describe('defaultConfig', () => {
    it('should be enabled in production', async () => {
      process.env.NODE_ENV = 'production'
      const { defaultConfig: prodConfig } = await import('@/lib/analytics/config')
      expect(prodConfig.enabled).toBe(true)
      expect(prodConfig.debug).toBe(false)
    })

    it('should be disabled but debug enabled in development', async () => {
      process.env.NODE_ENV = 'development'
      const { defaultConfig: devConfig } = await import('@/lib/analytics/config')
      expect(devConfig.enabled).toBe(false)
      expect(devConfig.debug).toBe(true)
    })

    it('should have correct default values', () => {
      expect(defaultConfig.sampleRate).toBe(1.0)
      expect(defaultConfig.respectDoNotTrack).toBe(true)
      expect(defaultConfig.excludePaths).toContain('/api/health')
      expect(defaultConfig.excludePaths).toContain('/api/ping')
      expect(defaultConfig.excludePaths).toContain('/_next')
      expect(defaultConfig.excludePaths).toContain('/favicon.ico')
    })
  })

  describe('shouldTrack', () => {
    beforeEach(() => {
      // Mock window and navigator
      global.window = {} as any
      global.navigator = { doNotTrack: undefined } as any
    })

    it('should return false in server environment', () => {
      // @ts-expect-error - Testing server environment by deleting window
      delete global.window
      expect(shouldTrack()).toBe(false)
    })

    it('should return false when analytics disabled and not debug', async () => {
      process.env.NODE_ENV = 'test'
      const { shouldTrack: testShouldTrack } = await import('@/lib/analytics/config')
      expect(testShouldTrack()).toBe(false)
    })

    it('should return true in debug mode even when disabled', async () => {
      process.env.NODE_ENV = 'development'
      const { shouldTrack: devShouldTrack } = await import('@/lib/analytics/config')
      expect(devShouldTrack()).toBe(true)
    })

    it('should respect Do Not Track when enabled', async () => {
      process.env.NODE_ENV = 'production'
      global.navigator = { doNotTrack: '1' } as any
      const { shouldTrack: prodShouldTrack } = await import('@/lib/analytics/config')
      expect(prodShouldTrack()).toBe(false)
    })

    it('should respect Do Not Track "yes" value', async () => {
      process.env.NODE_ENV = 'production'
      global.navigator = { doNotTrack: 'yes' } as any
      const { shouldTrack: prodShouldTrack } = await import('@/lib/analytics/config')
      expect(prodShouldTrack()).toBe(false)
    })

    it('should ignore Do Not Track when not "1" or "yes"', () => {
      process.env.NODE_ENV = 'production'
      global.navigator = { doNotTrack: '0' } as any
      const { shouldTrack: prodShouldTrack } = await import('@/lib/analytics/config')
      expect(prodShouldTrack()).toBe(true)
    })

    it('should check window.doNotTrack as fallback', () => {
      process.env.NODE_ENV = 'production'
      global.navigator = {} as any
      ;(global.window as any).doNotTrack = '1'
      const { shouldTrack: prodShouldTrack } = await import('@/lib/analytics/config')
      expect(prodShouldTrack()).toBe(false)
    })

    it('should apply sampling rate', () => {
      process.env.NODE_ENV = 'production'
      global.navigator = { doNotTrack: undefined } as any
      
      // Mock Math.random to return 0.5
      const originalRandom = Math.random
      Math.random = vi.fn(() => 0.5)
      
      // Test with 0.3 sample rate (should return false since 0.5 > 0.3)
      const config = await import('@/lib/analytics/config')
      config.defaultConfig.sampleRate = 0.3
      expect(config.shouldTrack()).toBe(false)
      
      // Test with 0.7 sample rate (should return true since 0.5 < 0.7)
      config.defaultConfig.sampleRate = 0.7
      expect(config.shouldTrack()).toBe(true)
      
      Math.random = originalRandom
    })

    it('should return true with full sampling rate', () => {
      process.env.NODE_ENV = 'production'
      global.navigator = { doNotTrack: undefined } as any
      const { shouldTrack: prodShouldTrack } = await import('@/lib/analytics/config')
      expect(prodShouldTrack()).toBe(true)
    })
  })

  describe('isExcludedPath', () => {
    it('should exclude health check paths', () => {
      expect(isExcludedPath('/api/health')).toBe(true)
      expect(isExcludedPath('/api/health/status')).toBe(true)
    })

    it('should exclude ping paths', () => {
      expect(isExcludedPath('/api/ping')).toBe(true)
      expect(isExcludedPath('/api/ping/test')).toBe(true)
    })

    it('should exclude Next.js internal paths', () => {
      expect(isExcludedPath('/_next/static/chunks/main.js')).toBe(true)
      expect(isExcludedPath('/_next/image')).toBe(true)
    })

    it('should exclude favicon', () => {
      expect(isExcludedPath('/favicon.ico')).toBe(true)
    })

    it('should not exclude normal paths', () => {
      expect(isExcludedPath('/dashboard')).toBe(false)
      expect(isExcludedPath('/api/customers')).toBe(false)
      expect(isExcludedPath('/login')).toBe(false)
    })

    it('should handle path matching correctly', () => {
      expect(isExcludedPath('/api/healthcheck')).toBe(false) // doesn't start with /api/health
      expect(isExcludedPath('/favicon.ico.backup')).toBe(false) // doesn't start with /favicon.ico
    })
  })

  describe('sanitizeProperties', () => {
    it('should preserve safe properties', () => {
      const properties = {
        userId: 'user123',
        action: 'click',
        count: 42,
        isActive: true,
        nullValue: null,
        page: '/dashboard'
      }
      
      const sanitized = sanitizeProperties(properties)
      
      expect(sanitized.userId).toBe('user123')
      expect(sanitized.action).toBe('click')
      expect(sanitized.count).toBe(42)
      expect(sanitized.isActive).toBe(true)
      expect(sanitized.nullValue).toBeNull()
      expect(sanitized.page).toBe('/dashboard')
    })

    it('should remove sensitive properties', () => {
      const properties = {
        username: 'john',
        password: 'secret123',
        token: 'jwt-token',
        apiKey: 'api-key-123',
        api_key: 'another-key',
        secret: 'secret-value',
        auth: 'auth-header',
        credential: 'cred-123',
        ssn: '123-45-6789',
        credit_card: '4111-1111-1111-1111',
        private_key: 'private-key-data'
      }
      
      const sanitized = sanitizeProperties(properties)
      
      expect(sanitized.username).toBe('john')
      expect(sanitized.password).toBeUndefined()
      expect(sanitized.token).toBeUndefined()
      expect(sanitized.apiKey).toBeUndefined()
      expect(sanitized.api_key).toBeUndefined()
      expect(sanitized.secret).toBeUndefined()
      expect(sanitized.auth).toBeUndefined()
      expect(sanitized.credential).toBeUndefined()
      expect(sanitized.ssn).toBeUndefined()
      expect(sanitized.credit_card).toBeUndefined()
      expect(sanitized.private_key).toBeUndefined()
    })

    it('should handle objects by converting to string', () => {
      const properties = {
        user: { id: 123, name: 'John' },
        metadata: { version: '1.0', features: ['a', 'b'] }
      }
      
      const sanitized = sanitizeProperties(properties)
      
      expect(sanitized.user).toBe('{"id":123,"name":"John"}')
      expect(sanitized.metadata).toBe('{"version":"1.0","features":["a","b"]}')
    })

    it('should truncate long object strings', () => {
      const longObject = { data: 'x'.repeat(200) }
      const properties = { longObject }
      
      const sanitized = sanitizeProperties(properties)
      
      expect(sanitized.longObject).toHaveLength(100)
      expect(typeof sanitized.longObject).toBe('string')
    })

    it('should handle non-serializable objects', () => {
      const circularObj = { self: null as any }
      circularObj.self = circularObj
      
      const properties = { circular: circularObj }
      
      const sanitized = sanitizeProperties(properties)
      
      expect(sanitized.circular).toBe('[Object]')
    })

    it('should skip undefined values', () => {
      const properties = {
        defined: 'value',
        undefined: undefined
      }
      
      const sanitized = sanitizeProperties(properties)
      
      expect(sanitized.defined).toBe('value')
      expect(sanitized.undefined).toBeUndefined()
      expect('undefined' in sanitized).toBe(false)
    })

    it('should handle case-insensitive sensitive key matching', () => {
      const properties = {
        PASSWORD: 'secret',
        Token: 'jwt',
        API_KEY: 'key',
        myPasswordField: 'secret',
        userToken: 'token'
      }
      
      const sanitized = sanitizeProperties(properties)
      
      expect(sanitized.PASSWORD).toBeUndefined()
      expect(sanitized.Token).toBeUndefined()
      expect(sanitized.API_KEY).toBeUndefined()
      expect(sanitized.myPasswordField).toBeUndefined()
      expect(sanitized.userToken).toBeUndefined()
    })

    it('should handle arrays by converting to string', () => {
      const properties = {
        tags: ['tag1', 'tag2', 'tag3'],
        numbers: [1, 2, 3]
      }
      
      const sanitized = sanitizeProperties(properties)
      
      expect(sanitized.tags).toBe('["tag1","tag2","tag3"]')
      expect(sanitized.numbers).toBe('[1,2,3]')
    })

    it('should return empty object for all sensitive properties', () => {
      const properties = {
        password: 'secret',
        token: 'jwt',
        apiKey: 'key'
      }
      
      const sanitized = sanitizeProperties(properties)
      
      expect(Object.keys(sanitized)).toHaveLength(0)
    })
  })

  describe('integration tests', () => {
    it('should work together for complete tracking decision', () => {
      process.env.NODE_ENV = 'production'
      global.window = {} as any
      global.navigator = { doNotTrack: undefined } as any
      
      const path = '/dashboard'
      const properties = {
        page: path,
        userId: 'user123',
        password: 'secret' // should be removed
      }
      
      const shouldTrackResult = shouldTrack()
      const isExcluded = isExcludedPath(path)
      const sanitized = sanitizeProperties(properties)
      
      expect(shouldTrackResult).toBe(true)
      expect(isExcluded).toBe(false)
      expect(sanitized.page).toBe('/dashboard')
      expect(sanitized.userId).toBe('user123')
      expect(sanitized.password).toBeUndefined()
    })
  })
})