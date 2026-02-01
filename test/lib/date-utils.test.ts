import { describe, it, expect } from 'vitest'
import { format, parseISO, isValid, addDays, subDays, startOfDay, endOfDay } from 'date-fns'

describe('Date Utilities', () => {
  describe('Date Formatting', () => {
    it('should format dates consistently', () => {
      // Use Date constructor for consistent local time
      const date = new Date(2026, 0, 31, 10, 30, 0)

      expect(format(date, 'yyyy-MM-dd')).toBe('2026-01-31')
      expect(format(date, 'MMM dd, yyyy')).toBe('Jan 31, 2026')
      expect(format(date, 'HH:mm')).toBe('10:30')
    })

    it('should handle different date formats', () => {
      const formats = [
        'yyyy-MM-dd',
        'MM/dd/yyyy',
        'dd-MM-yyyy',
        'MMM dd, yyyy',
        'EEEE, MMMM do, yyyy'
      ]

      const date = new Date(2026, 0, 31)

      formats.forEach(formatStr => {
        const formatted = format(date, formatStr)
        expect(typeof formatted).toBe('string')
        expect(formatted.length).toBeGreaterThan(0)
      })
    })

    it('should parse ISO date strings', () => {
      const isoString = '2026-01-31T10:30:00Z'
      const parsed = parseISO(isoString)

      expect(isValid(parsed)).toBe(true)
      expect(parsed.getUTCFullYear()).toBe(2026)
      expect(parsed.getUTCMonth()).toBe(0) // January is 0
      expect(parsed.getUTCDate()).toBe(31)
    })

    it('should handle invalid dates gracefully', () => {
      const invalidDates = [
        'invalid-date',
        '2026-13-01', // Invalid month
        '2026-01-32', // Invalid day
      ]

      invalidDates.forEach(dateStr => {
        const parsed = parseISO(dateStr)
        expect(isValid(parsed)).toBe(false)
      })
    })
  })

  describe('Date Calculations', () => {
    it('should add days correctly', () => {
      const baseDate = new Date(2026, 0, 31)

      const nextDay = addDays(baseDate, 1)
      expect(format(nextDay, 'yyyy-MM-dd')).toBe('2026-02-01')

      const nextWeek = addDays(baseDate, 7)
      expect(format(nextWeek, 'yyyy-MM-dd')).toBe('2026-02-07')
    })

    it('should subtract days correctly', () => {
      const baseDate = new Date(2026, 1, 1)

      const prevDay = subDays(baseDate, 1)
      expect(format(prevDay, 'yyyy-MM-dd')).toBe('2026-01-31')

      const prevWeek = subDays(baseDate, 7)
      expect(format(prevWeek, 'yyyy-MM-dd')).toBe('2026-01-25')
    })

    it('should handle month boundaries', () => {
      const endOfJan = new Date(2026, 0, 31)
      const startOfFeb = addDays(endOfJan, 1)

      expect(format(startOfFeb, 'yyyy-MM-dd')).toBe('2026-02-01')

      const backToJan = subDays(startOfFeb, 1)
      expect(format(backToJan, 'yyyy-MM-dd')).toBe('2026-01-31')
    })

    it('should handle leap years', () => {
      const leapYear = new Date(2024, 1, 28)
      const leapDay = addDays(leapYear, 1)

      expect(format(leapDay, 'yyyy-MM-dd')).toBe('2024-02-29')

      const nonLeapYear = new Date(2025, 1, 28)
      const marchFirst = addDays(nonLeapYear, 1)

      expect(format(marchFirst, 'yyyy-MM-dd')).toBe('2025-03-01')
    })
  })

  describe('Day Boundaries', () => {
    it('should get start of day', () => {
      const date = new Date(2026, 0, 31, 15, 30, 45, 123)
      const start = startOfDay(date)

      expect(start.getHours()).toBe(0)
      expect(start.getMinutes()).toBe(0)
      expect(start.getSeconds()).toBe(0)
      expect(start.getMilliseconds()).toBe(0)
    })

    it('should get end of day', () => {
      const date = new Date(2026, 0, 31, 10, 30, 0)
      const end = endOfDay(date)

      expect(end.getHours()).toBe(23)
      expect(end.getMinutes()).toBe(59)
      expect(end.getSeconds()).toBe(59)
      expect(end.getMilliseconds()).toBe(999)
    })
  })

  describe('Business Logic Helpers', () => {
    it('should calculate age from birthdate', () => {
      const calculateAge = (birthDate: Date, referenceDate: Date = new Date()) => {
        const years = referenceDate.getFullYear() - birthDate.getFullYear()
        const monthDiff = referenceDate.getMonth() - birthDate.getMonth()

        if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < birthDate.getDate())) {
          return years - 1
        }

        return years
      }

      const birthDate = new Date(1990, 0, 31)
      const referenceDate = new Date(2026, 0, 31)

      expect(calculateAge(birthDate, referenceDate)).toBe(36)
    })

    it('should check if date is in the past', () => {
      const isInPast = (date: Date, reference: Date = new Date()) => {
        return date < reference
      }

      const pastDate = new Date(2025, 0, 1)
      const futureDate = new Date(2027, 0, 1)
      const now = new Date(2026, 0, 31)

      expect(isInPast(pastDate, now)).toBe(true)
      expect(isInPast(futureDate, now)).toBe(false)
    })

    it('should check if date is today', () => {
      const isToday = (date: Date, reference: Date = new Date()) => {
        return format(date, 'yyyy-MM-dd') === format(reference, 'yyyy-MM-dd')
      }

      const today = new Date(2026, 0, 31, 10, 30, 0)
      const todayDifferentTime = new Date(2026, 0, 31, 15, 45, 0)
      const tomorrow = new Date(2026, 1, 1, 10, 30, 0)

      expect(isToday(todayDifferentTime, today)).toBe(true)
      expect(isToday(tomorrow, today)).toBe(false)
    })

    it('should format relative time', () => {
      const formatRelativeTime = (date: Date, reference: Date = new Date()) => {
        const diffInDays = Math.floor((reference.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

        if (diffInDays === 0) return 'Today'
        if (diffInDays === 1) return 'Yesterday'
        if (diffInDays === -1) return 'Tomorrow'
        if (diffInDays > 1) return `${diffInDays} days ago`
        if (diffInDays < -1) return `In ${Math.abs(diffInDays)} days`

        return format(date, 'MMM dd, yyyy')
      }

      const reference = new Date(2026, 0, 31)

      expect(formatRelativeTime(reference, reference)).toBe('Today')
      expect(formatRelativeTime(subDays(reference, 1), reference)).toBe('Yesterday')
      expect(formatRelativeTime(addDays(reference, 1), reference)).toBe('Tomorrow')
      expect(formatRelativeTime(subDays(reference, 3), reference)).toBe('3 days ago')
      expect(formatRelativeTime(addDays(reference, 5), reference)).toBe('In 5 days')
    })

    it('should validate date ranges', () => {
      const isValidDateRange = (startDate: Date, endDate: Date) => {
        return isValid(startDate) && isValid(endDate) && startDate <= endDate
      }

      const start = new Date(2026, 0, 1)
      const end = new Date(2026, 0, 31)
      const invalidEnd = new Date(2025, 11, 31)

      expect(isValidDateRange(start, end)).toBe(true)
      expect(isValidDateRange(start, invalidEnd)).toBe(false)
    })

    it('should calculate business days between dates', () => {
      const getBusinessDaysBetween = (startDate: Date, endDate: Date) => {
        let count = 0
        const current = new Date(startDate)

        while (current <= endDate) {
          const dayOfWeek = current.getDay()
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
            count++
          }
          current.setDate(current.getDate() + 1)
        }

        return count
      }

      const monday = new Date(2026, 1, 2) // Monday
      const friday = new Date(2026, 1, 6) // Friday

      expect(getBusinessDaysBetween(monday, friday)).toBe(5)
    })
  })
})
