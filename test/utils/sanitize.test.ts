import { describe, it, expect } from 'vitest'
import {
  sanitizeString,
  sanitizeSearchQuery,
  sanitizeForCSV,
  escapeCSVValue,
  escapeHtml,
  stripHtml,
  sanitizeObject,
  createSanitizeTransform,
  createSearchSanitizeTransform,
} from '@/lib/utils/sanitize'

describe('sanitizeString', () => {
  it('should trim whitespace by default', () => {
    expect(sanitizeString('  hello  ')).toBe('hello')
    expect(sanitizeString('\t\nhello\n\t')).toBe('hello')
  })

  it('should remove null bytes', () => {
    expect(sanitizeString('hello\0world')).toBe('helloworld')
    expect(sanitizeString('\0\0test\0')).toBe('test')
  })

  it('should remove control characters except newline, carriage return, tab', () => {
    expect(sanitizeString('hello\x00world')).toBe('helloworld')
    expect(sanitizeString('hello\x01world')).toBe('helloworld')
    expect(sanitizeString('hello\x1Fworld')).toBe('helloworld')
    // Tab, newline, carriage return should be preserved (but trimmed at edges)
    expect(sanitizeString('hello\tworld')).toBe('hello\tworld')
    expect(sanitizeString('hello\nworld')).toBe('hello\nworld')
  })

  it('should normalize unicode to NFC form', () => {
    // é can be represented as single char (U+00E9) or combining (e + U+0301)
    const nfd = 'café'.normalize('NFD') // decomposed
    const nfc = 'café'.normalize('NFC') // composed
    expect(sanitizeString(nfd)).toBe(nfc)
  })

  it('should escape HTML by default', () => {
    expect(sanitizeString('<script>alert(1)</script>')).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(sanitizeString('<img onerror="alert(1)">')).toBe('&lt;img onerror=&quot;alert(1)&quot;&gt;')
  })

  it('should allow HTML when option is set', () => {
    expect(sanitizeString('<b>bold</b>', { allowHtml: true })).toBe('<b>bold</b>')
  })

  it('should enforce max length', () => {
    const longString = 'a'.repeat(100)
    expect(sanitizeString(longString, { maxLength: 10 })).toBe('aaaaaaaaaa')
    expect(sanitizeString(longString, { maxLength: 10 }).length).toBe(10)
  })

  it('should use default max length of 10000', () => {
    const veryLong = 'a'.repeat(20000)
    expect(sanitizeString(veryLong).length).toBe(10000)
  })

  it('should collapse multiple spaces when option is set', () => {
    expect(sanitizeString('hello    world', { collapseSpaces: true })).toBe('hello world')
    expect(sanitizeString('a  b   c    d', { collapseSpaces: true })).toBe('a b c d')
  })

  it('should handle non-string input gracefully', () => {
    expect(sanitizeString(null as unknown as string)).toBe('')
    expect(sanitizeString(undefined as unknown as string)).toBe('')
    expect(sanitizeString(123 as unknown as string)).toBe('')
  })

  it('should preserve legitimate content', () => {
    expect(sanitizeString('John Doe')).toBe('John Doe')
    expect(sanitizeString('test@example.com')).toBe('test@example.com')
    expect(sanitizeString('$100.00')).toBe('$100.00')
  })
})

describe('sanitizeSearchQuery', () => {
  it('should escape SQL LIKE wildcard %', () => {
    expect(sanitizeSearchQuery('100%')).toBe('100\\%')
    expect(sanitizeSearchQuery('%test%')).toBe('\\%test\\%')
  })

  it('should escape SQL LIKE wildcard _', () => {
    expect(sanitizeSearchQuery('test_user')).toBe('test\\_user')
    expect(sanitizeSearchQuery('_prefix')).toBe('\\_prefix')
  })

  it('should escape backslash', () => {
    expect(sanitizeSearchQuery('path\\to\\file')).toBe('path\\\\to\\\\file')
  })

  it('should handle combined escaping correctly', () => {
    // Order matters: backslash first, then % and _
    expect(sanitizeSearchQuery('100%_test\\')).toBe('100\\%\\_test\\\\')
  })

  it('should use shorter max length for search queries', () => {
    const longSearch = 'a'.repeat(300)
    expect(sanitizeSearchQuery(longSearch).length).toBe(200)
  })

  it('should allow custom max length', () => {
    const search = 'a'.repeat(100)
    expect(sanitizeSearchQuery(search, { maxLength: 50 }).length).toBe(50)
  })

  it('should remove control characters', () => {
    expect(sanitizeSearchQuery('search\0term')).toBe('searchterm')
  })

  it('should not escape HTML in search queries', () => {
    // Search queries don't need HTML escaping, they need SQL escaping
    expect(sanitizeSearchQuery('<test>')).toBe('<test>')
  })

  it('should preserve normal search terms', () => {
    expect(sanitizeSearchQuery('John Doe')).toBe('John Doe')
    expect(sanitizeSearchQuery('example.com')).toBe('example.com')
  })
})

