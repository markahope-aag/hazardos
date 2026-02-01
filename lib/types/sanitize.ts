/**
 * Type definitions for input sanitization
 */

export interface SanitizeOptions {
  /** Maximum string length (default: 10000) */
  maxLength?: number
  /** Allow HTML tags (default: false - will escape) */
  allowHtml?: boolean
  /** Trim leading/trailing whitespace (default: true) */
  trimWhitespace?: boolean
  /** Normalize unicode to NFC form (default: true) */
  normalizeUnicode?: boolean
  /** Collapse multiple spaces to single space (default: false) */
  collapseSpaces?: boolean
}

export interface SanitizeSearchOptions extends SanitizeOptions {
  /** Maximum search query length (default: 200) */
  maxLength?: number
}

export interface SanitizeCSVOptions extends SanitizeOptions {
  /** Prefix formula-like content with single quote (default: true) */
  escapeFormulas?: boolean
}

/** Characters that can trigger formula execution in spreadsheets */
export const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'] as const
export type FormulaPrefix = typeof FORMULA_PREFIXES[number]
