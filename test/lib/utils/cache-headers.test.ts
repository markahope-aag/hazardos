import { describe, it, expect } from 'vitest'
import { NextResponse } from 'next/server'
import { withCacheHeaders, cachedJsonResponse } from '@/lib/utils/cache-headers'

describe('cache-headers', () => {
  describe('withCacheHeaders', () => {
    it('should add immutable cache headers', () => {
      const response = NextResponse.json({ test: 'data' })
      const result = withCacheHeaders(response, 'immutable')
      
      expect(result.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    })

    it('should add stable cache headers', () => {
      const response = NextResponse.json({ test: 'data' })
      const result = withCacheHeaders(response, 'stable')
      
      expect(result.headers.get('Cache-Control')).toBe('public, max-age=3600, stale-while-revalidate=86400')
    })

    it('should add semi-stable cache headers', () => {
      const response = NextResponse.json({ test: 'data' })
      const result = withCacheHeaders(response, 'semi-stable')
      
      expect(result.headers.get('Cache-Control')).toBe('public, max-age=300, stale-while-revalidate=600')
    })

    it('should add short cache headers', () => {
      const response = NextResponse.json({ test: 'data' })
      const result = withCacheHeaders(response, 'short')
      
      expect(result.headers.get('Cache-Control')).toBe('public, max-age=60, stale-while-revalidate=120')
    })

    it('should add private-short cache headers', () => {
      const response = NextResponse.json({ test: 'data' })
      const result = withCacheHeaders(response, 'private-short')
      
      expect(result.headers.get('Cache-Control')).toBe('private, max-age=30')
    })

    it('should add no-store cache headers', () => {
      const response = NextResponse.json({ test: 'data' })
      const result = withCacheHeaders(response, 'no-store')
      
      expect(result.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate')
    })

    it('should add Vary headers when cache key is provided', () => {
      const response = NextResponse.json({ test: 'data' })
      const result = withCacheHeaders(response, 'stable', 'test-key')
      
      expect(result.headers.get('Vary')).toBe('Authorization, Cookie')
      expect(result.headers.get('X-Cache-Key-Hash')).toBeTruthy()
    })

    it('should not add Vary headers when no cache key provided', () => {
      const response = NextResponse.json({ test: 'data' })
      const result = withCacheHeaders(response, 'stable')
      
      expect(result.headers.get('Vary')).toBeNull()
      expect(result.headers.get('X-Cache-Key-Hash')).toBeNull()
    })
  })

  describe('cachedJsonResponse', () => {
    it('should create cached JSON response with default status', () => {
      const data = { test: 'data' }
      const response = cachedJsonResponse(data, 'stable')
      
      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600, stale-while-revalidate=86400')
    })

    it('should create cached JSON response with custom status', () => {
      const data = { error: 'Not found' }
      const response = cachedJsonResponse(data, 'no-store', 404)
      
      expect(response.status).toBe(404)
      expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate')
    })

    it('should create cached JSON response with cache key', () => {
      const data = { test: 'data' }
      const response = cachedJsonResponse(data, 'stable', 200, 'test-key')
      
      expect(response.headers.get('Vary')).toBe('Authorization, Cookie')
      expect(response.headers.get('X-Cache-Key-Hash')).toBeTruthy()
    })
  })
})