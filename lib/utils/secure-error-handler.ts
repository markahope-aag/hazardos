import { NextResponse } from 'next/server'
import { logger, formatError } from '@/lib/utils/logger'
import type { Logger } from 'pino'

// Define error types that are safe to expose to clients
export type SafeErrorType =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'BAD_REQUEST'

interface ErrorDetails {
  type: SafeErrorType
  message: string
  statusCode: number
  field?: string // For validation errors
}

// Map of safe error messages that can be shown to users
const SAFE_ERROR_MESSAGES: Record<SafeErrorType, string> = {
  VALIDATION_ERROR: 'The provided data is invalid',
  NOT_FOUND: 'The requested resource was not found',
  UNAUTHORIZED: 'Authentication is required',
  FORBIDDEN: 'You do not have permission to access this resource',
  RATE_LIMITED: 'Too many requests. Please try again later',
  CONFLICT: 'The resource already exists or conflicts with existing data',
  BAD_REQUEST: 'The request is invalid',
}

const STATUS_CODES: Record<SafeErrorType, number> = {
  VALIDATION_ERROR: 400,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  BAD_REQUEST: 400,
}

export class SecureError extends Error {
  public readonly type: SafeErrorType
  public readonly statusCode: number
  public readonly field?: string
  public readonly isSecureError = true

  constructor(type: SafeErrorType, message?: string, field?: string) {
    super(message || SAFE_ERROR_MESSAGES[type])
    this.type = type
    this.statusCode = STATUS_CODES[type]
    this.field = field
    this.name = 'SecureError'
  }
}

export function createSecureErrorResponse(
  error: unknown,
  log?: Logger
): NextResponse {
  // Use provided logger or fall back to root logger
  const errorLog = log || logger

  // Check if it's our secure error type
  if (error instanceof SecureError) {
    // Use warn level for client errors, error level for server errors
    const logLevel = error.statusCode < 500 ? 'warn' : 'error'
    errorLog[logLevel](
      {
        error: formatError(error, error.type, error.field),
      },
      'Request failed'
    )

    const response: Record<string, unknown> = {
      error: error.message,
      type: error.type,
    }

    if (error.field) {
      response.field = error.field
    }

    return NextResponse.json(response, { status: error.statusCode })
  }

  // Check for common database/auth errors and convert to safe errors
  if (error && typeof error === 'object') {
    const errorObj = error as Record<string, unknown>

    // Supabase auth errors
    if (
      typeof errorObj.message === 'string' &&
      errorObj.message.includes('JWT')
    ) {
      errorLog.warn(
        { error: formatError(error, 'UNAUTHORIZED') },
        'JWT authentication failed'
      )
      return NextResponse.json(
        { error: SAFE_ERROR_MESSAGES.UNAUTHORIZED, type: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Supabase RLS errors
    if (
      typeof errorObj.message === 'string' &&
      (errorObj.message.includes('RLS') || errorObj.message.includes('policy'))
    ) {
      errorLog.warn(
        { error: formatError(error, 'FORBIDDEN') },
        'RLS policy violation'
      )
      return NextResponse.json(
        { error: SAFE_ERROR_MESSAGES.FORBIDDEN, type: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Database constraint errors
    if (
      errorObj.code === '23505' ||
      (typeof errorObj.message === 'string' &&
        errorObj.message.includes('duplicate'))
    ) {
      errorLog.warn(
        { error: formatError(error, 'CONFLICT') },
        'Database constraint violation'
      )
      return NextResponse.json(
        { error: SAFE_ERROR_MESSAGES.CONFLICT, type: 'CONFLICT' },
        { status: 409 }
      )
    }

    // Database not found errors
    if (
      errorObj.code === '23503' ||
      (typeof errorObj.message === 'string' &&
        errorObj.message.includes('not found'))
    ) {
      errorLog.warn(
        { error: formatError(error, 'NOT_FOUND') },
        'Resource not found'
      )
      return NextResponse.json(
        { error: SAFE_ERROR_MESSAGES.NOT_FOUND, type: 'NOT_FOUND' },
        { status: 404 }
      )
    }
  }

  // Log unexpected errors at error level with full details
  errorLog.error(
    { error: formatError(error, 'INTERNAL_ERROR') },
    'Internal server error'
  )

  // For any other error, return a generic server error without exposing details
  return NextResponse.json(
    {
      error: 'An internal server error occurred',
      type: 'INTERNAL_ERROR',
      // In development, include more details
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    },
    { status: 500 }
  )
}

// Validation helper
export function validateRequired(value: unknown, field: string): void {
  if (value === undefined || value === null || value === '') {
    throw new SecureError('VALIDATION_ERROR', `${field} is required`, field)
  }
}

export function validateEmail(email: string, field: string = 'email'): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new SecureError('VALIDATION_ERROR', `${field} must be a valid email address`, field)
  }
}

export function validateLength(value: string, min: number, max: number, field: string): void {
  if (value.length < min || value.length > max) {
    throw new SecureError('VALIDATION_ERROR', `${field} must be between ${min} and ${max} characters`, field)
  }
}