import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to create mock before vi.mock is processed
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  ilike: vi.fn(),
  or: vi.fn(),
  order: vi.fn(),
  range: vi.fn(),
  limit: vi.fn(),
  single: vi.fn(),
  count: vi.fn()
}))

// Setup chainable mock - each method returns mockSupabase for chaining
const setupChainableMock = () => {
  mockSupabase.from.mockReturnValue(mockSupabase)
  mockSupabase.select.mockReturnValue(mockSupabase)
  mockSupabase.insert.mockReturnValue(mockSupabase)
  mockSupabase.update.mockReturnValue(mockSupabase)
  mockSupabase.delete.mockReturnValue(mockSupabase)
  mockSupabase.eq.mockReturnValue(mockSupabase)
  mockSupabase.ilike.mockReturnValue(mockSupabase)
  mockSupabase.or.mockReturnValue(mockSupabase)
  mockSupabase.order.mockReturnValue(mockSupabase)
  mockSupabase.range.mockReturnValue(mockSupabase)
  mockSupabase.limit.mockReturnValue(mockSupabase)
  mockSupabase.count.mockReturnValue(mockSupabase)
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase
}))

import { CustomersService } from '@/lib/supabase/customers'

describe('CustomersService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupChainableMock()
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

      // getCustomers doesn't call .single(), the query itself returns { data, error }
      mockSupabase.order.mockResolvedValue({ data: mockCustomers, error: null })

      const result = await CustomersService.getCustomers('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('customers')
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(result).toEqual(mockCustomers)
    })

    it('should apply search filter when provided', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      await CustomersService.getCustomers('org-1', { search: 'john' })

      // The actual service uses .or() for search, not .ilike()
      expect(mockSupabase.or).toHaveBeenCalled()
    })

    it('should apply status filter when provided', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      await CustomersService.getCustomers('org-1', { status: 'prospect' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'prospect')
    })

    it('should apply pagination when provided', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null })

      await CustomersService.getCustomers('org-1', { limit: 10, offset: 20 })

      expect(mockSupabase.range).toHaveBeenCalledWith(20, 29)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.order.mockResolvedValue({ data: null, error: { message: 'Database connection failed' } })

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
      expect(mockSupabase.insert).toHaveBeenCalledWith([newCustomer])
      expect(result).toEqual(createdCustomer)
    })

    it('should handle validation errors', async () => {
      const invalidCustomer = {
        organization_id: 'org-1',
        name: '', // Invalid empty name
        email: 'invalid-email'
      }

      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Validation failed' } })

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
      // deleteCustomer doesn't call .single(), the query chain ends at .eq()
      mockSupabase.eq.mockResolvedValue({ data: null, error: null })

      await CustomersService.deleteCustomer('customer-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('customers')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'customer-1')
    })

    it('should handle delete errors', async () => {
      mockSupabase.eq.mockResolvedValue({ data: null, error: { message: 'Cannot delete customer with linked surveys' } })

      await expect(CustomersService.deleteCustomer('customer-1')).rejects.toThrow('Cannot delete customer with linked surveys')
    })
  })

  describe('getCustomerStats', () => {
    it('should return customer statistics', async () => {
      // The service uses Promise.all with 4 count queries
      // Each query: from().select().eq('organization_id').eq('status')
      // Need to mock second .eq() call to return { count, error }
      let eqCallCount = 0
      mockSupabase.eq.mockImplementation(() => {
        eqCallCount++
        // Every second call is the final .eq('status', ...) that returns the promise
        if (eqCallCount % 2 === 0) {
          // Return different counts for each status query
          const counts = [25, 30, 40, 5] // lead, prospect, customer, inactive
          const index = Math.floor((eqCallCount - 2) / 2)
          return Promise.resolve({ count: counts[index], error: null })
        }
        // First .eq() in each chain returns mockSupabase for chaining
        return mockSupabase
      })

      const result = await CustomersService.getCustomerStats('org-1')

      expect(result).toEqual({
        total: 100,
        leads: 25,
        prospects: 30,
        customers: 40,
        inactive: 5
      })
    })
  })

  describe('updateCustomerStatus', () => {
    it('should update only customer status', async () => {
      const updatedCustomer = {
        id: 'customer-1',
        status: 'customer'
      }

      // Need to ensure select() returns mockSupabase for .single() to work
      mockSupabase.select.mockReturnValue(mockSupabase)
      mockSupabase.single.mockResolvedValue({ data: updatedCustomer, error: null })

      const result = await CustomersService.updateCustomerStatus('customer-1', 'customer')

      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'customer' })
      expect(result).toEqual(updatedCustomer)
    })

    it('should validate status values', async () => {
      const validStatuses = ['lead', 'prospect', 'customer', 'inactive'] as const

      // Ensure select() returns mockSupabase for .single() to work
      mockSupabase.select.mockReturnValue(mockSupabase)

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
      // The service calls .order() at the end which returns the final promise
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { message: 'Network error' }
      })

      await expect(CustomersService.getCustomers('org-1')).rejects.toThrow('Network error')
    })

    it('should handle Supabase auth errors', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { code: '401', message: 'Unauthorized' }
      })

      await expect(CustomersService.getCustomers('org-1')).rejects.toThrow('Unauthorized')
    })

    it('should handle RLS policy violations', async () => {
      mockSupabase.order.mockResolvedValue({
        data: null,
        error: { code: '42501', message: 'Insufficient privileges' }
      })

      await expect(CustomersService.getCustomers('org-1')).rejects.toThrow('Insufficient privileges')
    })
  })
})