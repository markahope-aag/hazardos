/**
 * Input sanitization utilities
 *
 * Provides defense-in-depth sanitization that complements Zod validation.
 * Sanitization happens AFTER validation to clean content for safe storage/display.
 */

import type { SanitizeOptions, SanitizeSearchOptions, SanitizeCSVOptions } from '@/lib/types/sanitize'
import { FORMULA_PREFIXES } from '@/lib/types/sanitize'

const DEFAULT_MAX_LENGTH = 10000
const DEFAULT_SEARCH_MAX_LENGTH = 200

/**
 * Remove null bytes and control characters (0x00-0x1F except \n, \r, \t)
 */
function removeControlCharacters(input: string): string {
  // Remove null bytes
  let result = input.replace(/\0/g, '')
  // Remove control chars except newline (0x0A), carriage return (0x0D), tab (0x09)
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
  return result
}

/**
 * Collapse multiple consecutive spaces into a single space
 */
function collapseSpaces(input: string): string {
  return input.replace(/ {2,}/g, ' ')
}

/**
 * Sanitize a string with configurable options
 *
 * @example
 * sanitizeString('  hello\0world  ') // 'hello world'
 * sanitizeString('<script>alert(1)</script>') // '&lt;script&gt;alert(1)&lt;/script&gt;'
 */
export function sanitizeString(input: string, options: SanitizeOptions = {}): string {
  const {
    maxLength = DEFAULT_MAX_LENGTH,
    allowHtml = false,
    trimWhitespace = true,
    normalizeUnicode = true,
    collapseSpaces: shouldCollapseSpaces = false,
  } = options

  if (typeof input !== 'string') {
    return ''
  }

  let result = input

  // Normalize unicode to NFC form
  if (normalizeUnicode) {
    result = result.normalize('NFC')
  }

  // Remove null bytes and control characters
  result = removeControlCharacters(result)

  // Trim whitespace
  if (trimWhitespace) {
    result = result.trim()
  }

  // Collapse multiple spaces
  if (shouldCollapseSpaces) {
    result = collapseSpaces(result)
  }

  // Escape HTML if not allowed
  if (!allowHtml) {
    result = escapeHtml(result)
  }

  // Enforce max length
  if (result.length > maxLength) {
    result = result.slice(0, maxLength)
  }

  return result
}

/**
 * Sanitize a search query for use in database LIKE/ILIKE clauses
 * Escapes SQL wildcards and special characters
 *
 * @example
 * sanitizeSearchQuery('100%') // '100\\%'
 * sanitizeSearchQuery('test_user') // 'test\\_user'
 */
export function sanitizeSearchQuery(input: string, options: SanitizeSearchOptions = {}): string {
  const { maxLength = DEFAULT_SEARCH_MAX_LENGTH, ...sanitizeOpts } = options

  // First apply standard sanitization (without HTML escaping for search)
  let result = sanitizeString(input, {
    ...sanitizeOpts,
    maxLength,
    allowHtml: true, // Don't escape HTML for search - we escape SQL wildcards instead
  })

  // Escape SQL LIKE wildcards
  // Order matters: escape backslash first
  result = result.replace(/\\/g, '\\\\')
  result = result.replace(/%/g, '\\%')
  result = result.replace(/_/g, '\\_')

  return result
}

/**
 * Sanitize a string for safe CSV/Excel export
 * Prevents formula injection by prefixing dangerous characters
 *
 * @example
 * sanitizeForCSV('=SUM(A1:A10)') // "'=SUM(A1:A10)"
 * sanitizeForCSV('+cmd|calc') // "'+cmd|calc"
 */
export function sanitizeForCSV(input: string, options: SanitizeCSVOptions = {}): string {
  const { escapeFormulas = true, ...sanitizeOpts } = options

  // Apply standard sanitization (allow HTML since this is for CSV)
  let result = sanitizeString(input, {
    ...sanitizeOpts,
    allowHtml: true,
  })

  if (escapeFormulas && result.length > 0) {
    const firstChar = result[0]

    // Check if first char is a formula prefix
    if (FORMULA_PREFIXES.includes(firstChar as typeof FORMULA_PREFIXES[number])) {
      result = "'" + result
    }
    // Check if input starts with single quote followed by formula prefix (bypass attempt)
    // Only check if we didn't already add a quote (i.e., original starts with ')
    else if (firstChar === "'" && result.length > 1) {
      const secondChar = result[1]
      if (FORMULA_PREFIXES.includes(secondChar as typeof FORMULA_PREFIXES[number])) {
        result = "'" + result
      }
    }
  }

  return result
}

/**
 * Escape CSV value for proper formatting
 * Wraps in quotes if contains comma, quote, or newline
 */
export function escapeCSVValue(input: string): string {
  const sanitized = sanitizeForCSV(input)

  // Wrap in quotes and escape internal quotes
  if (sanitized.includes(',') || sanitized.includes('"') || sanitized.includes('\n') || sanitized.includes('\r')) {
    return `"${sanitized.replace(/"/g, '""')}"`
  }

  return sanitized
}

/**
 * Escape HTML entities to prevent XSS
 *
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 */
export function escapeHtml(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Strip all HTML tags from a string
 * Use when you need plain text from potentially HTML content
 *
 * @example
 * stripHtml('<p>Hello <strong>world</strong></p>') // 'Hello world'
 */
export function stripHtml(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  // Remove HTML tags
  let result = input.replace(/<[^>]*>/g, '')

  // Decode common HTML entities
  result = result
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')

  return result
}

/**
 * Recursively sanitize all string values in an object
 *
 * @example
 * sanitizeObject({ name: '  John\0  ', items: ['<script>'] })
 * // { name: 'John', items: ['&lt;script&gt;'] }
 */
export function sanitizeObject<T>(obj: T, options: SanitizeOptions = {}): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return sanitizeString(obj, options) as T
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options)) as T
  }

  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value, options)
    }
    return result as T
  }

  // Return primitives (numbers, booleans) unchanged
  return obj
}

/**
 * Create a sanitization transform for Zod schemas
 *
 * @example
 * const schema = z.string().transform(createSanitizeTransform())
 */
export function createSanitizeTransform(options: SanitizeOptions = {}) {
  return (input: string) => sanitizeString(input, options)
}

/**
 * Create a search query sanitization transform for Zod schemas
 *
 * @example
 * const searchSchema = z.string().transform(createSearchSanitizeTransform())
 */
export function createSearchSanitizeTransform(options: SanitizeSearchOptions = {}) {
  return (input: string) => sanitizeSearchQuery(input, options)
}
