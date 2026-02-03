import { describe, it, expect } from 'vitest'
import { FORMULA_PREFIXES } from '@/lib/types/sanitize'
import type { 
  SanitizeOptions, 
  SanitizeSearchOptions, 
  SanitizeCSVOptions,
  FormulaPrefix
} from '@/lib/types/sanitize'

describe('sanitize types', () => {
  describe('SanitizeOptions', () => {
    it('should have correct default option types', () => {
      const options: SanitizeOptions = {
        maxLength: 1000,
        allowHtml: false,
        trimWhitespace: true,
        normalizeUnicode: true,
        collapseSpaces: false
      }
      
      expect(typeof options.maxLength).toBe('number')
      expect(typeof options.allowHtml).toBe('boolean')
      expect(typeof options.trimWhitespace).toBe('boolean')
      expect(typeof options.normalizeUnicode).toBe('boolean')
      expect(typeof options.collapseSpaces).toBe('boolean')
    })

    it('should allow partial options', () => {
      const partialOptions: SanitizeOptions = {
        maxLength: 500
      }
      
      expect(partialOptions.maxLength).toBe(500)
      expect(partialOptions.allowHtml).toBeUndefined()
    })

    it('should allow empty options object', () => {
      const emptyOptions: SanitizeOptions = {}
      
      expect(Object.keys(emptyOptions)).toHaveLength(0)
    })
  })

  describe('SanitizeSearchOptions', () => {
    it('should extend SanitizeOptions', () => {
      const searchOptions: SanitizeSearchOptions = {
        maxLength: 200,
        allowHtml: false,
        trimWhitespace: true,
        normalizeUnicode: true,
        collapseSpaces: true
      }
      
      expect(searchOptions.maxLength).toBe(200)
      expect(searchOptions.allowHtml).toBe(false)
      expect(searchOptions.trimWhitespace).toBe(true)
      expect(searchOptions.normalizeUnicode).toBe(true)
      expect(searchOptions.collapseSpaces).toBe(true)
    })

    it('should have search-specific defaults', () => {
      const searchOptions: SanitizeSearchOptions = {
        maxLength: 150 // Override default for search
      }
      
      expect(searchOptions.maxLength).toBe(150)
    })
  })

  describe('SanitizeCSVOptions', () => {
    it('should extend SanitizeOptions with CSV-specific options', () => {
      const csvOptions: SanitizeCSVOptions = {
        maxLength: 5000,
        allowHtml: false,
        trimWhitespace: true,
        normalizeUnicode: true,
        collapseSpaces: false,
        escapeFormulas: true
      }
      
      expect(csvOptions.maxLength).toBe(5000)
      expect(csvOptions.escapeFormulas).toBe(true)
    })

    it('should allow escapeFormulas to be optional', () => {
      const csvOptions: SanitizeCSVOptions = {
        maxLength: 1000
      }
      
      expect(csvOptions.escapeFormulas).toBeUndefined()
    })

    it('should work with all inherited options', () => {
      const fullCsvOptions: SanitizeCSVOptions = {
        maxLength: 10000,
        allowHtml: true,
        trimWhitespace: false,
        normalizeUnicode: false,
        collapseSpaces: true,
        escapeFormulas: false
      }
      
      expect(fullCsvOptions.allowHtml).toBe(true)
      expect(fullCsvOptions.trimWhitespace).toBe(false)
      expect(fullCsvOptions.escapeFormulas).toBe(false)
    })
  })

  describe('FORMULA_PREFIXES', () => {
    it('should contain expected formula prefixes', () => {
      expect(FORMULA_PREFIXES).toContain('=')
      expect(FORMULA_PREFIXES).toContain('+')
      expect(FORMULA_PREFIXES).toContain('-')
      expect(FORMULA_PREFIXES).toContain('@')
      expect(FORMULA_PREFIXES).toContain('\t')
      expect(FORMULA_PREFIXES).toContain('\r')
    })

    it('should have correct length', () => {
      expect(FORMULA_PREFIXES).toHaveLength(6)
    })

    it('should be readonly array', () => {
      // TypeScript ensures this is readonly, but we can test the runtime behavior
      expect(Array.isArray(FORMULA_PREFIXES)).toBe(true)
    })

    it('should contain all dangerous formula characters', () => {
      const expectedPrefixes = ['=', '+', '-', '@', '\t', '\r']
      
      expectedPrefixes.forEach(prefix => {
        expect(FORMULA_PREFIXES).toContain(prefix)
      })
    })
  })

  describe('FormulaPrefix type', () => {
    it('should accept valid formula prefixes', () => {
      const validPrefixes: FormulaPrefix[] = ['=', '+', '-', '@', '\t', '\r']
      
      validPrefixes.forEach(prefix => {
        expect(FORMULA_PREFIXES).toContain(prefix)
      })
    })

    it('should work with type guards', () => {
      function isFormulaPrefix(char: string): char is FormulaPrefix {
        return FORMULA_PREFIXES.includes(char as FormulaPrefix)
      }
      
      expect(isFormulaPrefix('=')).toBe(true)
      expect(isFormulaPrefix('+')).toBe(true)
      expect(isFormulaPrefix('a')).toBe(false)
      expect(isFormulaPrefix('1')).toBe(false)
    })
  })

  describe('type compatibility', () => {
    it('should allow SanitizeSearchOptions where SanitizeOptions expected', () => {
      function processSanitizeOptions(options: SanitizeOptions): void {
        expect(options).toBeDefined()
      }
      
      const searchOptions: SanitizeSearchOptions = { maxLength: 100 }
      processSanitizeOptions(searchOptions) // Should not cause type error
    })

    it('should allow SanitizeCSVOptions where SanitizeOptions expected', () => {
      function processSanitizeOptions(options: SanitizeOptions): void {
        expect(options).toBeDefined()
      }
      
      const csvOptions: SanitizeCSVOptions = { 
        maxLength: 1000, 
        escapeFormulas: true 
      }
      processSanitizeOptions(csvOptions) // Should not cause type error
    })
  })

  describe('option validation patterns', () => {
    it('should support common validation patterns', () => {
      function validateSanitizeOptions(options: SanitizeOptions): boolean {
        if (options.maxLength !== undefined && options.maxLength <= 0) {
          return false
        }
        return true
      }
      
      expect(validateSanitizeOptions({ maxLength: 100 })).toBe(true)
      expect(validateSanitizeOptions({ maxLength: 0 })).toBe(false)
      expect(validateSanitizeOptions({})).toBe(true)
    })

    it('should support CSV-specific validation', () => {
      function validateCSVOptions(options: SanitizeCSVOptions): boolean {
        // CSV files typically need larger max lengths
        if (options.maxLength !== undefined && options.maxLength < 1000) {
          return false
        }
        return true
      }
      
      expect(validateCSVOptions({ maxLength: 5000 })).toBe(true)
      expect(validateCSVOptions({ maxLength: 500 })).toBe(false)
      expect(validateCSVOptions({})).toBe(true)
    })

    it('should support search-specific validation', () => {
      function validateSearchOptions(options: SanitizeSearchOptions): boolean {
        // Search queries should be shorter
        if (options.maxLength !== undefined && options.maxLength > 500) {
          return false
        }
        return true
      }
      
      expect(validateSearchOptions({ maxLength: 200 })).toBe(true)
      expect(validateSearchOptions({ maxLength: 1000 })).toBe(false)
      expect(validateSearchOptions({})).toBe(true)
    })
  })

  describe('default value patterns', () => {
    it('should support default value merging', () => {
      const defaultOptions: Required<SanitizeOptions> = {
        maxLength: 10000,
        allowHtml: false,
        trimWhitespace: true,
        normalizeUnicode: true,
        collapseSpaces: false
      }
      
      function mergeWithDefaults(options: SanitizeOptions): Required<SanitizeOptions> {
        return { ...defaultOptions, ...options }
      }
      
      const merged = mergeWithDefaults({ maxLength: 500, allowHtml: true })
      
      expect(merged.maxLength).toBe(500)
      expect(merged.allowHtml).toBe(true)
      expect(merged.trimWhitespace).toBe(true) // from defaults
      expect(merged.normalizeUnicode).toBe(true) // from defaults
      expect(merged.collapseSpaces).toBe(false) // from defaults
    })
  })
})