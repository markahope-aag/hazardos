import { NextResponse } from 'next/server'

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

export function createSecureErrorResponse(error: unknown): NextResponse {
  // Log the full error for debugging (server-side only)
  console.error('API Error:', error)

  // Check if it's our secure error type
  if (error instanceof SecureError) {
    const response: any = {
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
    const errorObj = error as any

    // Supabase auth errors
    if (errorObj.message?.includes('JWT')) {
      return NextResponse.json(
        { error: SAFE_ERROR_MESSAGES.UNAUTHORIZED, type: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Supabase RLS errors
    if (errorObj.message?.includes('RLS') || errorObj.message?.includes('policy')) {
      return NextResponse.json(
        { error: SAFE_ERROR_MESSAGES.FORBIDDEN, type: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Database constraint errors
    if (errorObj.code === '23505' || errorObj.message?.includes('duplicate')) {
      return NextResponse.json(
        { error: SAFE_ERROR_MESSAGES.CONFLICT, type: 'CONFLICT' },
        { status: 409 }
      )
    }

    // Database not found errors
    if (errorObj.code === '23503' || errorObj.message?.includes('not found')) {
      return NextResponse.json(
        { error: SAFE_ERROR_MESSAGES.NOT_FOUND, type: 'NOT_FOUND' },
        { status: 404 }
      )
    }
  }

  // For any other error, return a generic server error without exposing details
  return NextResponse.json(
    { 
      error: 'An internal server error occurred', 
      type: 'INTERNAL_ERROR',
      // In development, include more details
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    },
    { status: 500 }
  )
}

// Validation helper
export function validateRequired(value: any, field: string): void {
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