import { describe, it, expect } from 'vitest'
import type { 
  RequestContext,
  LogContext,
  ServiceLogContext,
  ErrorLogContext,
  ApiKeyLogContext,
  LogLevel,
  LoggerConfig
} from '@/lib/types/logging'

describe('logging types', () => {
  describe('RequestContext', () => {
    it('should have required fields', () => {
      const context: RequestContext = {
        requestId: 'req_123456',
        method: 'POST',
        path: '/api/jobs'
      }
      
      expect(context.requestId).toBe('req_123456')
      expect(context.method).toBe('POST')
      expect(context.path).toBe('/api/jobs')
    })

    it('should support optional fields', () => {
      const context: RequestContext = {
        requestId: 'req_789012',
        userId: 'user_456',
        organizationId: 'org_789',
        method: 'GET',
        path: '/api/customers',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        ip: '192.168.1.1'
      }
      
      expect(context.userId).toBe('user_456')
      expect(context.organizationId).toBe('org_789')
      expect(context.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
      expect(context.ip).toBe('192.168.1.1')
    })

    it('should work with different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
      
      methods.forEach(method => {
        const context: RequestContext = {
          requestId: `req_${method}`,
          method,
          path: '/api/test'
        }
        
        expect(context.method).toBe(method)
      })
    })
  })

  describe('LogContext', () => {
    it('should support basic context fields', () => {
      const context: LogContext = {
        requestId: 'req_123',
        userId: 'user_456',
        organizationId: 'org_789'
      }
      
      expect(context.requestId).toBe('req_123')
      expect(context.userId).toBe('user_456')
      expect(context.organizationId).toBe('org_789')
    })

    it('should allow additional metadata', () => {
      const context: LogContext = {
        requestId: 'req_123',
        customField: 'custom_value',
        numericField: 42,
        booleanField: true,
        objectField: { nested: 'value' }
      }
      
      expect(context.customField).toBe('custom_value')
      expect(context.numericField).toBe(42)
      expect(context.booleanField).toBe(true)
      expect(context.objectField).toEqual({ nested: 'value' })
    })

    it('should allow empty context', () => {
      const context: LogContext = {}
      
      expect(Object.keys(context)).toHaveLength(0)
    })
  })

  describe('ServiceLogContext', () => {
    it('should extend LogContext with service fields', () => {
      const context: ServiceLogContext = {
        requestId: 'req_123',
        userId: 'user_456',
        service: 'StripeService',
        operation: 'createCheckoutSession',
        durationMs: 150
      }
      
      expect(context.requestId).toBe('req_123')
      expect(context.userId).toBe('user_456')
      expect(context.service).toBe('StripeService')
      expect(context.operation).toBe('createCheckoutSession')
      expect(context.durationMs).toBe(150)
    })

    it('should work with different service names', () => {
      const services = [
        'NotificationService',
        'JobsService',
        'CustomerService',
        'InvoiceService'
      ]
      
      services.forEach(service => {
        const context: ServiceLogContext = {
          service,
          operation: 'testOperation'
        }
        
        expect(context.service).toBe(service)
      })
    })

    it('should allow optional operation and duration', () => {
      const context: ServiceLogContext = {
        service: 'TestService'
      }
      
      expect(context.service).toBe('TestService')
      expect(context.operation).toBeUndefined()
      expect(context.durationMs).toBeUndefined()
    })
  })

  describe('ErrorLogContext', () => {
    it('should have required error object', () => {
      const context: ErrorLogContext = {
        requestId: 'req_123',
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid input data'
        }
      }
      
      expect(context.error.type).toBe('VALIDATION_ERROR')
      expect(context.error.message).toBe('Invalid input data')
    })

    it('should support optional error fields', () => {
      const context: ErrorLogContext = {
        error: {
          type: 'DATABASE_ERROR',
          message: 'Connection failed',
          stack: 'Error: Connection failed\n    at Database.connect',
          field: 'email',
          code: 'CONN_TIMEOUT'
        }
      }
      
      expect(context.error.stack).toContain('Error: Connection failed')
      expect(context.error.field).toBe('email')
      expect(context.error.code).toBe('CONN_TIMEOUT')
    })

    it('should work with different error types', () => {
      const errorTypes = [
        'VALIDATION_ERROR',
        'DATABASE_ERROR',
        'AUTHENTICATION_ERROR',
        'AUTHORIZATION_ERROR',
        'RATE_LIMIT_ERROR',
        'EXTERNAL_API_ERROR'
      ]
      
      errorTypes.forEach(type => {
        const context: ErrorLogContext = {
          error: {
            type,
            message: `Test ${type}`
          }
        }
        
        expect(context.error.type).toBe(type)
      })
    })
  })

  describe('ApiKeyLogContext', () => {
    it('should have required apiKeyId', () => {
      const context: ApiKeyLogContext = {
        apiKeyId: 'ak_123456789'
      }
      
      expect(context.apiKeyId).toBe('ak_123456789')
    })

    it('should support rate limit fields', () => {
      const context: ApiKeyLogContext = {
        apiKeyId: 'ak_123456789',
        rateLimitRemaining: 95,
        rateLimitResetAt: '2024-01-01T12:00:00Z'
      }
      
      expect(context.rateLimitRemaining).toBe(95)
      expect(context.rateLimitResetAt).toBe('2024-01-01T12:00:00Z')
    })

    it('should extend LogContext', () => {
      const context: ApiKeyLogContext = {
        requestId: 'req_123',
        userId: 'user_456',
        organizationId: 'org_789',
        apiKeyId: 'ak_123456789'
      }
      
      expect(context.requestId).toBe('req_123')
      expect(context.userId).toBe('user_456')
      expect(context.organizationId).toBe('org_789')
      expect(context.apiKeyId).toBe('ak_123456789')
    })
  })

  describe('LogLevel', () => {
    it('should support all log levels', () => {
      const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
      
      levels.forEach(level => {
        const testLevel: LogLevel = level
        expect(testLevel).toBe(level)
      })
    })

    it('should work in logger configuration', () => {
      const config: LoggerConfig = {
        level: 'info',
        name: 'TestLogger'
      }
      
      expect(config.level).toBe('info')
    })
  })

  describe('LoggerConfig', () => {
    it('should have required level field', () => {
      const config: LoggerConfig = {
        level: 'warn'
      }
      
      expect(config.level).toBe('warn')
    })

    it('should support optional fields', () => {
      const config: LoggerConfig = {
        level: 'debug',
        name: 'HazardOSLogger',
        prettyPrint: true
      }
      
      expect(config.level).toBe('debug')
      expect(config.name).toBe('HazardOSLogger')
      expect(config.prettyPrint).toBe(true)
    })

    it('should work with different configurations', () => {
      const prodConfig: LoggerConfig = {
        level: 'info',
        name: 'ProductionLogger',
        prettyPrint: false
      }
      
      const devConfig: LoggerConfig = {
        level: 'debug',
        name: 'DevelopmentLogger',
        prettyPrint: true
      }
      
      expect(prodConfig.level).toBe('info')
      expect(prodConfig.prettyPrint).toBe(false)
      expect(devConfig.level).toBe('debug')
      expect(devConfig.prettyPrint).toBe(true)
    })
  })

  describe('type compatibility', () => {
    it('should allow ServiceLogContext where LogContext expected', () => {
      function processLogContext(context: LogContext): void {
        expect(context).toBeDefined()
      }
      
      const serviceContext: ServiceLogContext = {
        service: 'TestService',
        requestId: 'req_123'
      }
      
      processLogContext(serviceContext) // Should not cause type error
    })

    it('should allow ErrorLogContext where LogContext expected', () => {
      function processLogContext(context: LogContext): void {
        expect(context).toBeDefined()
      }
      
      const errorContext: ErrorLogContext = {
        error: {
          type: 'TEST_ERROR',
          message: 'Test error'
        }
      }
      
      processLogContext(errorContext) // Should not cause type error
    })

    it('should allow ApiKeyLogContext where LogContext expected', () => {
      function processLogContext(context: LogContext): void {
        expect(context).toBeDefined()
      }
      
      const apiKeyContext: ApiKeyLogContext = {
        apiKeyId: 'ak_123'
      }
      
      processLogContext(apiKeyContext) // Should not cause type error
    })
  })

  describe('practical usage patterns', () => {
    it('should support request correlation', () => {
      const requestId = 'req_correlation_test'
      
      const requestContext: RequestContext = {
        requestId,
        method: 'POST',
        path: '/api/test'
      }
      
      const serviceContext: ServiceLogContext = {
        requestId,
        service: 'TestService',
        operation: 'processRequest'
      }
      
      const errorContext: ErrorLogContext = {
        requestId,
        error: {
          type: 'PROCESSING_ERROR',
          message: 'Failed to process request'
        }
      }
      
      expect(requestContext.requestId).toBe(requestId)
      expect(serviceContext.requestId).toBe(requestId)
      expect(errorContext.requestId).toBe(requestId)
    })

    it('should support multi-tenant logging', () => {
      const organizationId = 'org_tenant_123'
      
      const contexts = [
        { organizationId } as LogContext,
        { organizationId, service: 'TestService' } as ServiceLogContext,
        { organizationId, apiKeyId: 'ak_123' } as ApiKeyLogContext
      ]
      
      contexts.forEach(context => {
        expect(context.organizationId).toBe(organizationId)
      })
    })
  })
})