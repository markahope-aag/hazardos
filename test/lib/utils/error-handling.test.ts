import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock error handling utilities
interface ErrorContext {
  userId?: string
  requestId?: string
  action?: string
  resource?: string
  metadata?: Record<string, any>
}

interface ErrorReport {
  id: string
  message: string
  stack?: string
  code?: string
  type: string
  context: ErrorContext
  timestamp: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  fingerprint: string
}

class AppError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context: ErrorContext

  constructor(
    message: string,
    code: string = 'GENERIC_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true,
    context: ErrorContext = {}
  ) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context

    Error.captureStackTrace(this, this.constructor)
  }
}

class ValidationError extends AppError {
  constructor(message: string, field?: string, context: ErrorContext = {}) {
    super(message, 'VALIDATION_ERROR', 400, true, {
      ...context,
      field
    })
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id?: string, context: ErrorContext = {}) {
    super(`${resource} not found${id ? ` with id: ${id}` : ''}`, 'NOT_FOUND', 404, true, {
      ...context,
      resource,
      resourceId: id
    })
  }
}

class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized access', context: ErrorContext = {}) {
    super(message, 'UNAUTHORIZED', 401, true, context)
  }
}

class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden access', context: ErrorContext = {}) {
    super(message, 'FORBIDDEN', 403, true, context)
  }
}

class ConflictError extends AppError {
  constructor(message: string, context: ErrorContext = {}) {
    super(message, 'CONFLICT', 409, true, context)
  }
}

class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number, context: ErrorContext = {}) {
    super(message, 'RATE_LIMIT', 429, true, {
      ...context,
      retryAfter
    })
  }
}

class ErrorHandler {
  private reports: Map<string, ErrorReport> = new Map()
  private listeners: Array<(report: ErrorReport) => void> = []

  captureError(
    error: Error,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ): ErrorReport {
    const report: ErrorReport = {
      id: this.generateId(),
      message: error.message,
      stack: error.stack,
      code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR',
      type: error.constructor.name,
      context: {
        ...context,
        ...(error instanceof AppError ? error.context : {})
      },
      timestamp: new Date().toISOString(),
      severity,
      fingerprint: this.generateFingerprint(error)
    }

    this.reports.set(report.id, report)
    this.notifyListeners(report)

    return report
  }

  captureException(
    message: string,
    context: ErrorContext = {},
    severity: ErrorReport['severity'] = 'medium'
  ): ErrorReport {
    const error = new Error(message)
    return this.captureError(error, context, severity)
  }

  getReport(id: string): ErrorReport | undefined {
    return this.reports.get(id)
  }

  getReports(filters: {
    severity?: ErrorReport['severity'][]
    type?: string[]
    code?: string[]
    userId?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
  } = {}): ErrorReport[] {
    let reports = Array.from(this.reports.values())

    if (filters.severity?.length) {
      reports = reports.filter(r => filters.severity!.includes(r.severity))
    }

    if (filters.type?.length) {
      reports = reports.filter(r => filters.type!.includes(r.type))
    }

    if (filters.code?.length) {
      reports = reports.filter(r => filters.code!.includes(r.code))
    }

    if (filters.userId) {
      reports = reports.filter(r => r.context.userId === filters.userId)
    }

    if (filters.dateFrom) {
      reports = reports.filter(r => r.timestamp >= filters.dateFrom!)
    }

    if (filters.dateTo) {
      reports = reports.filter(r => r.timestamp <= filters.dateTo!)
    }

    // Sort by timestamp desc
    reports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    if (filters.limit) {
      reports = reports.slice(0, filters.limit)
    }

    return reports
  }

  getStats(): {
    total: number
    bySeverity: Record<ErrorReport['severity'], number>
    byType: Record<string, number>
    byCode: Record<string, number>
    recentErrors: number
    topErrors: Array<{ fingerprint: string; count: number; lastSeen: string }>
  } {
    const reports = Array.from(this.reports.values())
    
    const bySeverity: Record<ErrorReport['severity'], number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    }

    const byType: Record<string, number> = {}
    const byCode: Record<string, number> = {}
    const fingerprintCounts: Record<string, { count: number; lastSeen: string }> = {}

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    let recentErrors = 0

