import { describe, it, expect } from 'vitest'

// Mock number helper functions
function formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency
  }).format(amount)
}

function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals)
}

function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function round(value: number, decimals: number = 0): number {
  const factor = Math.pow(10, decimals)
  return Math.round(value * factor) / factor
}

function isEven(num: number): boolean {
  return num % 2 === 0
}

function isOdd(num: number): boolean {
  return num % 2 !== 0
}

function isPrime(num: number): boolean {
  if (num < 2) return false
  if (num === 2) return true
  if (num % 2 === 0) return false
  
  for (let i = 3; i <= Math.sqrt(num); i += 2) {
    if (num % i === 0) return false
  }
  return true
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min
  return parseFloat(value.toFixed(decimals))
}

function sum(numbers: number[]): number {
  return numbers.reduce((total, num) => total + num, 0)
}

function average(numbers: number[]): number {
  if (numbers.length === 0) return 0
  return sum(numbers) / numbers.length
}

function median(numbers: number[]): number {
  if (numbers.length === 0) return 0
  
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = []
  for (let i = start; i <= end; i += step) {
    result.push(i)
  }
  return result
}

describe('number helpers', () => {
  describe('formatCurrency', () => {
    it('should format USD currency', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
    })

    it('should format different currencies', () => {
      expect(formatCurrency(1234.56, 'EUR', 'en-US')).toBe('€1,234.56')
      expect(formatCurrency(1234.56, 'GBP', 'en-US')).toBe('£1,234.56')
    })

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle negative amounts', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
    })

    it('should handle large numbers', () => {
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
    })
  })

  describe('formatNumber', () => {
    it('should format with default 2 decimals', () => {
      expect(formatNumber(123.456)).toBe('123.46')
    })

    it('should format with custom decimals', () => {
      expect(formatNumber(123.456, 1)).toBe('123.5')
      expect(formatNumber(123.456, 0)).toBe('123')
      expect(formatNumber(123.456, 3)).toBe('123.456')
    })

    it('should handle integers', () => {
      expect(formatNumber(123)).toBe('123.00')
    })

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0.00')
    })
  })

  describe('formatPercentage', () => {
    it('should format percentage with default 1 decimal', () => {
      expect(formatPercentage(0.1234)).toBe('12.3%')
    })

    it('should format with custom decimals', () => {
      expect(formatPercentage(0.1234, 0)).toBe('12%')
      expect(formatPercentage(0.1234, 2)).toBe('12.34%')
    })

    it('should handle zero', () => {
      expect(formatPercentage(0)).toBe('0.0%')
    })

    it('should handle values over 100%', () => {
      expect(formatPercentage(1.5)).toBe('150.0%')
    })
  })

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
    })

    it('should clamp to minimum', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('should clamp to maximum', () => {
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('should handle equal min and max', () => {
      expect(clamp(5, 3, 3)).toBe(3)
    })

    it('should handle negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5)
      expect(clamp(-15, -10, -1)).toBe(-10)
    })
  })

  describe('round', () => {
    it('should round to nearest integer by default', () => {
      expect(round(123.456)).toBe(123)
      expect(round(123.567)).toBe(124)
    })

    it('should round to specified decimals', () => {
      expect(round(123.456, 1)).toBe(123.5)
      expect(round(123.456, 2)).toBe(123.46)
    })

    it('should handle negative numbers', () => {
      expect(round(-123.456, 1)).toBe(-123.5)
    })

    it('should handle zero', () => {
      expect(round(0, 2)).toBe(0)
    })
  })

  describe('isEven', () => {
    it('should identify even numbers', () => {
      expect(isEven(2)).toBe(true)
      expect(isEven(4)).toBe(true)
      expect(isEven(0)).toBe(true)
      expect(isEven(-2)).toBe(true)
    })

    it('should identify odd numbers as false', () => {
      expect(isEven(1)).toBe(false)
      expect(isEven(3)).toBe(false)
      expect(isEven(-1)).toBe(false)
    })
  })

  describe('isOdd', () => {
    it('should identify odd numbers', () => {
      expect(isOdd(1)).toBe(true)
      expect(isOdd(3)).toBe(true)
      expect(isOdd(-1)).toBe(true)
    })

    it('should identify even numbers as false', () => {
      expect(isOdd(2)).toBe(false)
      expect(isOdd(4)).toBe(false)
      expect(isOdd(0)).toBe(false)
      expect(isOdd(-2)).toBe(false)
    })
  })

  describe('isPrime', () => {
    it('should identify prime numbers', () => {
      expect(isPrime(2)).toBe(true)
      expect(isPrime(3)).toBe(true)
      expect(isPrime(5)).toBe(true)
      expect(isPrime(7)).toBe(true)
      expect(isPrime(11)).toBe(true)
      expect(isPrime(13)).toBe(true)
    })

    it('should identify non-prime numbers', () => {
      expect(isPrime(1)).toBe(false)
      expect(isPrime(4)).toBe(false)
      expect(isPrime(6)).toBe(false)
      expect(isPrime(8)).toBe(false)
      expect(isPrime(9)).toBe(false)
      expect(isPrime(10)).toBe(false)
    })

    it('should handle edge cases', () => {
      expect(isPrime(0)).toBe(false)
      expect(isPrime(-1)).toBe(false)
      expect(isPrime(-5)).toBe(false)
    })
  })

  describe('randomInt', () => {
    it('should generate integers within range', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomInt(1, 10)
        expect(result).toBeGreaterThanOrEqual(1)
        expect(result).toBeLessThanOrEqual(10)
        expect(Number.isInteger(result)).toBe(true)
      }
    })

    it('should handle single value range', () => {
      expect(randomInt(5, 5)).toBe(5)
    })

    it('should handle negative ranges', () => {
      for (let i = 0; i < 10; i++) {
        const result = randomInt(-10, -5)
        expect(result).toBeGreaterThanOrEqual(-10)
        expect(result).toBeLessThanOrEqual(-5)
      }
    })
  })

  describe('randomFloat', () => {
    it('should generate floats within range', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomFloat(1.0, 10.0)
        expect(result).toBeGreaterThanOrEqual(1.0)
        expect(result).toBeLessThanOrEqual(10.0)
      }
    })

    it('should respect decimal places', () => {
      const result = randomFloat(1.0, 2.0, 3)
      const decimals = result.toString().split('.')[1]?.length || 0
      expect(decimals).toBeLessThanOrEqual(3)
    })

    it('should handle zero decimals', () => {
      const result = randomFloat(1.0, 10.0, 0)
      expect(Number.isInteger(result)).toBe(true)
    })
  })

  describe('sum', () => {
    it('should calculate sum of numbers', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15)
    })

    it('should handle negative numbers', () => {
      expect(sum([-1, -2, -3])).toBe(-6)
    })

    it('should handle mixed numbers', () => {
      expect(sum([-1, 2, -3, 4])).toBe(2)
    })

    it('should handle empty array', () => {
      expect(sum([])).toBe(0)
    })

    it('should handle single number', () => {
      expect(sum([42])).toBe(42)
    })
  })

  describe('average', () => {
    it('should calculate average', () => {
      expect(average([1, 2, 3, 4, 5])).toBe(3)
    })

    it('should handle decimals', () => {
      expect(average([1, 2, 3])).toBe(2)
      expect(average([1, 2, 4])).toBe(2.3333333333333335)
    })

    it('should handle empty array', () => {
      expect(average([])).toBe(0)
    })

    it('should handle single number', () => {
      expect(average([42])).toBe(42)
    })
  })

  describe('median', () => {
    it('should calculate median for odd length', () => {
      expect(median([1, 2, 3, 4, 5])).toBe(3)
    })

    it('should calculate median for even length', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5)
    })

    it('should handle unsorted arrays', () => {
      expect(median([5, 1, 3, 2, 4])).toBe(3)
    })

    it('should handle empty array', () => {
      expect(median([])).toBe(0)
    })

    it('should handle single number', () => {
      expect(median([42])).toBe(42)
    })
  })

  describe('range', () => {
    it('should generate range with default step', () => {
      expect(range(1, 5)).toEqual([1, 2, 3, 4, 5])
    })

    it('should generate range with custom step', () => {
      expect(range(0, 10, 2)).toEqual([0, 2, 4, 6, 8, 10])
    })

    it('should handle single value range', () => {
      expect(range(5, 5)).toEqual([5])
    })

    it('should handle negative ranges', () => {
      expect(range(-3, -1)).toEqual([-3, -2, -1])
    })

    it('should handle large steps', () => {
      expect(range(0, 10, 5)).toEqual([0, 5, 10])
    })
  })

  describe('integration tests', () => {
    it('should work with statistical operations', () => {
      const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      
      expect(sum(numbers)).toBe(55)
      expect(average(numbers)).toBe(5.5)
      expect(median(numbers)).toBe(5.5)
    })

    it('should work with formatting operations', () => {
      const value = 0.1234
      const currency = formatCurrency(value * 1000)
      const percentage = formatPercentage(value)
      
      expect(currency).toBe('$123.40')
      expect(percentage).toBe('12.3%')
    })

    it('should work with range operations', () => {
      const numbers = range(1, 10, 2)
      const evenNumbers = numbers.filter(isEven)
      const oddNumbers = numbers.filter(isOdd)
      
      expect(numbers).toEqual([1, 3, 5, 7, 9])
      expect(evenNumbers).toEqual([])
      expect(oddNumbers).toEqual([1, 3, 5, 7, 9])
    })
  })
})