describe('sanitizeForCSV', () => {
  it('should prefix formula-starting content with single quote', () => {
    expect(sanitizeForCSV('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
    expect(sanitizeForCSV('+cmd|calc')).toBe("'+cmd|calc")
    expect(sanitizeForCSV('-1+2')).toBe("'-1+2")
    expect(sanitizeForCSV('@import')).toBe("'@import")
  })

  it('should handle tab and carriage return at start (trimmed as whitespace)', () => {
    // Tab and carriage return at start get trimmed as whitespace
    // Then the resulting '=formula' gets the formula prefix
    expect(sanitizeForCSV('\t=formula')).toBe("'=formula")
    expect(sanitizeForCSV('\r=formula')).toBe("'=formula")
  })

  it('should handle tab in middle of string', () => {
    // Tabs in the middle are preserved
    expect(sanitizeForCSV('hello\tworld')).toBe('hello\tworld')
  })

  it('should prevent bypass via quoted formula', () => {
    // If already starts with quote followed by formula char, add another quote
    expect(sanitizeForCSV("'=formula")).toBe("''=formula")
    expect(sanitizeForCSV("'+cmd")).toBe("''+cmd")
  })

  it('should not modify safe content', () => {
    expect(sanitizeForCSV('Hello World')).toBe('Hello World')
    expect(sanitizeForCSV('123.45')).toBe('123.45')
    expect(sanitizeForCSV('test@example.com')).toBe('test@example.com')
  })

  it('should allow disabling formula escaping', () => {
    expect(sanitizeForCSV('=SUM(A1)', { escapeFormulas: false })).toBe('=SUM(A1)')
  })

  it('should remove control characters', () => {
    expect(sanitizeForCSV('value\0here')).toBe('valuehere')
  })
})

describe('escapeCSVValue', () => {
  it('should wrap values with commas in quotes', () => {
    expect(escapeCSVValue('hello, world')).toBe('"hello, world"')
  })

  it('should escape internal quotes', () => {
    expect(escapeCSVValue('say "hello"')).toBe('"say ""hello"""')
  })

  it('should wrap values with newlines in quotes', () => {
    expect(escapeCSVValue('line1\nline2')).toBe('"line1\nline2"')
  })

  it('should combine formula protection with CSV escaping', () => {
    expect(escapeCSVValue('=formula, with comma')).toBe("\"'=formula, with comma\"")
  })

  it('should return simple values unchanged', () => {
    expect(escapeCSVValue('simple')).toBe('simple')
    expect(escapeCSVValue('12345')).toBe('12345')
  })
})

describe('escapeHtml', () => {
  it('should escape less than', () => {
    expect(escapeHtml('<')).toBe('&lt;')
  })

  it('should escape greater than', () => {
    expect(escapeHtml('>')).toBe('&gt;')
  })

  it('should escape ampersand', () => {
    expect(escapeHtml('&')).toBe('&amp;')
  })

  it('should escape double quotes', () => {
    expect(escapeHtml('"')).toBe('&quot;')
  })

  it('should escape single quotes', () => {
    expect(escapeHtml("'")).toBe('&#x27;')
  })

  it('should escape all entities in a string', () => {
    expect(escapeHtml('<script>alert("test")</script>'))
      .toBe('&lt;script&gt;alert(&quot;test&quot;)&lt;/script&gt;')
  })

  it('should handle non-string input', () => {
    expect(escapeHtml(null as unknown as string)).toBe('')
    expect(escapeHtml(undefined as unknown as string)).toBe('')
  })
})

describe('stripHtml', () => {
  it('should remove HTML tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello')
    expect(stripHtml('<b>bold</b> and <i>italic</i>')).toBe('bold and italic')
  })

  it('should handle nested tags', () => {
    expect(stripHtml('<div><p><span>nested</span></p></div>')).toBe('nested')
  })

  it('should decode common HTML entities', () => {
    expect(stripHtml('&amp; &lt; &gt; &quot; &#x27;')).toBe('& < > " \'')
    expect(stripHtml('hello&nbsp;world')).toBe('hello world')
  })

  it('should handle non-string input', () => {
    expect(stripHtml(null as unknown as string)).toBe('')
  })
})

