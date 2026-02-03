import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock cache service functionality
interface CacheEntry<T = any> {
  key: string
  value: T
  ttl: number
  createdAt: number
  accessCount: number
  lastAccessed: number
}

class CacheService {
  private cache: Map<string, CacheEntry> = new Map()
  private defaultTTL: number = 300000 // 5 minutes in milliseconds
  private maxSize: number = 1000
  private cleanupInterval: NodeJS.Timeout | null = null

  constructor(options: { defaultTTL?: number; maxSize?: number; autoCleanup?: boolean } = {}) {
    this.defaultTTL = options.defaultTTL || this.defaultTTL
    this.maxSize = options.maxSize || this.maxSize

    if (options.autoCleanup !== false) {
      this.startAutoCleanup()
    }
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now()
    const entryTTL = ttl || this.defaultTTL

    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictOldest()
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      ttl: entryTTL,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now
    }

    this.cache.set(key, entry)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined
    
    if (!entry) {
      return null
    }

    const now = Date.now()
    
    // Check if expired
    if (now - entry.createdAt > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // Update access statistics
    entry.accessCount++
    entry.lastAccessed = now
    this.cache.set(key, entry)

    return entry.value
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return false
    }

    // Check if expired
    if (Date.now() - entry.createdAt > entry.ttl) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  values<T>(): T[] {
    return Array.from(this.cache.values()).map(entry => entry.value as T)
  }

  entries<T>(): Array<[string, T]> {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.value as T])
  }

  // Get or set pattern
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    
    if (cached !== null) {
      return cached
    }

    const value = await factory()
    this.set(key, value, ttl)
    return value
  }

  // Batch operations
  setMany<T>(entries: Array<{ key: string; value: T; ttl?: number }>): void {
    entries.forEach(({ key, value, ttl }) => {
      this.set(key, value, ttl)
    })
  }

  getMany<T>(keys: string[]): Array<{ key: string; value: T | null }> {
    return keys.map(key => ({
      key,
      value: this.get<T>(key)
    }))
  }

  deleteMany(keys: string[]): number {
    let deletedCount = 0
    keys.forEach(key => {
      if (this.delete(key)) {
        deletedCount++
      }
    })
    return deletedCount
  }

  // Cache statistics
  getStats(): {
    size: number
    maxSize: number
    hitRate: number
    totalAccesses: number
    averageAccessCount: number
    oldestEntry: number | null
    newestEntry: number | null
  } {
    const entries = Array.from(this.cache.values())
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0)
    const totalPossibleHits = entries.length > 0 ? totalAccesses : 1
    const hitRate = totalAccesses / totalPossibleHits

    const creationTimes = entries.map(e => e.createdAt)
    const oldestEntry = creationTimes.length > 0 ? Math.min(...creationTimes) : null
    const newestEntry = creationTimes.length > 0 ? Math.max(...creationTimes) : null

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      totalAccesses,
      averageAccessCount: entries.length > 0 ? totalAccesses / entries.length : 0,
      oldestEntry,
      newestEntry
    }
  }

  // Get entries by access pattern
  getMostAccessed(limit: number = 10): Array<{ key: string; accessCount: number }> {
    return Array.from(this.cache.entries())
      .sort(([, a], [, b]) => b.accessCount - a.accessCount)
      .slice(0, limit)
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
  }

  getLeastAccessed(limit: number = 10): Array<{ key: string; accessCount: number }> {
    return Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.accessCount - b.accessCount)
      .slice(0, limit)
      .map(([key, entry]) => ({ key, accessCount: entry.accessCount }))
  }

  // Cleanup operations
  cleanup(): number {
    const now = Date.now()
    let removedCount = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.createdAt > entry.ttl) {
        this.cache.delete(key)
        removedCount++
      }
    }

    return removedCount
  }

  private evictOldest(): void {
    if (this.cache.size === 0) return

    // Find the oldest entry (LRU)
    let oldestKey = ''
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }

  private startAutoCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.clear()
  }

  // Namespace support
  namespace(prefix: string): CacheNamespace {
    return new CacheNamespace(this, prefix)
  }
}

