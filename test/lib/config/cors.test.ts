import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { 
  getCorsConfig, 
  isOriginAllowed, 
  getCorsHeaders, 
  getCorsPolicy 
} from '@/lib/config/cors'
import type { CorsPolicy } from '@/lib/config/cors'

describe('cors config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getCorsConfig', () => {
    it('should return public-api config', () => {
      const config = getCorsConfig('public-api')
      
      expect(config.allowedOrigins).toContain('*')
      expect(config.allowedMethods).toContain('GET')
      expect(config.allowedMethods).toContain('POST')
      expect(config.allowedMethods).toContain('PUT')
      expect(config.allowedMethods).toContain('DELETE')
      expect(config.credentials).toBe(false)
      expect(config.maxAge).toBe(86400)
    })

    it('should return webhook config', () => {
      const config = getCorsConfig('webhook')
      
      expect(config.allowedOrigins).toContain('*')
      expect(config.allowedMethods).toEqual(['POST', 'OPTIONS'])
      expect(config.allowedHeaders).toContain('Stripe-Signature')
      expect(config.allowedHeaders).toContain('X-Twilio-Signature')
      expect(config.credentials).toBe(false)
    })

    it('should return internal config', () => {
      const config = getCorsConfig('internal')
      
      expect(config.credentials).toBe(true)
      expect(config.maxAge).toBe(600)
      expect(config.allowedMethods).toContain('GET')
      expect(config.allowedMethods).toContain('POST')
    })

    it('should return openapi config', () => {
      const config = getCorsConfig('openapi')
      
      expect(config.allowedOrigins).toContain('*')
      expect(config.allowedMethods).toEqual(['GET', 'OPTIONS'])
      expect(config.credentials).toBe(false)
      expect(config.maxAge).toBe(86400)
    })

    it('should use custom origins from environment', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://example.com,https://app.example.com'
      
      const config = getCorsConfig('internal')
      
      expect(config.allowedOrigins).toContain('https://example.com')
      expect(config.allowedOrigins).toContain('https://app.example.com')
    })

    it('should include development origins in development', () => {
      process.env.NODE_ENV = 'development'
      
      const config = getCorsConfig('internal')
      
      expect(config.allowedOrigins).toContain('http://localhost:3000')
      expect(config.allowedOrigins).toContain('http://127.0.0.1:3000')
    })

    it('should use app URL from environment', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com'
      
      const config = getCorsConfig('internal')
      
      expect(config.allowedOrigins).toContain('https://myapp.com')
    })

    it('should default to internal policy for unknown policy', () => {
      const config = getCorsConfig('unknown' as CorsPolicy)
      const internalConfig = getCorsConfig('internal')
      
      expect(config).toEqual(internalConfig)
    })
  })

  describe('isOriginAllowed', () => {
    it('should allow any origin for public-api with wildcard', () => {
      expect(isOriginAllowed('https://example.com', 'public-api')).toBe(true)
      expect(isOriginAllowed('https://malicious.com', 'public-api')).toBe(true)
    })

    it('should allow webhook requests without origin', () => {
      expect(isOriginAllowed(null, 'webhook')).toBe(true)
    })

    it('should allow internal requests without origin', () => {
      expect(isOriginAllowed(null, 'internal')).toBe(true)
    })

    it('should reject public-api requests without origin when not wildcard', () => {
      process.env.NODE_ENV = 'production'
      process.env.CORS_ALLOWED_ORIGINS = 'https://specific.com'
      
      expect(isOriginAllowed(null, 'public-api')).toBe(false)
    })

    it('should check exact origin match for internal policy', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com'
      
      expect(isOriginAllowed('https://myapp.com', 'internal')).toBe(true)
      expect(isOriginAllowed('https://other.com', 'internal')).toBe(false)
    })
  })

  describe('getCorsHeaders', () => {
    it('should return wildcard origin for public-api', () => {
      const headers = getCorsHeaders('https://example.com', 'public-api')
      
      expect(headers['Access-Control-Allow-Origin']).toBe('*')
      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined()
    })

    it('should return specific origin for internal with credentials', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com'
      
      const headers = getCorsHeaders('https://myapp.com', 'internal')
      
      expect(headers['Access-Control-Allow-Origin']).toBe('https://myapp.com')
      expect(headers['Access-Control-Allow-Credentials']).toBe('true')
    })

    it('should include preflight headers when isPreflight is true', () => {
      const headers = getCorsHeaders('https://example.com', 'public-api', true)
      
      expect(headers['Access-Control-Allow-Methods']).toBeDefined()
      expect(headers['Access-Control-Allow-Headers']).toBeDefined()
      expect(headers['Access-Control-Max-Age']).toBe('86400')
    })

    it('should include exposed headers', () => {
      const headers = getCorsHeaders('https://example.com', 'public-api')
      
      expect(headers['Access-Control-Expose-Headers']).toContain('X-RateLimit-Limit')
      expect(headers['Access-Control-Expose-Headers']).toContain('X-Request-ID')
    })

    it('should include Vary header for non-wildcard origins', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://myapp.com'
      
      const headers = getCorsHeaders('https://myapp.com', 'internal')
      
      expect(headers['Vary']).toBe('Origin')
    })

    it('should not include Vary header for wildcard origins', () => {
      const headers = getCorsHeaders('https://example.com', 'public-api')
      
      expect(headers['Vary']).toBeUndefined()
    })

    it('should handle webhook-specific headers', () => {
      const headers = getCorsHeaders(null, 'webhook', true)
      
      expect(headers['Access-Control-Allow-Methods']).toBe('POST, OPTIONS')
      expect(headers['Access-Control-Allow-Headers']).toContain('Stripe-Signature')
    })
  })

  describe('getCorsPolicy', () => {
    it('should return public-api for v1 API routes', () => {
      expect(getCorsPolicy('/api/v1/customers')).toBe('public-api')
      expect(getCorsPolicy('/api/v1/jobs/123')).toBe('public-api')
    })

    it('should return webhook for webhook routes', () => {
      expect(getCorsPolicy('/api/webhooks/stripe')).toBe('webhook')
      expect(getCorsPolicy('/api/webhooks/twilio/status')).toBe('webhook')
    })

    it('should return openapi for documentation routes', () => {
      expect(getCorsPolicy('/api/openapi')).toBe('openapi')
      expect(getCorsPolicy('/api/openapi.json')).toBe('openapi')
    })

    it('should return internal for other API routes', () => {
      expect(getCorsPolicy('/api/customers')).toBe('internal')
      expect(getCorsPolicy('/api/jobs/123')).toBe('internal')
    })

    it('should return internal for non-API routes', () => {
      expect(getCorsPolicy('/dashboard')).toBe('internal')
      expect(getCorsPolicy('/login')).toBe('internal')
    })
  })

  describe('environment handling', () => {
    it('should handle empty CORS_ALLOWED_ORIGINS', () => {
      process.env.CORS_ALLOWED_ORIGINS = ''
      
      const config = getCorsConfig('internal')
      
      expect(config.allowedOrigins).not.toContain('')
    })

    it('should trim whitespace from origins', () => {
      process.env.CORS_ALLOWED_ORIGINS = ' https://example.com , https://app.example.com '
      
      const config = getCorsConfig('internal')
      
      expect(config.allowedOrigins).toContain('https://example.com')
      expect(config.allowedOrigins).toContain('https://app.example.com')
      expect(config.allowedOrigins).not.toContain(' https://example.com ')
    })

    it('should use default app URL when not set', () => {
      delete process.env.NEXT_PUBLIC_APP_URL
      
      const config = getCorsConfig('internal')
      
      expect(config.allowedOrigins).toContain('http://localhost:3000')
    })
  })

  describe('security considerations', () => {
    it('should not allow credentials with wildcard origin', () => {
      const headers = getCorsHeaders('https://example.com', 'public-api')
      
      expect(headers['Access-Control-Allow-Origin']).toBe('*')
      expect(headers['Access-Control-Allow-Credentials']).toBeUndefined()
    })

    it('should only echo back allowed origins', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'https://allowed.com'
      
      const allowedHeaders = getCorsHeaders('https://allowed.com', 'internal')
      const blockedHeaders = getCorsHeaders('https://blocked.com', 'internal')
      
      expect(allowedHeaders['Access-Control-Allow-Origin']).toBe('https://allowed.com')
      expect(blockedHeaders['Access-Control-Allow-Origin']).toBeUndefined()
    })

    it('should include webhook-specific security headers', () => {
      const config = getCorsConfig('webhook')
      
      expect(config.allowedHeaders).toContain('Stripe-Signature')
      expect(config.allowedHeaders).toContain('X-Twilio-Signature')
      expect(config.allowedHeaders).toContain('X-Hub-Signature-256')
    })
  })
})