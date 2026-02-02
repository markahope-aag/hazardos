import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, PATCH, DELETE } from '@/app/api/invoices/[id]/line-items/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/invoices-service', () => ({
  InvoicesService: {
    addLineItem: vi.fn(),
    updateLineItem: vi.fn(),
    deleteLineItem: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { InvoicesService } from '@/lib/services/invoices-service'

const mockProfile = {
  organization_id: 'org-123',
  role: 'admin'
}

const setupAuthenticatedUser = () => {
  vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@example.com' } },
    error: null
  })

  vi.mocked(mockSupabaseClient.from).mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      })
    })
  } as any)
}

describe('Invoice Line Items Management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/invoices/[id]/line-items', () => {
    it('should add line item to invoice', async () => {
      setupAuthenticatedUser()

      const mockLineItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        invoice_id: '550e8400-e29b-41d4-a716-446655440010',
        description: 'Asbestos Removal - Living Room',
        quantity: 1,
        unit_price: 2500.00,
        total: 2500.00
      }

      vi.mocked(InvoicesService.addLineItem).mockResolvedValue(mockLineItem)

      const request = new NextRequest('http://localhost:3000/api/invoices/550e8400-e29b-41d4-a716-446655440010/line-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'Asbestos Removal - Living Room',
          quantity: 1,
          unit_price: 2500.00
        })
      })

      const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440010' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.description).toBe('Asbestos Removal - Living Room')
      expect(data.total).toBe(2500.00)
      expect(InvoicesService.addLineItem).toHaveBeenCalled()
    })

    it('should add multiple quantity line item', async () => {
      setupAuthenticatedUser()

      const mockLineItem = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        description: 'HEPA Filter - 24" x 24"',
        quantity: 5,
        unit_price: 45.00,
        total: 225.00
      }

      vi.mocked(InvoicesService.addLineItem).mockResolvedValue(mockLineItem)

      const request = new NextRequest('http://localhost:3000/api/invoices/550e8400-e29b-41d4-a716-446655440010/line-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: 'HEPA Filter - 24" x 24"',
          quantity: 5,
          unit_price: 45.00
        })
      })

      const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440010' }) })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.quantity).toBe(5)
      expect(data.total).toBe(225.00)
    })

    it('should reject unauthenticated requests', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/invoices/550e8400-e29b-41d4-a716-446655440010/line-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Test item', quantity: 1, unit_price: 100 })
      })

      const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440010' }) })

      expect(response.status).toBe(401)
    })

    it('should validate required fields', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/invoices/550e8400-e29b-41d4-a716-446655440010/line-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: 1,
          unit_price: 100
        })
      })

      const response = await POST(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440010' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.field).toBe('description')
    })
  })

  describe('PATCH /api/invoices/[id]/line-items', () => {
    it('should update line item details', async () => {
      setupAuthenticatedUser()

      const updatedLineItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Updated Description',
        quantity: 2,
        unit_price: 2600.00,
        total: 5200.00
      }

      vi.mocked(InvoicesService.updateLineItem).mockResolvedValue(updatedLineItem)

      const request = new NextRequest('http://localhost:3000/api/invoices/550e8400-e29b-41d4-a716-446655440010/line-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_item_id: '550e8400-e29b-41d4-a716-446655440001',
          description: 'Updated Description',
          quantity: 2,
          unit_price: 2600.00
        })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440010' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.description).toBe('Updated Description')
      expect(data.total).toBe(5200.00)
      expect(InvoicesService.updateLineItem).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001', {
        description: 'Updated Description',
        quantity: 2,
        unit_price: 2600.00
      })
    })

    it('should reject unauthenticated requests', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/invoices/550e8400-e29b-41d4-a716-446655440010/line-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ line_item_id: '550e8400-e29b-41d4-a716-446655440001', quantity: 2 })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440010' }) })

      expect(response.status).toBe(401)
    })

    it('should validate line_item_id is a UUID', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/invoices/550e8400-e29b-41d4-a716-446655440010/line-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_item_id: 'invalid-id',
          quantity: 2
        })
      })

      const response = await PATCH(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440010' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.error).toContain('Invalid line item ID')
    })
  })

  describe('DELETE /api/invoices/[id]/line-items', () => {
    it('should delete line item', async () => {
      setupAuthenticatedUser()

      vi.mocked(InvoicesService.deleteLineItem).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/invoices/550e8400-e29b-41d4-a716-446655440010/line-items?line_item_id=550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440010' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(InvoicesService.deleteLineItem).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should reject unauthenticated requests', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/invoices/550e8400-e29b-41d4-a716-446655440010/line-items?line_item_id=550e8400-e29b-41d4-a716-446655440001', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440010' }) })

      expect(response.status).toBe(401)
    })

    it('should validate line_item_id is a UUID', async () => {
      setupAuthenticatedUser()

      const request = new NextRequest('http://localhost:3000/api/invoices/550e8400-e29b-41d4-a716-446655440010/line-items?line_item_id=invalid-id', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440010' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.type).toBe('VALIDATION_ERROR')
      expect(data.error).toContain('Invalid line item ID')
    })
  })
})
