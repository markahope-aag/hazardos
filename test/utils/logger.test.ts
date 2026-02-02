import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  logger,
  createRequestLogger,
  createServiceLogger,
  withContext,
  timed,
  formatError,
} from '@/lib/utils/logger'

describe('Logger Module', () => {
  describe('createRequestLogger', () => {
    it('should create logger with request context', () => {
      const requestLogger = createRequestLogger({
        requestId: 'req-123',
        userId: 'user-456',
        organizationId: 'org-789',
        method: 'POST',
        path: '/api/jobs',
      })

      expect(requestLogger).toBeDefined()
      // Logger should have bindings for the context
      expect((requestLogger as { bindings: () => Record<string, unknown> }).bindings()).toMatchObject({
        requestId: 'req-123',
        userId: 'user-456',
        organizationId: 'org-789',
        method: 'POST',
        path: '/api/jobs',
      })
    })

    it('should include optional fields when provided', () => {
      const requestLogger = createRequestLogger({
        requestId: 'req-123',
        method: 'GET',
        path: '/api/customers',
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
      })

      const bindings = (requestLogger as { bindings: () => Record<string, unknown> }).bindings()
      expect(bindings.userAgent).toBe('Mozilla/5.0')
      expect(bindings.ip).toBe('192.168.1.1')
    })

    it('should omit optional fields when not provided', () => {
      const requestLogger = createRequestLogger({
        requestId: 'req-123',
        method: 'GET',
        path: '/api/customers',
      })

      const bindings = (requestLogger as { bindings: () => Record<string, unknown> }).bindings()
      expect(bindings.userAgent).toBeUndefined()
      expect(bindings.ip).toBeUndefined()
    })
  })

  describe('createServiceLogger', () => {
    it('should create logger with service name', () => {
      const serviceLogger = createServiceLogger('StripeService')

      expect(serviceLogger).toBeDefined()
      expect((serviceLogger as { bindings: () => Record<string, unknown> }).bindings()).toMatchObject({
        service: 'StripeService',
      })
    })

    it('should include additional context when provided', () => {
      const serviceLogger = createServiceLogger('InvoiceService', {
        operation: 'createInvoice',
        organizationId: 'org-123',
      })

      const bindings = (serviceLogger as { bindings: () => Record<string, unknown> }).bindings()
      expect(bindings.service).toBe('InvoiceService')
      expect(bindings.operation).toBe('createInvoice')
      expect(bindings.organizationId).toBe('org-123')
    })
  })

  describe('withContext', () => {
    it('should create child logger with additional context', () => {
      const baseLogger = createServiceLogger('BaseService')
      const childLogger = withContext(baseLogger, {
        operation: 'processData',
        itemId: 'item-456',
      })

      const bindings = (childLogger as { bindings: () => Record<string, unknown> }).bindings()
      expect(bindings.service).toBe('BaseService')
      expect(bindings.operation).toBe('processData')
      expect(bindings.itemId).toBe('item-456')
    })

    it('should merge context from parent logger', () => {
      const parentLogger = createServiceLogger('ParentService', { version: 'v1' })
      const childLogger = withContext(parentLogger, { endpoint: '/api/test' })

      const bindings = (childLogger as { bindings: () => Record<string, unknown> }).bindings()
      expect(bindings.service).toBe('ParentService')
      expect(bindings.version).toBe('v1')
      expect(bindings.endpoint).toBe('/api/test')
    })
  })

  describe('timed', () => {
    it('should measure operation duration on success', async () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
      } as any

      const operation = vi.fn().mockResolvedValue({ result: 'success' })

      const result = await timed(mockLogger, 'fetchData', operation)

      expect(result).toEqual({ result: 'success' })
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'fetchData',
          durationMs: expect.any(Number),
        }),
        'fetchData completed'
      )
      expect(mockLogger.error).not.toHaveBeenCalled()
    })

    it('should measure operation duration on failure', async () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
      } as any

      const testError = new Error('Operation failed')
      const operation = vi.fn().mockRejectedValue(testError)

      await expect(timed(mockLogger, 'processData', operation)).rejects.toThrow('Operation failed')

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'processData',
          durationMs: expect.any(Number),
          err: testError,
        }),
        'processData failed'
      )
      expect(mockLogger.info).not.toHaveBeenCalled()
    })

    it('should log correct duration time', async () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
      } as any

      const operation = vi.fn().mockResolvedValue('done')

      await timed(mockLogger, 'longOperation', operation)

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'longOperation',
          durationMs: expect.any(Number),
        }),
        expect.any(String)
      )
    })
  })

  describe('formatError', () => {
    it('should format Error instances with type', () => {
      const error = new Error('Something went wrong')
      const formatted = formatError(error, 'DATABASE_ERROR')

      expect(formatted).toMatchObject({
        type: 'DATABASE_ERROR',
        message: 'Something went wrong',
      })
    })

    it('should include stack trace in development', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const error = new Error('Test error')
      const formatted = formatError(error, 'TEST_ERROR')

      expect(formatted.stack).toBeDefined()
      expect(typeof formatted.stack).toBe('string')

      process.env.NODE_ENV = originalEnv
    })

    it('should exclude stack trace in production', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const error = new Error('Test error')
      const formatted = formatError(error, 'TEST_ERROR')

      expect(formatted.stack).toBeUndefined()

      process.env.NODE_ENV = originalEnv
    })

    it('should include field when provided', () => {
      const error = new Error('Invalid input')
      const formatted = formatError(error, 'VALIDATION_ERROR', 'email')

      expect(formatted).toMatchObject({
        type: 'VALIDATION_ERROR',
        message: 'Invalid input',
        field: 'email',
      })
    })

    it('should include error code when available', () => {
      const error = new Error('Database connection failed') as Error & { code?: string }
      error.code = 'ECONNREFUSED'
      const formatted = formatError(error, 'DATABASE_ERROR')

      expect(formatted).toMatchObject({
        type: 'DATABASE_ERROR',
        message: 'Database connection failed',
        code: 'ECONNREFUSED',
      })
    })

    it('should format non-Error objects as strings', () => {
      const formatted = formatError('Simple error string', 'UNKNOWN_ERROR')

      expect(formatted).toMatchObject({
        type: 'UNKNOWN_ERROR',
        message: 'Simple error string',
      })
    })

    it('should default type to UNKNOWN_ERROR when not specified', () => {
      const error = new Error('Test')
      const formatted = formatError(error)

      expect(formatted.type).toBe('UNKNOWN_ERROR')
    })

    it('should handle null and undefined errors', () => {
      const formattedNull = formatError(null)
      const formattedUndefined = formatError(undefined)

      expect(formattedNull.message).toBe('null')
      expect(formattedUndefined.message).toBe('undefined')
    })
  })

  describe('logger instance', () => {
    it('should have base environment field', () => {
      const bindings = (logger as { bindings: () => Record<string, unknown> }).bindings()
      expect(bindings.env).toBeDefined()
      expect(typeof bindings.env).toBe('string')
    })

    it('should have application name', () => {
      const bindings = (logger as { bindings: () => Record<string, unknown> }).bindings()
      expect(bindings.name).toBe('hazardos')
    })
  })
})
