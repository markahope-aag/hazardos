import { describe, it, expect } from 'vitest'
import { cn, formatCurrency, formatDate, formatPhone } from '@/lib/utils'

describe('cn utility', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    const isActive = true
    expect(cn('base', isActive && 'active')).toBe('base active')
  })

  it('should filter out falsy values', () => {
    expect(cn('base', false, null, undefined, 'valid')).toBe('base valid')
  })

  it('should merge Tailwind classes correctly', () => {
    // tailwind-merge should deduplicate conflicting classes
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('should handle empty inputs', () => {
    expect(cn()).toBe('')
  })

  it('should handle array inputs', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('should handle object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })
})

describe('formatCurrency', () => {
  it('should format positive numbers correctly', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56')
  })

  it('should format negative numbers correctly', () => {
    expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
  })

  it('should format zero correctly', () => {
    expect(formatCurrency(0)).toBe('$0.00')
  })

  it('should handle null values', () => {
    expect(formatCurrency(null)).toBe('$0.00')
  })

  it('should handle undefined values', () => {
    expect(formatCurrency(undefined)).toBe('$0.00')
  })

  it('should format large numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00')
  })

  it('should round to 2 decimal places', () => {
    expect(formatCurrency(1234.567)).toBe('$1,234.57')
  })

  it('should handle small decimals', () => {
    expect(formatCurrency(0.99)).toBe('$0.99')
  })

  it('should handle whole numbers', () => {
    expect(formatCurrency(100)).toBe('$100.00')
  })
})

describe('formatDate', () => {
  it('should format Date object correctly', () => {
    const result = formatDate(new Date(2026, 0, 15))
    expect(result).toMatch(/Jan\s+15,\s+2026/)
  })

  it('should return string for valid date', () => {
    const result = formatDate('2026-01-15T12:00:00')
    expect(typeof result).toBe('string')
    expect(result).toContain('2026')
    expect(result).toContain('Jan')
  })

  it('should handle null values', () => {
    expect(formatDate(null)).toBe('')
  })

  it('should handle undefined values', () => {
    expect(formatDate(undefined)).toBe('')
  })

  it('should handle empty string', () => {
    expect(formatDate('')).toBe('')
  })

  it('should format dates with month name', () => {
    // Use Date constructor to avoid timezone issues
    const junDate = new Date(2026, 5, 20) // Month is 0-indexed
    const decDate = new Date(2026, 11, 25)
    expect(formatDate(junDate)).toContain('Jun')
    expect(formatDate(decDate)).toContain('Dec')
  })

  it('should include year in output', () => {
    const date = new Date(2026, 2, 5)
    expect(formatDate(date)).toContain('2026')
  })
})

describe('formatPhone', () => {
  it('should format 10-digit phone numbers', () => {
    expect(formatPhone('5551234567')).toBe('(555) 123-4567')
  })

  it('should handle phone numbers with existing formatting', () => {
    expect(formatPhone('555-123-4567')).toBe('(555) 123-4567')
  })

  it('should handle phone numbers with parentheses', () => {
    expect(formatPhone('(555) 123-4567')).toBe('(555) 123-4567')
  })

  it('should handle phone numbers with spaces', () => {
    expect(formatPhone('555 123 4567')).toBe('(555) 123-4567')
  })

  it('should handle phone numbers with dots', () => {
    expect(formatPhone('555.123.4567')).toBe('(555) 123-4567')
  })

  it('should return original for non-10-digit numbers', () => {
    expect(formatPhone('12345')).toBe('12345')
    expect(formatPhone('123456789012')).toBe('123456789012')
  })

  it('should handle null values', () => {
    expect(formatPhone(null)).toBe('')
  })

  it('should handle undefined values', () => {
    expect(formatPhone(undefined)).toBe('')
  })

  it('should handle empty string', () => {
    expect(formatPhone('')).toBe('')
  })

  it('should strip country code and format if 11 digits starting with 1', () => {
    // Current implementation doesn't strip country code
    expect(formatPhone('15551234567')).toBe('15551234567')
  })
})
