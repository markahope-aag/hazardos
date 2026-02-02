import { describe, it, expect } from 'vitest'
import {
  idParamSchema,
  paginationQuerySchema,
  searchQuerySchema,
  dateRangeQuerySchema,
  contactSchema,
  addressSchema,
  moneySchema,
  percentageSchema,
  dateStringSchema,
  timeStringSchema,
  uuidSchema,
  optionalEmailSchema,
  phoneSchema,
} from '@/lib/validations/common'

describe('idParamSchema', () => {
  it('accepts valid UUID', () => {
    const result = idParamSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID', () => {
    const result = idParamSchema.safeParse({ id: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    const result = idParamSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing id', () => {
    const result = idParamSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('paginationQuerySchema', () => {
  it('accepts valid pagination', () => {
    const result = paginationQuerySchema.safeParse({ limit: '10', offset: '0' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(10)
      expect(result.data.offset).toBe(0)
    }
  })

  it('accepts empty object', () => {
    const result = paginationQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('transforms string to number', () => {
    const result = paginationQuerySchema.safeParse({ limit: '25' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
    }
  })
})

describe('searchQuerySchema', () => {
  it('accepts valid search query', () => {
    const result = searchQuerySchema.safeParse({ search: 'test', limit: '10' })
    expect(result.success).toBe(true)
  })

  it('accepts empty search', () => {
    const result = searchQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('sanitizes search input', () => {
    const result = searchQuerySchema.safeParse({ search: 'test%value' })
    expect(result.success).toBe(true)
  })
})

describe('dateRangeQuerySchema', () => {
  it('accepts valid date range', () => {
    const result = dateRangeQuerySchema.safeParse({
      from_date: '2024-01-01',
      to_date: '2024-12-31',
    })
    expect(result.success).toBe(true)
  })

  it('accepts partial date range', () => {
    const result = dateRangeQuerySchema.safeParse({ from_date: '2024-01-01' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid date format', () => {
    const result = dateRangeQuerySchema.safeParse({ from_date: '01-01-2024' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid date string', () => {
    const result = dateRangeQuerySchema.safeParse({ from_date: 'invalid' })
    expect(result.success).toBe(false)
  })
})

describe('contactSchema', () => {
  it('accepts valid contact', () => {
    const result = contactSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
    })
    expect(result.success).toBe(true)
  })

  it('requires name', () => {
    const result = contactSchema.safeParse({ email: 'john@example.com' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = contactSchema.safeParse({ name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts empty email string', () => {
    const result = contactSchema.safeParse({ name: 'John', email: '' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = contactSchema.safeParse({ name: 'John', email: 'invalid' })
    expect(result.success).toBe(false)
  })

  it('accepts valid preferred contact method', () => {
    const result = contactSchema.safeParse({
      name: 'John',
      preferred_contact_method: 'email',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid preferred contact method', () => {
    const result = contactSchema.safeParse({
      name: 'John',
      preferred_contact_method: 'fax',
    })
    expect(result.success).toBe(false)
  })

  it('defaults is_primary to false', () => {
    const result = contactSchema.safeParse({ name: 'John' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_primary).toBe(false)
    }
  })

  it('rejects notes exceeding max length', () => {
    const result = contactSchema.safeParse({
      name: 'John',
      notes: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})

describe('addressSchema', () => {
  it('accepts valid address', () => {
    const result = addressSchema.safeParse({
      address_line1: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = addressSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts partial address', () => {
    const result = addressSchema.safeParse({ city: 'Springfield' })
    expect(result.success).toBe(true)
  })

  it('rejects city exceeding max length', () => {
    const result = addressSchema.safeParse({ city: 'a'.repeat(101) })
    expect(result.success).toBe(false)
  })
})

describe('moneySchema', () => {
  it('accepts valid money amount', () => {
    const result = moneySchema.safeParse(1000)
    expect(result.success).toBe(true)
  })

  it('accepts zero', () => {
    const result = moneySchema.safeParse(0)
    expect(result.success).toBe(true)
  })

  it('rejects negative amounts', () => {
    const result = moneySchema.safeParse(-100)
    expect(result.success).toBe(false)
  })

  it('rejects decimal amounts', () => {
    const result = moneySchema.safeParse(10.5)
    expect(result.success).toBe(false)
  })
})

describe('percentageSchema', () => {
  it('accepts valid percentage', () => {
    const result = percentageSchema.safeParse(50)
    expect(result.success).toBe(true)
  })

  it('accepts zero', () => {
    const result = percentageSchema.safeParse(0)
    expect(result.success).toBe(true)
  })

  it('accepts 100', () => {
    const result = percentageSchema.safeParse(100)
    expect(result.success).toBe(true)
  })

  it('rejects negative percentage', () => {
    const result = percentageSchema.safeParse(-10)
    expect(result.success).toBe(false)
  })

  it('rejects percentage over 100', () => {
    const result = percentageSchema.safeParse(101)
    expect(result.success).toBe(false)
  })

  it('accepts decimal percentage', () => {
    const result = percentageSchema.safeParse(12.5)
    expect(result.success).toBe(true)
  })
})

describe('dateStringSchema', () => {
  it('accepts valid date string', () => {
    const result = dateStringSchema.safeParse('2024-01-15')
    expect(result.success).toBe(true)
  })

  it('rejects invalid format', () => {
    const result = dateStringSchema.safeParse('01/15/2024')
    expect(result.success).toBe(false)
  })

  it('rejects invalid date', () => {
    const result = dateStringSchema.safeParse('not-a-date')
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    const result = dateStringSchema.safeParse('')
    expect(result.success).toBe(false)
  })
})

describe('timeStringSchema', () => {
  it('accepts valid time string', () => {
    const result = timeStringSchema.safeParse('14:30')
    expect(result.success).toBe(true)
  })

  it('accepts midnight', () => {
    const result = timeStringSchema.safeParse('00:00')
    expect(result.success).toBe(true)
  })

  it('rejects invalid format', () => {
    const result = timeStringSchema.safeParse('2:30 PM')
    expect(result.success).toBe(false)
  })

  it('rejects time with seconds', () => {
    const result = timeStringSchema.safeParse('14:30:00')
    expect(result.success).toBe(false)
  })
})

describe('uuidSchema', () => {
  it('accepts valid UUID', () => {
    const result = uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000')
    expect(result.success).toBe(true)
  })

  it('rejects invalid UUID', () => {
    const result = uuidSchema.safeParse('not-a-uuid')
    expect(result.success).toBe(false)
  })

  it('rejects empty string', () => {
    const result = uuidSchema.safeParse('')
    expect(result.success).toBe(false)
  })
})

describe('optionalEmailSchema', () => {
  it('accepts valid email', () => {
    const result = optionalEmailSchema.safeParse('test@example.com')
    expect(result.success).toBe(true)
  })

  it('accepts empty string', () => {
    const result = optionalEmailSchema.safeParse('')
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = optionalEmailSchema.safeParse('invalid-email')
    expect(result.success).toBe(false)
  })
})

describe('phoneSchema', () => {
  it('accepts valid phone', () => {
    const result = phoneSchema.safeParse('555-123-4567')
    expect(result.success).toBe(true)
  })

  it('accepts undefined', () => {
    const result = phoneSchema.safeParse(undefined)
    expect(result.success).toBe(true)
  })

  it('rejects phone exceeding max length', () => {
    const result = phoneSchema.safeParse('1'.repeat(21))
    expect(result.success).toBe(false)
  })
})