class CacheNamespace {
  constructor(private cache: CacheService, private prefix: string) {}

  private getKey(key: string): string {
    return `${this.prefix}:${key}`
  }

  set<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(this.getKey(key), value, ttl)
  }

  get<T>(key: string): T | null {
    return this.cache.get<T>(this.getKey(key))
  }

  has(key: string): boolean {
    return this.cache.has(this.getKey(key))
  }

  delete(key: string): boolean {
    return this.cache.delete(this.getKey(key))
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    return this.cache.getOrSet(this.getKey(key), factory, ttl)
  }

  clear(): void {
    const keys = this.cache.keys().filter(key => key.startsWith(`${this.prefix}:`))
    keys.forEach(key => this.cache.delete(key))
  }

  keys(): string[] {
    return this.cache.keys()
      .filter(key => key.startsWith(`${this.prefix}:`))
      .map(key => key.substring(this.prefix.length + 1))
  }
}

describe('CacheService', () => {
  let cache: CacheService

  beforeEach(() => {
    cache = new CacheService({ autoCleanup: false }) // Disable auto cleanup for tests
  })

  afterEach(() => {
    cache.destroy()
    vi.clearAllMocks()
  })

  describe('basic operations', () => {
    it('should set and get values', () => {
      cache.set('key1', 'value1')
      
      expect(cache.get('key1')).toBe('value1')
    })

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull()
    })

    it('should check if key exists', () => {
      cache.set('key1', 'value1')
      
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('nonexistent')).toBe(false)
    })

    it('should delete keys', () => {
      cache.set('key1', 'value1')
      
      expect(cache.delete('key1')).toBe(true)
      expect(cache.get('key1')).toBeNull()
      expect(cache.delete('nonexistent')).toBe(false)
    })

    it('should clear all entries', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      
      cache.clear()
      
      expect(cache.size()).toBe(0)
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()
    })

    it('should return correct size', () => {
      expect(cache.size()).toBe(0)
      
      cache.set('key1', 'value1')
      expect(cache.size()).toBe(1)
      
      cache.set('key2', 'value2')
      expect(cache.size()).toBe(2)
      
      cache.delete('key1')
      expect(cache.size()).toBe(1)
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      cache.set('key1', 'value1', 100) // 100ms TTL
      
      expect(cache.get('key1')).toBe('value1')
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(cache.get('key1')).toBeNull()
      expect(cache.has('key1')).toBe(false)
    })

    it('should use default TTL when not specified', () => {
      const shortTTLCache = new CacheService({ defaultTTL: 50, autoCleanup: false })
      
      shortTTLCache.set('key1', 'value1') // Uses default TTL of 50ms
      
      setTimeout(() => {
        expect(shortTTLCache.get('key1')).toBeNull()
        shortTTLCache.destroy()
      }, 100)
    })

    it('should handle different TTLs for different keys', async () => {
      cache.set('short', 'value1', 50)   // 50ms
      cache.set('long', 'value2', 200)   // 200ms
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(cache.get('short')).toBeNull()
      expect(cache.get('long')).toBe('value2')
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(cache.get('long')).toBeNull()
    })
  })

  describe('data types', () => {
    it('should handle different data types', () => {
      cache.set('string', 'hello')
      cache.set('number', 42)
      cache.set('boolean', true)
      cache.set('object', { name: 'test', value: 123 })
      cache.set('array', [1, 2, 3])
      cache.set('null', null)
      
      expect(cache.get('string')).toBe('hello')
      expect(cache.get('number')).toBe(42)
      expect(cache.get('boolean')).toBe(true)
      expect(cache.get('object')).toEqual({ name: 'test', value: 123 })
      expect(cache.get('array')).toEqual([1, 2, 3])
      expect(cache.get('null')).toBeNull()
    })
  })

  describe('collection methods', () => {
    beforeEach(() => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
    })

    it('should return all keys', () => {
      const keys = cache.keys()
      
      expect(keys).toHaveLength(3)
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
      expect(keys).toContain('key3')
    })

    it('should return all values', () => {
      const values = cache.values<string>()
      
      expect(values).toHaveLength(3)
      expect(values).toContain('value1')
      expect(values).toContain('value2')
      expect(values).toContain('value3')
    })

    it('should return all entries', () => {
      const entries = cache.entries<string>()
      
      expect(entries).toHaveLength(3)
      expect(entries).toContainEqual(['key1', 'value1'])
      expect(entries).toContainEqual(['key2', 'value2'])
      expect(entries).toContainEqual(['key3', 'value3'])
    })
  })

  describe('getOrSet pattern', () => {
    it('should return cached value if exists', async () => {
      cache.set('key1', 'cached-value')
      
      const factory = vi.fn().mockResolvedValue('new-value')
      const result = await cache.getOrSet('key1', factory)
      
      expect(result).toBe('cached-value')
      expect(factory).not.toHaveBeenCalled()
    })

    it('should call factory and cache result if not exists', async () => {
      const factory = vi.fn().mockResolvedValue('factory-value')
      const result = await cache.getOrSet('key1', factory, 1000)
      
      expect(result).toBe('factory-value')
      expect(factory).toHaveBeenCalledOnce()
      expect(cache.get('key1')).toBe('factory-value')
    })

    it('should handle synchronous factory functions', async () => {
      const factory = vi.fn().mockReturnValue('sync-value')
      const result = await cache.getOrSet('key1', factory)
      
      expect(result).toBe('sync-value')
      expect(cache.get('key1')).toBe('sync-value')
    })
  })

  describe('batch operations', () => {
    it('should set many entries at once', () => {
      const entries = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2', ttl: 1000 },
        { key: 'key3', value: 'value3' }
      ]
      
      cache.setMany(entries)
      
      expect(cache.get('key1')).toBe('value1')
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
      expect(cache.size()).toBe(3)
    })

    it('should get many entries at once', () => {
      cache.set('key1', 'value1')
      cache.set('key3', 'value3')
      
      const results = cache.getMany<string>(['key1', 'key2', 'key3'])
      
      expect(results).toEqual([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: null },
        { key: 'key3', value: 'value3' }
      ])
    })

    it('should delete many entries at once', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      const deletedCount = cache.deleteMany(['key1', 'key2', 'nonexistent'])
      
      expect(deletedCount).toBe(2)
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()
      expect(cache.get('key3')).toBe('value3')
    })
  })

  describe('statistics and analytics', () => {
    beforeEach(() => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      // Access some keys to build statistics
      cache.get('key1')
      cache.get('key1')
      cache.get('key2')
    })

    it('should provide cache statistics', () => {
      const stats = cache.getStats()
      
      expect(stats.size).toBe(3)
      expect(stats.totalAccesses).toBe(3)
      expect(stats.averageAccessCount).toBe(1) // 3 accesses / 3 entries
      expect(stats.oldestEntry).toBeDefined()
      expect(stats.newestEntry).toBeDefined()
    })

    it('should track most accessed entries', () => {
      const mostAccessed = cache.getMostAccessed(2)
      
      expect(mostAccessed).toHaveLength(2)
      expect(mostAccessed[0].key).toBe('key1')
      expect(mostAccessed[0].accessCount).toBe(2)
      expect(mostAccessed[1].key).toBe('key2')
      expect(mostAccessed[1].accessCount).toBe(1)
    })

    it('should track least accessed entries', () => {
      const leastAccessed = cache.getLeastAccessed(2)
      
      expect(leastAccessed).toHaveLength(2)
      expect(leastAccessed[0].key).toBe('key3')
      expect(leastAccessed[0].accessCount).toBe(0)
    })
  })

  describe('size limits and eviction', () => {
    it('should evict oldest entries when max size is reached', () => {
      const smallCache = new CacheService({ maxSize: 2, autoCleanup: false })
      
      smallCache.set('key1', 'value1')
      smallCache.set('key2', 'value2')
      
      // Access key1 to make it more recently used
      smallCache.get('key1')
      
      // This should evict key2 (least recently used)
      smallCache.set('key3', 'value3')
      
      expect(smallCache.size()).toBe(2)
      expect(smallCache.get('key1')).toBe('value1')
      expect(smallCache.get('key2')).toBeNull()
      expect(smallCache.get('key3')).toBe('value3')
      
      smallCache.destroy()
    })
  })

  describe('cleanup operations', () => {
    it('should manually cleanup expired entries', async () => {
      cache.set('key1', 'value1', 50)  // Will expire
      cache.set('key2', 'value2', 1000) // Won't expire
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      const removedCount = cache.cleanup()
      
      expect(removedCount).toBe(1)
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBe('value2')
      expect(cache.size()).toBe(1)
    })
  })

  describe('namespaces', () => {
    it('should create isolated namespaces', () => {
      const userCache = cache.namespace('users')
      const productCache = cache.namespace('products')
      
      userCache.set('123', { name: 'John Doe' })
      productCache.set('123', { name: 'Widget' })
      
      expect(userCache.get('123')).toEqual({ name: 'John Doe' })
      expect(productCache.get('123')).toEqual({ name: 'Widget' })
      
      // Verify they don't interfere with each other
      expect(cache.get('123')).toBeNull()
      expect(cache.size()).toBe(2) // Both namespaced entries exist in main cache
    })

    it('should support namespace operations', () => {
      const ns = cache.namespace('test')
      
      ns.set('key1', 'value1')
      ns.set('key2', 'value2')
      
      expect(ns.has('key1')).toBe(true)
      expect(ns.delete('key1')).toBe(true)
      expect(ns.has('key1')).toBe(false)
      
      const keys = ns.keys()
      expect(keys).toEqual(['key2'])
    })

    it('should support namespace getOrSet', async () => {
      const ns = cache.namespace('async')
      
      const factory = vi.fn().mockResolvedValue('async-value')
      const result = await ns.getOrSet('key1', factory)
      
      expect(result).toBe('async-value')
      expect(ns.get('key1')).toBe('async-value')
    })

    it('should clear only namespace entries', () => {
      const ns1 = cache.namespace('ns1')
      const ns2 = cache.namespace('ns2')
      
      ns1.set('key1', 'value1')
      ns1.set('key2', 'value2')
      ns2.set('key1', 'value3')
      cache.set('global', 'global-value')
      
      ns1.clear()
      
      expect(ns1.get('key1')).toBeNull()
      expect(ns1.get('key2')).toBeNull()
      expect(ns2.get('key1')).toBe('value3')
      expect(cache.get('global')).toBe('global-value')
    })
  })

  describe('integration tests', () => {
    it('should handle complex caching scenario', async () => {
      // Simulate user session cache
      const sessionCache = cache.namespace('sessions')
      const userCache = cache.namespace('users')
      
      // Cache user data
      await userCache.getOrSet('user-123', async () => {
        return { id: 'user-123', name: 'John Doe', email: 'john@example.com' }
      })
      
      // Cache session
      sessionCache.set('session-abc', { userId: 'user-123', expires: Date.now() + 3600000 }, 3600000)
      
      // Verify data is accessible
      const user = userCache.get('user-123')
      const session = sessionCache.get('session-abc')
      
      expect(user).toEqual({ id: 'user-123', name: 'John Doe', email: 'john@example.com' })
      expect(session).toEqual({ userId: 'user-123', expires: expect.any(Number) })
      
      // Check overall cache stats
      const stats = cache.getStats()
      expect(stats.size).toBe(2)
      expect(stats.totalAccesses).toBeGreaterThan(0)
    })

    it('should handle high-frequency access patterns', () => {
      // Simulate frequent access to popular data
      cache.set('popular-item', { data: 'frequently accessed' })
      cache.set('rare-item', { data: 'rarely accessed' })
      
      // Access popular item many times
      for (let i = 0; i < 100; i++) {
        cache.get('popular-item')
      }
      
      // Access rare item once
      cache.get('rare-item')
      
      const mostAccessed = cache.getMostAccessed(1)
      expect(mostAccessed[0].key).toBe('popular-item')
      expect(mostAccessed[0].accessCount).toBe(100)
      
      const leastAccessed = cache.getLeastAccessed(1)
      expect(leastAccessed[0].key).toBe('rare-item')
      expect(leastAccessed[0].accessCount).toBe(1)
    })
  })
})