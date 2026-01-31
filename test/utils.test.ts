import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
    })

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional')
    })

    it('should handle undefined and null values', () => {
      expect(cn('base', undefined, null, 'valid')).toBe('base valid')
    })

    it('should handle empty strings', () => {
      expect(cn('base', '', 'valid')).toBe('base valid')
    })

    it('should handle array of classes', () => {
      expect(cn(['class1', 'class2'], 'class3')).toBe('class1 class2 class3')
    })

    it('should handle object with boolean values', () => {
      expect(cn({
        'active': true,
        'disabled': false,
        'visible': true
      })).toBe('active visible')
    })

    it('should merge tailwind classes correctly', () => {
      expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
    })

    it('should handle complex combinations', () => {
      const result = cn(
        'base-class',
        true && 'conditional-class',
        { 'object-class': true, 'hidden-class': false },
        ['array-class1', 'array-class2']
      )
      expect(result).toBe('base-class conditional-class object-class array-class1 array-class2')
    })

    it('should return empty string for no arguments', () => {
      expect(cn()).toBe('')
    })

    it('should handle whitespace correctly', () => {
      expect(cn('  class1  ', '  class2  ')).toBe('class1 class2')
    })
  })

  describe('Environment Variables', () => {
    it('should have required Supabase environment variables in test', () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
      expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
    })
  })

  describe('Type Guards', () => {
    it('should identify valid UUIDs', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000'
      const invalidUUID = 'not-a-uuid'
      
      // Simple UUID validation regex
      const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
      
      expect(isUUID(validUUID)).toBe(true)
      expect(isUUID(invalidUUID)).toBe(false)
    })

    it('should identify valid email addresses', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'user+tag@example.org']
      const invalidEmails = ['invalid-email', '@example.com', 'user@', 'user@.com']
      
      const isEmail = (str: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)
      
      validEmails.forEach(email => {
        expect(isEmail(email)).toBe(true)
      })
      
      invalidEmails.forEach(email => {
        expect(isEmail(email)).toBe(false)
      })
    })

    it('should identify valid phone numbers', () => {
      const validPhones = ['(555) 123-4567', '555-123-4567', '5551234567', '+1-555-123-4567']
      const invalidPhones = ['123', 'abc-def-ghij', '']
      
      const isPhone = (str: string) => /^[\+]?[\d\s\-\(\)]{10,}$/.test(str)
      
      validPhones.forEach(phone => {
        expect(isPhone(phone)).toBe(true)
      })
      
      invalidPhones.forEach(phone => {
        expect(isPhone(phone)).toBe(false)
      })
    })
  })

  describe('String Utilities', () => {
    it('should capitalize first letter', () => {
      const capitalize = (str: string) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
      
      expect(capitalize('hello')).toBe('Hello')
      expect(capitalize('WORLD')).toBe('World')
      expect(capitalize('tEST')).toBe('Test')
    })

    it('should format names properly', () => {
      const formatName = (first: string, last: string) => `${first.trim()} ${last.trim()}`
      
      expect(formatName('John', 'Doe')).toBe('John Doe')
      expect(formatName('  Jane  ', '  Smith  ')).toBe('Jane Smith')
    })

    it('should truncate long strings', () => {
      const truncate = (str: string, length: number) => 
        str.length > length ? str.substring(0, length) + '...' : str
      
      expect(truncate('This is a long string', 10)).toBe('This is a ...')
      expect(truncate('Short', 10)).toBe('Short')
    })

    it('should generate initials from name', () => {
      const getInitials = (name: string) => 
        name.split(' ').map(n => n.charAt(0).toUpperCase()).join('')
      
      expect(getInitials('John Doe')).toBe('JD')
      expect(getInitials('Jane Mary Smith')).toBe('JMS')
      expect(getInitials('Madonna')).toBe('M')
    })
  })
})