    reports.forEach(report => {
      bySeverity[report.severity]++
      byType[report.type] = (byType[report.type] || 0) + 1
      byCode[report.code] = (byCode[report.code] || 0) + 1

      if (report.timestamp >= oneHourAgo) {
        recentErrors++
      }

      if (!fingerprintCounts[report.fingerprint]) {
        fingerprintCounts[report.fingerprint] = { count: 0, lastSeen: report.timestamp }
      }
      fingerprintCounts[report.fingerprint].count++
      if (report.timestamp > fingerprintCounts[report.fingerprint].lastSeen) {
        fingerprintCounts[report.fingerprint].lastSeen = report.timestamp
      }
    })

    const topErrors = Object.entries(fingerprintCounts)
      .map(([fingerprint, data]) => ({ fingerprint, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      total: reports.length,
      bySeverity,
      byType,
      byCode,
      recentErrors,
      topErrors
    }
  }

  addListener(listener: (report: ErrorReport) => void): void {
    this.listeners.push(listener)
  }

  removeListener(listener: (report: ErrorReport) => void): void {
    const index = this.listeners.indexOf(listener)
    if (index > -1) {
      this.listeners.splice(index, 1)
    }
  }

  clear(): void {
    this.reports.clear()
  }

  private generateId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private generateFingerprint(error: Error): string {
    // Create a fingerprint based on error type, message, and stack trace location
    const stackLine = error.stack?.split('\n')[1] || ''
    const location = stackLine.match(/at .+ \((.+:\d+:\d+)\)/) || stackLine.match(/at (.+:\d+:\d+)/)
    const locationStr = location ? location[1] : 'unknown'
    
    return `${error.constructor.name}:${error.message}:${locationStr}`
      .replace(/[^a-zA-Z0-9:]/g, '_')
      .toLowerCase()
  }

  private notifyListeners(report: ErrorReport): void {
    this.listeners.forEach(listener => {
      try {
        listener(report)
      } catch (error) {
        console.error('Error in error handler listener:', error)
      }
    })
  }
}

// Utility functions
function formatError(error: Error, includeStack: boolean = false): string {
  let formatted = `${error.name}: ${error.message}`
  
  if (error instanceof AppError) {
    formatted += ` (Code: ${error.code}, Status: ${error.statusCode})`
  }
  
  if (includeStack && error.stack) {
    formatted += `\n${error.stack}`
  }
  
  return formatted
}

function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational
  }
  return false
}

function sanitizeError(error: Error): Partial<ErrorReport> {
  return {
    message: error.message,
    type: error.constructor.name,
    code: error instanceof AppError ? error.code : undefined,
    // Exclude sensitive information like stack traces for client-side errors
    stack: undefined
  }
}

function createErrorFromCode(code: string, message?: string, context: ErrorContext = {}): AppError {
  switch (code) {
    case 'VALIDATION_ERROR':
      return new ValidationError(message || 'Validation failed', undefined, context)
    case 'NOT_FOUND':
      return new NotFoundError(context.resource || 'Resource', context.resourceId, context)
    case 'UNAUTHORIZED':
      return new UnauthorizedError(message, context)
    case 'FORBIDDEN':
      return new ForbiddenError(message, context)
    case 'CONFLICT':
      return new ConflictError(message || 'Conflict occurred', context)
    case 'RATE_LIMIT':
      return new RateLimitError(message, context.retryAfter as number, context)
    default:
      return new AppError(message || 'An error occurred', code, 500, true, context)
  }
}

