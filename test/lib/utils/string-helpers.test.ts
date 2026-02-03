import { describe, it, expect } from 'vitest'

// Mock string helper functions
function capitalize(str: string): string {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function truncate(str: string, length: number, suffix: string = '...'): string {
  if (!str || str.length <= length) return str
  return str.slice(0, length - suffix.length) + suffix
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
}

function camelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
}

function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
}

function snakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

function isEmail(str: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(str)
}

function isUrl(str: string): boolean {
  try {
    new URL(str)
    return true
  } catch {
    return false
  }
}

function removeHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '')
}

function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  
  return str.replace(/[&<>"']/g, char => htmlEscapes[char])
}

describe('string helpers', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(capitalize('hello')).toBe('Hello')
    })

    it('should handle mixed case', () => {
      expect(capitalize('hELLO')).toBe('Hello')
    })

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('')
    })

    it('should handle single character', () => {
      expect(capitalize('a')).toBe('A')
    })

    it('should handle already capitalized', () => {
      expect(capitalize('Hello')).toBe('Hello')
    })
  })

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const long = 'This is a very long string that needs truncation'
      expect(truncate(long, 20)).toBe('This is a very lo...')
    })

    it('should not truncate short strings', () => {
      const short = 'Short'
      expect(truncate(short, 20)).toBe('Short')
    })

    it('should use custom suffix', () => {
      const text = 'This is a long string'
      expect(truncate(text, 10, '---')).toBe('This is---')
    })

    it('should handle empty string', () => {
      expect(truncate('', 10)).toBe('')
    })

    it('should handle exact length', () => {
      const text = 'Exactly 10'
      expect(truncate(text, 10)).toBe('Exactly 10')
    })
  })

  describe('slugify', () => {
    it('should create URL-friendly slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world')
    })

    it('should handle special characters', () => {
      expect(slugify('Hello, World!')).toBe('hello-world')
    })

    it('should handle multiple spaces', () => {
      expect(slugify('Hello    World')).toBe('hello-world')
    })

    it('should handle underscores', () => {
      expect(slugify('hello_world_test')).toBe('hello-world-test')
    })

    it('should remove leading/trailing hyphens', () => {
      expect(slugify('  -hello world-  ')).toBe('hello-world')
    })

    it('should handle numbers', () => {
      expect(slugify('Test 123 Article')).toBe('test-123-article')
    })
  })

  describe('camelCase', () => {
    it('should convert to camelCase', () => {
      expect(camelCase('hello world')).toBe('helloWorld')
    })

    it('should handle hyphens', () => {
      expect(camelCase('hello-world-test')).toBe('helloWorldTest')
    })

    it('should handle underscores', () => {
      expect(camelCase('hello_world_test')).toBe('helloWorldTest')
    })

    it('should handle mixed separators', () => {
      expect(camelCase('hello-world_test case')).toBe('helloWorldTestCase')
    })

    it('should handle already camelCase', () => {
      expect(camelCase('helloWorld')).toBe('helloworld')
    })
  })

  describe('kebabCase', () => {
    it('should convert to kebab-case', () => {
      expect(kebabCase('HelloWorld')).toBe('hello-world')
    })

    it('should handle spaces', () => {
      expect(kebabCase('Hello World Test')).toBe('hello-world-test')
    })

    it('should handle underscores', () => {
      expect(kebabCase('hello_world_test')).toBe('hello-world-test')
    })

    it('should handle camelCase', () => {
      expect(kebabCase('helloWorldTest')).toBe('hello-world-test')
    })

    it('should handle already kebab-case', () => {
      expect(kebabCase('hello-world')).toBe('hello-world')
    })
  })

  describe('snakeCase', () => {
    it('should convert to snake_case', () => {
      expect(snakeCase('HelloWorld')).toBe('hello_world')
    })

    it('should handle spaces', () => {
      expect(snakeCase('Hello World Test')).toBe('hello_world_test')
    })

    it('should handle hyphens', () => {
      expect(snakeCase('hello-world-test')).toBe('hello_world_test')
    })

    it('should handle camelCase', () => {
      expect(snakeCase('helloWorldTest')).toBe('hello_world_test')
    })

    it('should handle already snake_case', () => {
      expect(snakeCase('hello_world')).toBe('hello_world')
    })
  })

  describe('isEmail', () => {
    it('should validate correct emails', () => {
      expect(isEmail('test@example.com')).toBe(true)
      expect(isEmail('user.name@domain.co.uk')).toBe(true)
      expect(isEmail('test+tag@example.org')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isEmail('invalid-email')).toBe(false)
      expect(isEmail('test@')).toBe(false)
      expect(isEmail('@example.com')).toBe(false)
      expect(isEmail('test@.com')).toBe(false)
      expect(isEmail('test..test@example.com')).toBe(false)
    })

    it('should handle empty string', () => {
      expect(isEmail('')).toBe(false)
    })
  })

  describe('isUrl', () => {
    it('should validate correct URLs', () => {
      expect(isUrl('https://example.com')).toBe(true)
      expect(isUrl('http://test.org')).toBe(true)
      expect(isUrl('https://sub.domain.com/path?query=1')).toBe(true)
    })

    it('should reject invalid URLs', () => {
      expect(isUrl('not-a-url')).toBe(false)
      expect(isUrl('http://')).toBe(false)
      expect(isUrl('://example.com')).toBe(false)
    })

    it('should handle empty string', () => {
      expect(isUrl('')).toBe(false)
    })
  })

  describe('removeHtml', () => {
    it('should remove HTML tags', () => {
      expect(removeHtml('<p>Hello <strong>World</strong></p>')).toBe('Hello World')
    })

    it('should handle self-closing tags', () => {
      expect(removeHtml('Line 1<br/>Line 2')).toBe('Line 1Line 2')
    })

    it('should handle nested tags', () => {
      expect(removeHtml('<div><p><span>Text</span></p></div>')).toBe('Text')
    })

    it('should handle text without HTML', () => {
      expect(removeHtml('Plain text')).toBe('Plain text')
    })

    it('should handle empty string', () => {
      expect(removeHtml('')).toBe('')
    })
  })

  describe('escapeHtml', () => {
    it('should escape HTML entities', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    })

    it('should escape ampersands', () => {
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
    })

    it('should escape quotes', () => {
      expect(escapeHtml('He said "Hello" & she said \'Hi\'')).toBe('He said &quot;Hello&quot; &amp; she said &#39;Hi&#39;')
    })

    it('should handle text without special characters', () => {
      expect(escapeHtml('Normal text')).toBe('Normal text')
    })

    it('should handle empty string', () => {
      expect(escapeHtml('')).toBe('')
    })
  })

  describe('integration tests', () => {
    it('should chain transformations', () => {
      const input = 'Hello World Test'
      const slug = slugify(input)
      const camel = camelCase(input)
      
      expect(slug).toBe('hello-world-test')
      expect(camel).toBe('helloWorldTest')
    })

    it('should handle complex text processing', () => {
      const html = '<p>Hello <strong>World</strong>!</p>'
      const cleaned = removeHtml(html)
      const slug = slugify(cleaned)
      
      expect(cleaned).toBe('Hello World!')
      expect(slug).toBe('hello-world')
    })

    it('should validate and format user input', () => {
      const email = 'TEST@EXAMPLE.COM'
      const isValid = isEmail(email.toLowerCase())
      const formatted = email.toLowerCase()
      
      expect(isValid).toBe(true)
      expect(formatted).toBe('test@example.com')
    })
  })
})