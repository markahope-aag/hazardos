import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CustomersService } from '@/lib/supabase/customers'

// Mock the Supabase client
const mockSupabase = {
  from: vi.fn(() => mockSupabase),
  select: vi.fn(() => mockSupabase),
  insert: vi.fn(() => mockSupabase),
  update: vi.fn(() => mockSupabase),
  delete: vi.fn(() => mockSupabase),
  eq: vi.fn(() => mockSupabase),
  ilike: vi.fn(() => mockSupabase),
  order: vi.fn(() => mockSupabase),
  range: vi.fn(() => mockSupabase),
  single: vi.fn(),
  count: vi.fn(() => mockSupabase)
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

describe('CustomersService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCustomers', () => {
    it('should fetch customers for organization', async () => {
      const mockCustomers = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          status: 'prospect',
          created_at: '2026-01-31T10:00:00Z'
        }
      ]

      mockSupabase.single.mockResolvedValue({ data: mockCustomers, error: null })

      const result = await CustomersService.getCustomers('org-1')
      
      expect(mockSupabase.from).toHaveBeenCalledWith('customers')
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(result).toEqual(mockCustomers)
    })

    it('should apply search filter when provided', async () => {
      mockSupabase.single.mockResolvedValue({ data: [], error: null })

      await CustomersService.getCustomers('org-1', { search: 'john' })
      
      expect(mockSupabase.ilike).toHaveBeenCalledWith('name', '%john%')
    })

    it('should apply status filter when provided', async () => {
      mockSupabase.single.mockResolvedValue({ data: [], error: null })

      await CustomersService.getCustomers('org-1', { status: 'prospect' })
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'prospect')
    })

    it('should apply pagination when provided', async () => {
      mockSupabase.single.mockResolvedValue({ data: [], error: null })

      await CustomersService.getCustomers('org-1', { limit: 10, offset: 20 })
      
      expect(mockSupabase.range).toHaveBeenCalledWith(20, 29)
    })

    it('should handle database errors gracefully', async () => {
      const mockError = new Error('Database connection failed')
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      await expect(CustomersService.getCustomers('org-1')).rejects.toThrow('Database connection failed')
    })
  })

  describe('getCustomer', () => {
    it('should fetch single customer by id', async () => {
      const mockCustomer = {
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com'
      }

      mockSupabase.single.mockResolvedValue({ data: mockCustomer, error: null })

      const result = await CustomersService.getCustomer('customer-1')
      
      expect(mockSupabase.from).toHaveBeenCalledWith('customers')
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'customer-1')
      expect(result).toEqual(mockCustomer)
    })

    it('should return null when customer not found', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })

      const result = await CustomersService.getCustomer('nonexistent-id')
      expect(result).toBeNull()
    })

    it('should throw error for database issues', async () => {
      const mockError = new Error('Database error')
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      await expect(CustomersService.getCustomer('customer-1')).rejects.toThrow('Database error')
    })
  })

  describe('createCustomer', () => {
    it('should create customer with valid data', async () => {
      const newCustomer = {
        organization_id: 'org-1',
        name: 'Jane Smith',
        email: 'jane@example.com',
        status: 'lead' as const
      }

      const createdCustomer = { id: 'new-customer-id', ...newCustomer }
      mockSupabase.single.mockResolvedValue({ data: createdCustomer, error: null })

      const result = await CustomersService.createCustomer(newCustomer)
      
      expect(mockSupabase.from).toHaveBeenCalledWith('customers')
      expect(mockSupabase.insert).toHaveBeenCalledWith(newCustomer)
      expect(result).toEqual(createdCustomer)
    })

    it('should handle validation errors', async () => {
      const invalidCustomer = {
        organization_id: 'org-1',
        name: '', // Invalid empty name
        email: 'invalid-email'
      }

      const mockError = new Error('Validation failed')
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      await expect(CustomersService.createCustomer(invalidCustomer)).rejects.toThrow('Validation failed')
    })
  })

  describe('updateCustomer', () => {
    it('should update customer with valid data', async () => {
      const updates = {
        name: 'Updated Name',
        status: 'customer' as const
      }

      const updatedCustomer = { id: 'customer-1', ...updates }
      mockSupabase.single.mockResolvedValue({ data: updatedCustomer, error: null })

      const result = await CustomersService.updateCustomer('customer-1', updates)
      
      expect(mockSupabase.from).toHaveBeenCalledWith('customers')
      expect(mockSupabase.update).toHaveBeenCalledWith(updates)
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'customer-1')
      expect(result).toEqual(updatedCustomer)
    })

    it('should handle partial updates', async () => {
      const partialUpdate = { status: 'prospect' as const }
      
      mockSupabase.single.mockResolvedValue({ 
        data: { id: 'customer-1', ...partialUpdate }, 
        error: null 
      })

      const result = await CustomersService.updateCustomer('customer-1', partialUpdate)
      
      expect(mockSupabase.update).toHaveBeenCalledWith(partialUpdate)
      expect(result).toEqual(expect.objectContaining(partialUpdate))
    })
  })

  describe('deleteCustomer', () => {
    it('should delete customer by id', async () => {
      mockSupabase.single.mockResolvedValue({ data: null, error: null })

      await CustomersService.deleteCustomer('customer-1')
      
      expect(mockSupabase.from).toHaveBeenCalledWith('customers')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'customer-1')
    })

    it('should handle delete errors', async () => {
      const mockError = new Error('Cannot delete customer with linked surveys')
      mockSupabase.single.mockResolvedValue({ data: null, error: mockError })

      await expect(CustomersService.deleteCustomer('customer-1')).rejects.toThrow('Cannot delete customer with linked surveys')
    })
  })

  describe('getCustomerStats', () => {
    it('should return customer statistics', async () => {
      // Mock stats for potential future use
      // const mockStats = {
      //   total: 100,
      //   leads: 25,
      //   prospects: 30,
      //   customers: 40,
      //   inactive: 5
      // }

      // Mock multiple queries for stats
      mockSupabase.single
        .mockResolvedValueOnce({ data: [{ count: 100 }], error: null })
        .mockResolvedValueOnce({ data: [{ count: 25 }], error: null })
        .mockResolvedValueOnce({ data: [{ count: 30 }], error: null })
        .mockResolvedValueOnce({ data: [{ count: 40 }], error: null })
        .mockResolvedValueOnce({ data: [{ count: 5 }], error: null })

      const result = await CustomersService.getCustomerStats('org-1')
      
      expect(result).toEqual(expect.objectContaining({
        total: expect.any(Number),
        leads: expect.any(Number),
        prospects: expect.any(Number),
        customers: expect.any(Number),
        inactive: expect.any(Number)
      }))
    })
  })

  describe('updateCustomerStatus', () => {
    it('should update only customer status', async () => {
      const updatedCustomer = {
        id: 'customer-1',
        status: 'customer'
      }

      mockSupabase.single.mockResolvedValue({ data: updatedCustomer, error: null })

      const result = await CustomersService.updateCustomerStatus('customer-1', 'customer')
      
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'customer' })
      expect(result).toEqual(updatedCustomer)
    })

    it('should validate status values', async () => {
      const validStatuses = ['lead', 'prospect', 'customer', 'inactive'] as const

      for (const status of validStatuses) {
        mockSupabase.single.mockResolvedValue({ 
          data: { id: 'customer-1', status }, 
          error: null 
        })

        const result = await CustomersService.updateCustomerStatus('customer-1', status)
        expect(result).toEqual(expect.objectContaining({ status }))
      }
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Network error'))

      await expect(CustomersService.getCustomers('org-1')).rejects.toThrow('Network error')
    })

    it('should handle Supabase auth errors', async () => {
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: { code: '401', message: 'Unauthorized' } 
      })

      await expect(CustomersService.getCustomers('org-1')).rejects.toThrow('Unauthorized')
    })

    it('should handle RLS policy violations', async () => {
      mockSupabase.single.mockResolvedValue({ 
        data: null, 
        error: { code: '42501', message: 'Insufficient privileges' } 
      })

      await expect(CustomersService.getCustomers('org-1')).rejects.toThrow('Insufficient privileges')
    })
  })
})