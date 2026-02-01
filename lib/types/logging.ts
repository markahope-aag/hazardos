/**
 * Structured Logging Type Definitions
 *
 * These types support the Pino-based structured logging system
 * used throughout the API and services.
 */

/**
 * Context attached to all request-scoped logs
 */
export interface RequestContext {
  /** Unique identifier for this request (nanoid) */
  requestId: string
  /** User ID if authenticated */
  userId?: string
  /** Organization ID if available */
  organizationId?: string
  /** HTTP method (GET, POST, etc.) */
  method: string
  /** Request path (/api/jobs, etc.) */
  path: string
  /** User agent string */
  userAgent?: string
  /** Client IP address */
  ip?: string
}

/**
 * Base context for all log entries
 */
export interface LogContext {
  /** Request ID for correlation */
  requestId?: string
  /** User ID */
  userId?: string
  /** Organization ID */
  organizationId?: string
  /** Additional metadata */
  [key: string]: unknown
}

/**
 * Context for service-level logging
 */
export interface ServiceLogContext extends LogContext {
  /** Service name (e.g., "StripeService", "NotificationService") */
  service: string
  /** Operation being performed (e.g., "createCheckoutSession") */
  operation?: string
  /** Duration of the operation in milliseconds */
  durationMs?: number
}

/**
 * Error context for structured error logging
 */
export interface ErrorLogContext extends LogContext {
  /** Error object with type, message, and optional stack */
  error: {
    /** Error type (e.g., "VALIDATION_ERROR", "DATABASE_ERROR") */
    type: string
    /** Human-readable error message */
    message: string
    /** Stack trace (only in development) */
    stack?: string
    /** Field that caused the error (for validation errors) */
    field?: string
    /** Database error code */
    code?: string
  }
}

/**
 * Context for API key authentication logging
 */
export interface ApiKeyLogContext extends LogContext {
  /** API key ID (not the key itself) */
  apiKeyId: string
  /** Rate limit remaining */
  rateLimitRemaining?: number
  /** Rate limit reset time */
  rateLimitResetAt?: string
}

/**
 * Log levels supported by the logger
 */
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

/**
 * Configuration for the logger
 */
export interface LoggerConfig {
  /** Minimum log level to output */
  level: LogLevel
  /** Service name for the root logger */
  name?: string
  /** Whether to use pretty printing (dev only) */
  prettyPrint?: boolean
}
