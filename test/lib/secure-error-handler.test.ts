import { describe, it, expect } from 'vitest'
import {
  SecureError,
  validateRequired,
  validateEmail,
  validateLength
} from '@/lib/utils/secure-error-handler'

describe('SecureError', () => {
  it('should create error with UNAUTHORIZED type', () => {
    const error = new SecureError('UNAUTHORIZED')
    expect(error.type).toBe('UNAUTHORIZED')
    expect(error.statusCode).toBe(401)
    expect(error.message).toBe('Authentication is required')
    expect(error.isSecureError).toBe(true)
  })

  it('should create error with NOT_FOUND type', () => {
    const error = new SecureError('NOT_FOUND')
    expect(error.type).toBe('NOT_FOUND')
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('The requested resource was not found')
  })

  it('should create error with FORBIDDEN type', () => {
    const error = new SecureError('FORBIDDEN')
    expect(error.type).toBe('FORBIDDEN')
    expect(error.statusCode).toBe(403)
    expect(error.message).toBe('You do not have permission to access this resource')
  })

  it('should create error with VALIDATION_ERROR type', () => {
    const error = new SecureError('VALIDATION_ERROR')
    expect(error.type).toBe('VALIDATION_ERROR')
    expect(error.statusCode).toBe(400)
    expect(error.message).toBe('The provided data is invalid')
  })

  it('should create error with RATE_LIMITED type', () => {
    const error = new SecureError('RATE_LIMITED')
    expect(error.type).toBe('RATE_LIMITED')
    expect(error.statusCode).toBe(429)
    expect(error.message).toBe('Too many requests. Please try again later')
  })

  it('should create error with CONFLICT type', () => {
    const error = new SecureError('CONFLICT')
    expect(error.type).toBe('CONFLICT')
    expect(error.statusCode).toBe(409)
    expect(error.message).toBe('The resource already exists or conflicts with existing data')
  })

  it('should create error with BAD_REQUEST type', () => {
    const error = new SecureError('BAD_REQUEST')
    expect(error.type).toBe('BAD_REQUEST')
    expect(error.statusCode).toBe(400)
    expect(error.message).toBe('The request is invalid')
  })

  it('should accept custom message', () => {
    const error = new SecureError('NOT_FOUND', 'Customer not found')
    expect(error.message).toBe('Customer not found')
    expect(error.type).toBe('NOT_FOUND')
  })

  it('should accept field parameter for validation errors', () => {
    const error = new SecureError('VALIDATION_ERROR', 'Email is required', 'email')
    expect(error.field).toBe('email')
    expect(error.message).toBe('Email is required')
  })

  it('should be instanceof Error', () => {
    const error = new SecureError('UNAUTHORIZED')
    expect(error instanceof Error).toBe(true)
  })

  it('should have correct name property', () => {
    const error = new SecureError('UNAUTHORIZED')
    expect(error.name).toBe('SecureError')
  })
})

describe('validateRequired', () => {
  it('should not throw for valid string value', () => {
    expect(() => validateRequired('hello', 'name')).not.toThrow()
  })

  it('should not throw for valid number value', () => {
    expect(() => validateRequired(123, 'count')).not.toThrow()
  })

  it('should not throw for zero', () => {
    expect(() => validateRequired(0, 'count')).not.toThrow()
  })

  it('should not throw for false boolean', () => {
    expect(() => validateRequired(false, 'active')).not.toThrow()
  })

  it('should throw SecureError for null value', () => {
    expect(() => validateRequired(null, 'email')).toThrow(SecureError)
    try {
      validateRequired(null, 'email')
    } catch (e) {
      const error = e as SecureError
      expect(error.type).toBe('VALIDATION_ERROR')
      expect(error.field).toBe('email')
      expect(error.message).toBe('email is required')
    }
  })

  it('should throw SecureError for undefined value', () => {
    expect(() => validateRequired(undefined, 'name')).toThrow(SecureError)
  })

  it('should throw SecureError for empty string', () => {
    expect(() => validateRequired('', 'description')).toThrow(SecureError)
    try {
      validateRequired('', 'description')
    } catch (e) {
      const error = e as SecureError
      expect(error.field).toBe('description')
    }
  })

  it('should include field name in error message', () => {
    try {
      validateRequired(null, 'customer_id')
    } catch (e) {
      const error = e as SecureError
      expect(error.message).toBe('customer_id is required')
    }
  })
})

describe('validateEmail', () => {
  it('should not throw for valid email', () => {
    expect(() => validateEmail('test@example.com')).not.toThrow()
  })

  it('should not throw for email with subdomain', () => {
    expect(() => validateEmail('user@mail.example.com')).not.toThrow()
  })

  it('should not throw for email with plus sign', () => {
    expect(() => validateEmail('user+tag@example.com')).not.toThrow()
  })

  it('should throw for email without @', () => {
    expect(() => validateEmail('invalid-email')).toThrow(SecureError)
  })

  it('should throw for email without domain', () => {
    expect(() => validateEmail('user@')).toThrow(SecureError)
  })

  it('should throw for email without local part', () => {
    expect(() => validateEmail('@example.com')).toThrow(SecureError)
  })

  it('should throw for email with spaces', () => {
    expect(() => validateEmail('user @example.com')).toThrow(SecureError)
  })

  it('should use custom field name in error', () => {
    try {
      validateEmail('invalid', 'contact_email')
    } catch (e) {
      const error = e as SecureError
      expect(error.field).toBe('contact_email')
      expect(error.message).toBe('contact_email must be a valid email address')
    }
  })

  it('should use default field name when not provided', () => {
    try {
      validateEmail('invalid')
    } catch (e) {
      const error = e as SecureError
      expect(error.field).toBe('email')
    }
  })
})

describe('validateLength', () => {
  it('should not throw when length is within range', () => {
    expect(() => validateLength('hello', 1, 10, 'name')).not.toThrow()
  })

  it('should not throw when length equals minimum', () => {
    expect(() => validateLength('ab', 2, 10, 'code')).not.toThrow()
  })

  it('should not throw when length equals maximum', () => {
    expect(() => validateLength('abcdefghij', 1, 10, 'code')).not.toThrow()
  })

  it('should throw when length is below minimum', () => {
    expect(() => validateLength('a', 3, 10, 'name')).toThrow(SecureError)
  })

  it('should throw when length exceeds maximum', () => {
    expect(() => validateLength('hello world!', 1, 5, 'code')).toThrow(SecureError)
  })

  it('should include field name and bounds in error message', () => {
    try {
      validateLength('x', 3, 10, 'password')
    } catch (e) {
      const error = e as SecureError
      expect(error.message).toBe('password must be between 3 and 10 characters')
      expect(error.field).toBe('password')
    }
  })

  it('should handle empty string', () => {
    expect(() => validateLength('', 1, 10, 'name')).toThrow(SecureError)
  })

  it('should handle exact length requirement', () => {
    expect(() => validateLength('abc', 3, 3, 'code')).not.toThrow()
    expect(() => validateLength('ab', 3, 3, 'code')).toThrow(SecureError)
    expect(() => validateLength('abcd', 3, 3, 'code')).toThrow(SecureError)
  })
})
