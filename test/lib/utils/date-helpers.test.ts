import { describe, it, expect } from 'vitest'

// Mock date helper functions
function formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
  const d = new Date(date)
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    case 'long':
      return d.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    case 'iso':
      return d.toISOString().split('T')[0]
    default:
      return d.toLocaleDateString()
  }
}

function isToday(date: Date | string): boolean {
  const d = new Date(date)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

function isYesterday(date: Date | string): boolean {
  const d = new Date(date)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return d.toDateString() === yesterday.toDateString()
}

function addDays(date: Date | string, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function getRelativeTime(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  
  return formatDate(d, 'short')
}

describe('date helpers', () => {
  describe('formatDate', () => {
    const testDate = new Date('2024-01-15T10:30:00Z')

    it('should format date in short format', () => {
      const formatted = formatDate(testDate, 'short')
      expect(formatted).toBe('Jan 15, 2024')
    })

    it('should format date in long format', () => {
      const formatted = formatDate(testDate, 'long')
      expect(formatted).toBe('Monday, January 15, 2024')
    })

    it('should format date in ISO format', () => {
      const formatted = formatDate(testDate, 'iso')
      expect(formatted).toBe('2024-01-15')
    })

    it('should default to short format', () => {
      const formatted = formatDate(testDate)
      expect(formatted).toBe('Jan 15, 2024')
    })

    it('should handle string dates', () => {
      const formatted = formatDate('2024-01-15', 'short')
      expect(formatted).toBe('Jan 15, 2024')
    })
  })

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const today = new Date()
      expect(isToday(today)).toBe(true)
    })

    it('should return false for yesterday', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday)).toBe(false)
    })

    it('should return false for tomorrow', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      expect(isToday(tomorrow)).toBe(false)
    })

    it('should handle string dates', () => {
      const today = new Date().toISOString().split('T')[0]
      expect(isToday(today)).toBe(true)
    })
  })

  describe('isYesterday', () => {
    it('should return true for yesterday\'s date', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isYesterday(yesterday)).toBe(true)
    })

    it('should return false for today', () => {
      const today = new Date()
      expect(isYesterday(today)).toBe(false)
    })

    it('should return false for two days ago', () => {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      expect(isYesterday(twoDaysAgo)).toBe(false)
    })
  })

  describe('addDays', () => {
    const baseDate = new Date('2024-01-15')

    it('should add positive days', () => {
      const result = addDays(baseDate, 5)
      expect(result.getDate()).toBe(20)
      expect(result.getMonth()).toBe(0) // January
    })

    it('should subtract days with negative input', () => {
      const result = addDays(baseDate, -5)
      expect(result.getDate()).toBe(10)
      expect(result.getMonth()).toBe(0) // January
    })

    it('should handle month boundaries', () => {
      const endOfMonth = new Date('2024-01-31')
      const result = addDays(endOfMonth, 1)
      expect(result.getDate()).toBe(1)
      expect(result.getMonth()).toBe(1) // February
    })

    it('should handle year boundaries', () => {
      const endOfYear = new Date('2023-12-31')
      const result = addDays(endOfYear, 1)
      expect(result.getDate()).toBe(1)
      expect(result.getMonth()).toBe(0) // January
      expect(result.getFullYear()).toBe(2024)
    })

    it('should handle string dates', () => {
      const result = addDays('2024-01-15', 3)
      expect(result.getDate()).toBe(18)
    })
  })

  describe('getRelativeTime', () => {
    const now = new Date()

    it('should return "just now" for very recent dates', () => {
      const recent = new Date(now.getTime() - 30000) // 30 seconds ago
      expect(getRelativeTime(recent)).toBe('just now')
    })

    it('should return minutes for recent dates', () => {
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      expect(getRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago')
    })

    it('should return singular minute', () => {
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
      expect(getRelativeTime(oneMinuteAgo)).toBe('1 minute ago')
    })

    it('should return hours for dates within 24 hours', () => {
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000)
      expect(getRelativeTime(twoHoursAgo)).toBe('2 hours ago')
    })

    it('should return singular hour', () => {
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      expect(getRelativeTime(oneHourAgo)).toBe('1 hour ago')
    })

    it('should return days for dates within a week', () => {
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000)
      expect(getRelativeTime(threeDaysAgo)).toBe('3 days ago')
    })

    it('should return formatted date for older dates', () => {
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      const result = getRelativeTime(twoWeeksAgo)
      expect(result).toMatch(/\w+ \d+, \d{4}/) // Should match "Jan 1, 2024" format
    })

    it('should handle future dates', () => {
      const future = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour in future
      const result = getRelativeTime(future)
      // Future dates should return formatted date
      expect(result).toMatch(/\w+ \d+, \d{4}/)
    })
  })

  describe('integration tests', () => {
    it('should work together for date operations', () => {
      const baseDate = new Date('2024-01-15')
      const futureDate = addDays(baseDate, 10)
      const formatted = formatDate(futureDate, 'iso')
      
      expect(formatted).toBe('2024-01-25')
    })

    it('should handle edge cases consistently', () => {
      const date = new Date('2024-02-29') // Leap year
      const nextYear = addDays(date, 365)
      
      expect(nextYear.getFullYear()).toBe(2025)
      expect(formatDate(nextYear, 'iso')).toBe('2025-02-28')
    })
  })
})