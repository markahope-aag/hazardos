/**
 * PII Redaction Utility
 * Redacts personally identifiable information from text before sending to AI providers
 */

// Common PII patterns
const PII_PATTERNS = {
  // US Phone numbers: (555) 123-4567, 555-123-4567, 5551234567, +1-555-123-4567
  phone: /(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}/g,

  // Email addresses
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,

  // US Social Security Numbers: 123-45-6789
  ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,

  // Credit card numbers (basic pattern)
  creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,

  // US Street addresses (simplified)
  address: /\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(?:St(?:reet)?|Ave(?:nue)?|Blvd|Boulevard|Dr(?:ive)?|Rd|Road|Ln|Lane|Ct|Court|Pl|Place|Way|Cir(?:cle)?|Ter(?:race)?|Pkwy|Parkway)[,.\s]/gi,

  // US ZIP codes: 12345 or 12345-6789
  zipCode: /\b\d{5}(?:-\d{4})?\b/g,

  // Names in common formats (Mr./Mrs./Ms./Dr. Name)
  titledName: /(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Miss)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g,

  // Date of birth patterns: MM/DD/YYYY, YYYY-MM-DD
  dateOfBirth: /(?:DOB|Date of Birth|Born)[:\s]*(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2})/gi,

  // IP addresses
  ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
}

export interface RedactionOptions {
  /** Which PII types to redact (default: all) */
  types?: (keyof typeof PII_PATTERNS)[]
  /** Replacement text (default: '[REDACTED]') */
  replacement?: string
  /** Preserve the type of PII that was redacted (e.g., '[REDACTED_PHONE]') */
  preserveType?: boolean
}

export interface RedactionResult {
  /** The redacted text */
  text: string
  /** Whether any PII was found and redacted */
  wasRedacted: boolean
  /** Count of redactions by type */
  redactionCounts: Partial<Record<keyof typeof PII_PATTERNS, number>>
}

/**
 * Redact PII from text
 */
export function redactPII(text: string, options: RedactionOptions = {}): RedactionResult {
  const {
    types = Object.keys(PII_PATTERNS) as (keyof typeof PII_PATTERNS)[],
    replacement = '[REDACTED]',
    preserveType = true,
  } = options

  let result = text
  const redactionCounts: Partial<Record<keyof typeof PII_PATTERNS, number>> = {}
  let totalRedactions = 0

  for (const type of types) {
    const pattern = PII_PATTERNS[type]
    if (!pattern) continue

    const matches = result.match(pattern) || []
    if (matches.length > 0) {
      redactionCounts[type] = matches.length
      totalRedactions += matches.length

      const typeReplacement = preserveType
        ? `[REDACTED_${type.toUpperCase()}]`
        : replacement

      result = result.replace(pattern, typeReplacement)
    }
  }

  return {
    text: result,
    wasRedacted: totalRedactions > 0,
    redactionCounts,
  }
}

/**
 * Redact PII from an object's string values (recursively)
 */
export function redactPIIFromObject<T>(
  obj: T,
  options: RedactionOptions = {}
): { data: T; wasRedacted: boolean; totalRedactions: number } {
  let wasRedacted = false
  let totalRedactions = 0

  function processValue(value: unknown): unknown {
    if (typeof value === 'string') {
      const result = redactPII(value, options)
      if (result.wasRedacted) {
        wasRedacted = true
        totalRedactions += Object.values(result.redactionCounts).reduce((a, b) => a + (b || 0), 0)
      }
      return result.text
    }

    if (Array.isArray(value)) {
      return value.map(processValue)
    }

    if (value !== null && typeof value === 'object') {
      const processed: Record<string, unknown> = {}
      for (const [key, val] of Object.entries(value)) {
        // Skip certain fields that are meant to contain PII
        if (['id', 'organization_id', 'user_id', 'created_at', 'updated_at'].includes(key)) {
          processed[key] = val
        } else {
          processed[key] = processValue(val)
        }
      }
      return processed
    }

    return value
  }

  const data = processValue(obj) as T

  return { data, wasRedacted, totalRedactions }
}

/**
 * Check if text contains any PII
 */
export function containsPII(text: string, types?: (keyof typeof PII_PATTERNS)[]): boolean {
  const typesToCheck = types || (Object.keys(PII_PATTERNS) as (keyof typeof PII_PATTERNS)[])

  for (const type of typesToCheck) {
    const pattern = PII_PATTERNS[type]
    if (pattern && pattern.test(text)) {
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0
      return true
    }
    // Reset lastIndex for global patterns
    if (pattern) pattern.lastIndex = 0
  }

  return false
}

/**
 * Get a list of PII types found in text
 */
export function detectPIITypes(text: string): (keyof typeof PII_PATTERNS)[] {
  const found: (keyof typeof PII_PATTERNS)[] = []

  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(text)) {
      found.push(type as keyof typeof PII_PATTERNS)
    }
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0
  }

  return found
}
