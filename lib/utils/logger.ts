/**
 * Structured Logging Module
 *
 * Pino-based JSON logger for consistent structured logging across
 * the application. Outputs JSON to stdout for compatibility with
 * Vercel, Docker, and cloud platforms.
 *
 * Usage:
 *   import { logger, createRequestLogger, createServiceLogger } from '@/lib/utils/logger'
 *
 *   // Basic logging
 *   logger.info('Server started')
 *   logger.error({ err }, 'Database connection failed')
 *
 *   // Request-scoped logging
 *   const log = createRequestLogger({ requestId, userId, organizationId, method, path })
 *   log.info('Request started')
 *   log.error({ error: { type, message } }, 'Request failed')
 *
 *   // Service logging
 *   const log = createServiceLogger('StripeService')
 *   log.info({ operation: 'createCheckoutSession', durationMs: 342 }, 'Checkout session created')
 */

import pino, { type Logger } from 'pino'
import type {
  RequestContext,
  LogContext,
  LogLevel,
} from '@/lib/types/logging'

// Determine log level from environment
const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info'

// Determine if we should pretty print (development only)
const isDev = process.env.NODE_ENV === 'development'

// Create transport configuration for pretty printing in development
const transport = isDev
  ? {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'SYS:standard',
      },
    }
  : undefined

/**
 * Root logger instance
 *
 * Use this for application-level logging that isn't tied to
 * a specific request or service context.
 */
export const logger = pino({
  level: LOG_LEVEL,
  name: 'hazardos',
  // Only use transport in dev, otherwise output raw JSON
  ...(transport ? { transport } : {}),
  // Base fields included in every log
  base: {
    env: process.env.NODE_ENV || 'development',
  },
  // Custom timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields
  redact: {
    paths: [
      'password',
      'apiKey',
      'authorization',
      'cookie',
      'token',
      '*.password',
      '*.apiKey',
      '*.token',
    ],
    remove: true,
  },
})

/**
 * Create a request-scoped logger with context
 *
 * Use this in API handlers to create a logger that includes
 * request context (requestId, userId, etc.) in every log entry.
 *
 * @param context - Request context to include in logs
 * @returns Child logger with request context
 *
 * @example
 * const log = createRequestLogger({
 *   requestId: 'abc123',
 *   userId: 'user-uuid',
 *   organizationId: 'org-uuid',
 *   method: 'POST',
 *   path: '/api/jobs'
 * })
 * log.info('Request started')
 */
export function createRequestLogger(context: RequestContext) {
  return logger.child({
    requestId: context.requestId,
    userId: context.userId,
    organizationId: context.organizationId,
    method: context.method,
    path: context.path,
    ...(context.userAgent && { userAgent: context.userAgent }),
    ...(context.ip && { ip: context.ip }),
  })
}

/**
 * Create a service-scoped logger
 *
 * Use this in service classes to create a logger that includes
 * the service name in every log entry.
 *
 * @param serviceName - Name of the service (e.g., "StripeService")
 * @param context - Optional additional context
 * @returns Child logger with service context
 *
 * @example
 * const log = createServiceLogger('StripeService')
 * log.info({ operation: 'createCheckoutSession', durationMs: 342 }, 'Session created')
 */
export function createServiceLogger(serviceName: string, context?: LogContext) {
  return logger.child({
    service: serviceName,
    ...context,
  })
}

/**
 * Create a child logger with additional context
 *
 * Use this to add context to an existing logger.
 *
 * @param parent - Parent logger instance
 * @param context - Additional context to add
 * @returns Child logger with merged context
 */
export function withContext(parent: pino.Logger, context: LogContext) {
  return parent.child(context)
}

/**
 * Log helper for timing operations
 *
 * @param log - Logger instance
 * @param operation - Name of the operation
 * @param fn - Async function to time
 * @returns Result of the function
 *
 * @example
 * const result = await timed(log, 'fetchCustomers', async () => {
 *   return await db.customers.findMany()
 * })
 */
export async function timed<T>(
  log: pino.Logger,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  try {
    const result = await fn()
    const durationMs = Date.now() - startTime
    log.info({ operation, durationMs }, `${operation} completed`)
    return result
  } catch (error) {
    const durationMs = Date.now() - startTime
    log.error({ operation, durationMs, err: error }, `${operation} failed`)
    throw error
  }
}

/**
 * Format an error for structured logging
 *
 * @param error - Error to format
 * @param type - Error type classification
 * @param field - Optional field that caused the error
 * @returns Formatted error object
 */
export function formatError(
  error: unknown,
  type: string = 'UNKNOWN_ERROR',
  field?: string
): {
  type: string
  message: string
  stack?: string
  field?: string
  code?: string
} {
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (error instanceof Error) {
    return {
      type,
      message: error.message,
      ...(isDevelopment && error.stack ? { stack: error.stack } : {}),
      ...(field ? { field } : {}),
      ...((error as Error & { code?: string }).code
        ? { code: (error as Error & { code?: string }).code }
        : {}),
    }
  }

  return {
    type,
    message: String(error),
    ...(field ? { field } : {}),
  }
}

// Re-export pino types for convenience
export type { Logger }
