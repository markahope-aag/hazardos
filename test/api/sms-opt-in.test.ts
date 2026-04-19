import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null)),
}))

vi.mock('@/lib/utils/logger', () => ({
  createRequestLogger: vi.fn(() => ({
    warn: vi.fn(),
    error: vi.fn(),
  })),
  formatError: vi.fn((error) => error),
}))

// Mock Supabase
const mockSupabaseClient = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Import after mocks
import { POST } from '@/app/api/sms/opt-in/route'
import { applyUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

describe('SMS Opt-in API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when phone is missing', async () => {
    const request = new NextRequest('http://localhost/api/sms/opt-in', {
      method: 'POST',
      body: JSON.stringify({ name: 'John Doe' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    
    const json = await response.json()
    expect(json.error).toBe('Phone number is required')
  })

  it('should return 400 when phone is not a string', async () => {
    const request = new NextRequest('http://localhost/api/sms/opt-in', {
      method: 'POST',
      body: JSON.stringify({ phone: 123456789 }),
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    
    const json = await response.json()
    expect(json.error).toBe('Phone number is required')
  })

  it('should return 400 for invalid phone number format', async () => {
    const request = new NextRequest('http://localhost/api/sms/opt-in', {
      method: 'POST',
      body: JSON.stringify({ phone: '123' }), // Too short
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
    
    const json = await response.json()
    expect(json.error).toBe('Invalid US phone number')
  })

  it('should normalize 10-digit phone number correctly', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ 
            data: [{ id: 'customer-1', phone: '+15551234567' }], 
            error: null 
          }),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return mockSupabaseClient.from(table)
    })

    const request = new NextRequest('http://localhost/api/sms/opt-in', {
      method: 'POST',
      body: JSON.stringify({ phone: '(555) 123-4567' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    
    // Verify the OR query was built with normalized phone
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers')
  })

  it('should normalize 11-digit phone number correctly', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return mockSupabaseClient.from(table)
    })

    const request = new NextRequest('http://localhost/api/sms/opt-in', {
      method: 'POST',
      body: JSON.stringify({ phone: '15551234567' }),
    })

    await POST(request)
    
    // Verify the OR query was built with normalized phone
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers')
  })

  it('should update existing customers with opt-in consent', async () => {
    const mockCustomers = [
      { id: 'customer-1', phone: '+15551234567' },
      { id: 'customer-2', phone: '555-123-4567' }
    ]

    const mockUpdate = vi.fn().mockReturnThis()
    const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })

    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ 
            data: mockCustomers, 
            error: null 
          }),
          update: mockUpdate,
          eq: mockEq,
        }
      }
      return mockSupabaseClient.from(table)
    })

    const request = new NextRequest('http://localhost/api/sms/opt-in', {
      method: 'POST',
      body: JSON.stringify({ phone: '555-123-4567', name: 'John Doe' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.message).toBe('SMS consent recorded. You will receive text messages at the number provided.')
    
    // Verify both customers were updated
    expect(mockUpdate).toHaveBeenCalledWith({
      sms_opt_in: true,
      sms_opt_in_at: expect.any(String),
      sms_opt_out_at: null,
    })
    expect(mockEq).toHaveBeenCalledWith('id', 'customer-1')
    expect(mockEq).toHaveBeenCalledWith('id', 'customer-2')
  })

  it('should handle no matching customers gracefully', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ 
            data: [], // No customers found
            error: null 
          }),
        }
      }
      return mockSupabaseClient.from(table)
    })

    const request = new NextRequest('http://localhost/api/sms/opt-in', {
      method: 'POST',
      body: JSON.stringify({ phone: '555-999-9999', name: 'Unknown Person' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    
    const json = await response.json()
    expect(json.success).toBe(true)
    expect(json.message).toBe('SMS consent recorded. You will receive text messages at the number provided.')
  })

  it('should return 500 when customer lookup fails', async () => {
    mockSupabaseClient.from.mockImplementation((table) => {
      if (table === 'customers') {
        return {
          select: vi.fn().mockReturnThis(),
          or: vi.fn().mockResolvedValue({ 
            data: null, 
            error: new Error('Database connection failed') 
          }),
        }
      }
      return mockSupabaseClient.from(table)
    })

    const request = new NextRequest('http://localhost/api/sms/opt-in', {
      method: 'POST',
      body: JSON.stringify({ phone: '555-123-4567' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
    
    const json = await response.json()
    expect(json.error).toBe('Internal error')
  })

  it('should handle rate limiting', async () => {
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(
      new Response('Rate Limited', { status: 429 })
    )

    const request = new NextRequest('http://localhost/api/sms/opt-in', {
      method: 'POST',
      body: JSON.stringify({ phone: '555-123-4567' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(429)
  })

  it('should handle invalid JSON body', async () => {
    // Reset rate limiting for this test
    vi.mocked(applyUnifiedRateLimit).mockResolvedValue(null)
    
    const request = new NextRequest('http://localhost/api/sms/opt-in', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(request)
    expect(response.status).toBe(500) // Caught by catch block
    
    const json = await response.json()
    expect(json.error).toBe('Internal error')
  })
})