describe('Error Handling', () => {
  let errorHandler: ErrorHandler

  beforeEach(() => {
    errorHandler = new ErrorHandler()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('AppError class', () => {
    it('should create error with default values', () => {
      const error = new AppError('Test error')

      expect(error.message).toBe('Test error')
      expect(error.code).toBe('GENERIC_ERROR')
      expect(error.statusCode).toBe(500)
      expect(error.isOperational).toBe(true)
      expect(error.context).toEqual({})
      expect(error.name).toBe('AppError')
    })

    it('should create error with custom values', () => {
      const context = { userId: 'user-123' }
      const error = new AppError('Custom error', 'CUSTOM_CODE', 400, false, context)

      expect(error.message).toBe('Custom error')
      expect(error.code).toBe('CUSTOM_CODE')
      expect(error.statusCode).toBe(400)
      expect(error.isOperational).toBe(false)
      expect(error.context).toEqual(context)
    })

    it('should capture stack trace', () => {
      const error = new AppError('Test error')
      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('AppError')
    })
  })

  describe('specialized error classes', () => {
    it('should create ValidationError', () => {
      const error = new ValidationError('Invalid email', 'email', { userId: 'user-123' })

      expect(error.message).toBe('Invalid email')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.statusCode).toBe(400)
      expect(error.context.field).toBe('email')
      expect(error.context.userId).toBe('user-123')
    })

    it('should create NotFoundError', () => {
      const error = new NotFoundError('User', 'user-123')

      expect(error.message).toBe('User not found with id: user-123')
      expect(error.code).toBe('NOT_FOUND')
      expect(error.statusCode).toBe(404)
      expect(error.context.resource).toBe('User')
      expect(error.context.resourceId).toBe('user-123')
    })

    it('should create UnauthorizedError', () => {
      const error = new UnauthorizedError('Invalid token')

      expect(error.message).toBe('Invalid token')
      expect(error.code).toBe('UNAUTHORIZED')
      expect(error.statusCode).toBe(401)
    })

    it('should create ForbiddenError', () => {
      const error = new ForbiddenError('Insufficient permissions')

      expect(error.message).toBe('Insufficient permissions')
      expect(error.code).toBe('FORBIDDEN')
      expect(error.statusCode).toBe(403)
    })

    it('should create ConflictError', () => {
      const error = new ConflictError('Email already exists')

      expect(error.message).toBe('Email already exists')
      expect(error.code).toBe('CONFLICT')
      expect(error.statusCode).toBe(409)
    })

    it('should create RateLimitError', () => {
      const error = new RateLimitError('Too many requests', 60)

      expect(error.message).toBe('Too many requests')
      expect(error.code).toBe('RATE_LIMIT')
      expect(error.statusCode).toBe(429)
      expect(error.context.retryAfter).toBe(60)
    })
  })

  describe('ErrorHandler', () => {
    it('should capture error and create report', () => {
      const error = new ValidationError('Invalid input', 'name')
      const context = { userId: 'user-123', requestId: 'req-456' }

      const report = errorHandler.captureError(error, context, 'high')

      expect(report.id).toBeDefined()
      expect(report.message).toBe('Invalid input')
      expect(report.code).toBe('VALIDATION_ERROR')
      expect(report.type).toBe('ValidationError')
      expect(report.severity).toBe('high')
      expect(report.context.userId).toBe('user-123')
      expect(report.context.field).toBe('name')
      expect(report.fingerprint).toBeDefined()
      expect(report.timestamp).toBeDefined()
    })

    it('should capture generic error', () => {
      const error = new Error('Generic error')
      const report = errorHandler.captureError(error)

      expect(report.code).toBe('UNKNOWN_ERROR')
      expect(report.type).toBe('Error')
      expect(report.severity).toBe('medium')
    })

    it('should capture exception from message', () => {
      const report = errorHandler.captureException('Something went wrong', { action: 'test' }, 'critical')

      expect(report.message).toBe('Something went wrong')
      expect(report.type).toBe('Error')
      expect(report.severity).toBe('critical')
      expect(report.context.action).toBe('test')
    })

    it('should retrieve report by id', () => {
      const error = new AppError('Test error')
      const report = errorHandler.captureError(error)

      const retrieved = errorHandler.getReport(report.id)
      expect(retrieved).toEqual(report)
    })

    it('should return undefined for non-existent report', () => {
      const report = errorHandler.getReport('non-existent')
      expect(report).toBeUndefined()
    })

    it('should filter reports by severity', () => {
      errorHandler.captureError(new Error('Low error'), {}, 'low')
      errorHandler.captureError(new Error('High error'), {}, 'high')
      errorHandler.captureError(new Error('Critical error'), {}, 'critical')

      const highAndCritical = errorHandler.getReports({ severity: ['high', 'critical'] })
      expect(highAndCritical).toHaveLength(2)
      expect(highAndCritical.every(r => ['high', 'critical'].includes(r.severity))).toBe(true)
    })

    it('should filter reports by type', () => {
      errorHandler.captureError(new ValidationError('Validation error'))
      errorHandler.captureError(new NotFoundError('User'))
      errorHandler.captureError(new Error('Generic error'))

      const validationErrors = errorHandler.getReports({ type: ['ValidationError'] })
      expect(validationErrors).toHaveLength(1)
      expect(validationErrors[0].type).toBe('ValidationError')
    })

    it('should filter reports by code', () => {
      errorHandler.captureError(new ValidationError('Error 1'))
      errorHandler.captureError(new ValidationError('Error 2'))
      errorHandler.captureError(new NotFoundError('User'))

      const validationCodes = errorHandler.getReports({ code: ['VALIDATION_ERROR'] })
      expect(validationCodes).toHaveLength(2)
      expect(validationCodes.every(r => r.code === 'VALIDATION_ERROR')).toBe(true)
    })

    it('should filter reports by user', () => {
      errorHandler.captureError(new Error('Error 1'), { userId: 'user-1' })
      errorHandler.captureError(new Error('Error 2'), { userId: 'user-2' })
      errorHandler.captureError(new Error('Error 3'), { userId: 'user-1' })

      const user1Errors = errorHandler.getReports({ userId: 'user-1' })
      expect(user1Errors).toHaveLength(2)
      expect(user1Errors.every(r => r.context.userId === 'user-1')).toBe(true)
    })

    it('should filter reports by date range', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)

      errorHandler.captureError(new Error('Old error'))
      
      // Manually set timestamp to simulate old error
      const reports = errorHandler.getReports()
      if (reports.length > 0) {
        reports[0].timestamp = twoHoursAgo.toISOString()
        errorHandler['reports'].set(reports[0].id, reports[0])
      }

      errorHandler.captureError(new Error('Recent error'))

      const recentErrors = errorHandler.getReports({ 
        dateFrom: oneHourAgo.toISOString() 
      })
      expect(recentErrors).toHaveLength(1)
      expect(recentErrors[0].message).toBe('Recent error')
    })

    it('should limit number of reports', () => {
      for (let i = 0; i < 10; i++) {
        errorHandler.captureError(new Error(`Error ${i}`))
      }

      const limitedReports = errorHandler.getReports({ limit: 5 })
      expect(limitedReports).toHaveLength(5)
    })

    it('should sort reports by timestamp descending', () => {
      const error1 = errorHandler.captureError(new Error('First error'))
      
      // Wait a bit to ensure different timestamps
      setTimeout(() => {
        const error2 = errorHandler.captureError(new Error('Second error'))
        
        const reports = errorHandler.getReports()
        expect(reports[0].id).toBe(error2.id) // Most recent first
        expect(reports[1].id).toBe(error1.id)
      }, 10)
    })
  })

  describe('error statistics', () => {
    beforeEach(() => {
      // Create sample errors
      errorHandler.captureError(new ValidationError('Error 1'), {}, 'low')
      errorHandler.captureError(new ValidationError('Error 2'), {}, 'medium')
      errorHandler.captureError(new NotFoundError('User'), {}, 'high')
      errorHandler.captureError(new Error('Generic error'), {}, 'critical')
      
      // Create duplicate error for fingerprint testing
      errorHandler.captureError(new ValidationError('Error 1'), {}, 'low')
    })

    it('should calculate comprehensive statistics', () => {
      const stats = errorHandler.getStats()

      expect(stats.total).toBe(5)
      expect(stats.bySeverity.low).toBe(2)
      expect(stats.bySeverity.medium).toBe(1)
      expect(stats.bySeverity.high).toBe(1)
      expect(stats.bySeverity.critical).toBe(1)
      expect(stats.byType.ValidationError).toBe(3)
      expect(stats.byType.NotFoundError).toBe(1)
      expect(stats.byType.Error).toBe(1)
      expect(stats.byCode.VALIDATION_ERROR).toBe(3)
      expect(stats.byCode.NOT_FOUND).toBe(1)
    })

    it('should identify top errors by fingerprint', () => {
      const stats = errorHandler.getStats()

      expect(stats.topErrors).toHaveLength(4) // 4 unique fingerprints
      expect(stats.topErrors[0].count).toBe(2) // ValidationError 'Error 1' appears twice
      expect(stats.topErrors[0].fingerprint).toContain('validationerror')
    })

    it('should count recent errors', () => {
      const stats = errorHandler.getStats()
      expect(stats.recentErrors).toBe(5) // All errors are recent
    })
  })

  describe('event listeners', () => {
    it('should notify listeners when error is captured', () => {
      const listener = vi.fn()
      errorHandler.addListener(listener)

      const error = new Error('Test error')
      const report = errorHandler.captureError(error)

      expect(listener).toHaveBeenCalledOnce()
      expect(listener).toHaveBeenCalledWith(report)
    })

    it('should support multiple listeners', () => {
      const listener1 = vi.fn()
      const listener2 = vi.fn()
      
      errorHandler.addListener(listener1)
      errorHandler.addListener(listener2)

      errorHandler.captureError(new Error('Test error'))

      expect(listener1).toHaveBeenCalledOnce()
      expect(listener2).toHaveBeenCalledOnce()
    })

    it('should remove listeners', () => {
      const listener = vi.fn()
      
      errorHandler.addListener(listener)
      errorHandler.removeListener(listener)
      
      errorHandler.captureError(new Error('Test error'))

      expect(listener).not.toHaveBeenCalled()
    })

    it('should handle listener errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const faultyListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      
      errorHandler.addListener(faultyListener)
      
      // Should not throw
      expect(() => {
        errorHandler.captureError(new Error('Test error'))
      }).not.toThrow()

      expect(consoleSpy).toHaveBeenCalledWith('Error in error handler listener:', expect.any(Error))
      consoleSpy.mockRestore()
    })
  })

  describe('utility functions', () => {
    it('should format error without stack', () => {
      const error = new ValidationError('Invalid email', 'email')
      const formatted = formatError(error)

      expect(formatted).toBe('ValidationError: Invalid email (Code: VALIDATION_ERROR, Status: 400)')
    })

    it('should format error with stack', () => {
      const error = new Error('Test error')
      const formatted = formatError(error, true)

      expect(formatted).toContain('Error: Test error')
      expect(formatted).toContain('\n')
      expect(formatted).toContain('at ')
    })

    it('should identify operational errors', () => {
      const operationalError = new ValidationError('Invalid input')
      const programmingError = new AppError('Bug', 'BUG', 500, false)
      const genericError = new Error('Generic error')

      expect(isOperationalError(operationalError)).toBe(true)
      expect(isOperationalError(programmingError)).toBe(false)
      expect(isOperationalError(genericError)).toBe(false)
    })

    it('should sanitize error for client', () => {
      const error = new ValidationError('Invalid input')
      error.stack = 'sensitive stack trace'
      
      const sanitized = sanitizeError(error)

      expect(sanitized.message).toBe('Invalid input')
      expect(sanitized.type).toBe('ValidationError')
      expect(sanitized.code).toBe('VALIDATION_ERROR')
      expect(sanitized.stack).toBeUndefined()
    })

    it('should create error from code', () => {
      const validationError = createErrorFromCode('VALIDATION_ERROR', 'Test validation')
      expect(validationError).toBeInstanceOf(ValidationError)
      expect(validationError.message).toBe('Test validation')

      const notFoundError = createErrorFromCode('NOT_FOUND', undefined, { resource: 'User', resourceId: '123' })
      expect(notFoundError).toBeInstanceOf(NotFoundError)
      expect(notFoundError.message).toBe('User not found with id: 123')

      const genericError = createErrorFromCode('CUSTOM_CODE', 'Custom message')
      expect(genericError).toBeInstanceOf(AppError)
      expect(genericError.code).toBe('CUSTOM_CODE')
      expect(genericError.message).toBe('Custom message')
    })
  })

  describe('edge cases', () => {
    it('should handle errors without stack traces', () => {
      const error = new Error('Test error')
      delete error.stack

      const report = errorHandler.captureError(error)
      expect(report.stack).toBeUndefined()
      expect(report.fingerprint).toBeDefined()
    })

    it('should handle errors with circular references in context', () => {
      const circular: any = { name: 'test' }
      circular.self = circular

      const error = new Error('Test error')
      
      // Should not throw when capturing error with circular context
      expect(() => {
        errorHandler.captureError(error, { circular })
      }).not.toThrow()
    })

    it('should handle very long error messages', () => {
      const longMessage = 'A'.repeat(10000)
      const error = new Error(longMessage)
      
      const report = errorHandler.captureError(error)
      expect(report.message).toBe(longMessage)
    })

    it('should handle unicode characters in error messages', () => {
      const unicodeMessage = 'Error with émojis 🚨 and unicode ñáéíóú'
      const error = new Error(unicodeMessage)
      
      const report = errorHandler.captureError(error)
      expect(report.message).toBe(unicodeMessage)
    })

    it('should clear all reports', () => {
      errorHandler.captureError(new Error('Error 1'))
      errorHandler.captureError(new Error('Error 2'))
      
      expect(errorHandler.getReports()).toHaveLength(2)
      
      errorHandler.clear()
      
      expect(errorHandler.getReports()).toHaveLength(0)
    })

    it('should handle concurrent error capturing', () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        errorHandler.captureError(new Error(`Concurrent error ${i}`))
      )

      const reports = promises
      
      expect(reports).toHaveLength(100)
      expect(new Set(reports.map(r => r.id)).size).toBe(100) // All unique IDs
    })
  })
})