describe('sanitizeObject', () => {
  it('should sanitize string values', () => {
    expect(sanitizeObject({ name: '  John\0  ' })).toEqual({ name: 'John' })
  })

  it('should sanitize nested objects', () => {
    const input = {
      user: {
        name: '<script>xss</script>',
        email: 'test@example.com',
      },
    }
    const expected = {
      user: {
        name: '&lt;script&gt;xss&lt;/script&gt;',
        email: 'test@example.com',
      },
    }
    expect(sanitizeObject(input)).toEqual(expected)
  })

  it('should sanitize arrays', () => {
    const input = { items: ['<b>one</b>', '<i>two</i>'] }
    const expected = { items: ['&lt;b&gt;one&lt;/b&gt;', '&lt;i&gt;two&lt;/i&gt;'] }
    expect(sanitizeObject(input)).toEqual(expected)
  })

  it('should preserve non-string primitives', () => {
    const input = {
      name: 'test',
      count: 42,
      active: true,
      nullable: null,
    }
    expect(sanitizeObject(input)).toEqual({
      name: 'test',
      count: 42,
      active: true,
      nullable: null,
    })
  })

  it('should handle null and undefined', () => {
    expect(sanitizeObject(null)).toBe(null)
    expect(sanitizeObject(undefined)).toBe(undefined)
  })

  it('should apply options to all strings', () => {
    const input = { a: 'a'.repeat(100), b: 'b'.repeat(100) }
    const result = sanitizeObject(input, { maxLength: 10 })
    expect(result.a.length).toBe(10)
    expect(result.b.length).toBe(10)
  })
})

describe('createSanitizeTransform', () => {
  it('should create a transform function', () => {
    const transform = createSanitizeTransform()
    expect(transform('  test\0  ')).toBe('test')
  })

  it('should accept options', () => {
    const transform = createSanitizeTransform({ maxLength: 5 })
    expect(transform('abcdefghij')).toBe('abcde')
  })
})

describe('createSearchSanitizeTransform', () => {
  it('should create a search transform function', () => {
    const transform = createSearchSanitizeTransform()
    expect(transform('100%')).toBe('100\\%')
  })

  it('should accept options', () => {
    const transform = createSearchSanitizeTransform({ maxLength: 10 })
    expect(transform('a'.repeat(50))).toHaveLength(10)
  })
})

describe('edge cases', () => {
  it('should handle empty strings', () => {
    expect(sanitizeString('')).toBe('')
    expect(sanitizeSearchQuery('')).toBe('')
    expect(sanitizeForCSV('')).toBe('')
    expect(escapeHtml('')).toBe('')
    expect(stripHtml('')).toBe('')
  })

  it('should handle strings with only whitespace', () => {
    expect(sanitizeString('   ')).toBe('')
    expect(sanitizeString('\t\n\r')).toBe('')
  })

  it('should handle strings with only control characters', () => {
    expect(sanitizeString('\0\x01\x02')).toBe('')
  })

  it('should handle deeply nested objects', () => {
    const input = { a: { b: { c: { d: '<script>' } } } }
    const expected = { a: { b: { c: { d: '&lt;script&gt;' } } } }
    expect(sanitizeObject(input)).toEqual(expected)
  })

  it('should handle mixed arrays', () => {
    const input = ['string', 123, true, null, { key: '<value>' }]
    const expected = ['string', 123, true, null, { key: '&lt;value&gt;' }]
    expect(sanitizeObject(input)).toEqual(expected)
  })
})
