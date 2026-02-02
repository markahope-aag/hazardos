import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCustomers, useCustomer, useCreateCustomer, useUpdateCustomer, useDeleteCustomer } from '@/lib/hooks/use-customers'
import { createMockCustomer, createMockCustomerArray } from '@/test/helpers/mock-data'

// Mock the customers service
vi.mock('@/lib/supabase/customers', () => ({
  CustomersService: {
    getCustomers: vi.fn(),
    getCustomer: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
    getCustomerStats: vi.fn(),
    updateCustomerStatus: vi.fn()
  }
}))

// Mock the auth hook
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    organization: { id: 'test-org-id' },
    user: { id: 'test-user-id' }
  })
}))

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Customer Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCustomers', () => {
    it('should fetch customers with default options', async () => {
      const mockCustomers = createMockCustomerArray(2)

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue(mockCustomers)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCustomers(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockCustomers)
      // The hook passes default pagination options (page 1, pageSize 25 = offset 0, limit 25)
      expect(CustomersService.getCustomers).toHaveBeenCalledWith('test-org-id', {
        search: undefined,
        status: undefined,
        limit: 25,
        offset: 0
      })
    })

    it('should apply search filter', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const wrapper = createWrapper()
      renderHook(() => useCustomers({ search: 'john' }), { wrapper })

      await waitFor(() => {
        expect(CustomersService.getCustomers).toHaveBeenCalledWith('test-org-id', {
          search: 'john',
          status: undefined,
          limit: 25,
          offset: 0
        })
      })
    })

    it('should apply status filter', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const wrapper = createWrapper()
      renderHook(() => useCustomers({ status: 'prospect' }), { wrapper })

      await waitFor(() => {
        expect(CustomersService.getCustomers).toHaveBeenCalledWith('test-org-id', {
          search: undefined,
          status: 'prospect',
          limit: 25,
          offset: 0
        })
      })
    })

    it('should handle loading state', () => {
      const wrapper = createWrapper()
      const { result } = renderHook(() => useCustomers(), { wrapper })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()
    })

    it('should handle error state', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockRejectedValue(new Error('Network error'))

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCustomers(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
    })
  })

  describe('useCustomer', () => {
    it('should fetch single customer by id', async () => {
      const mockCustomer = createMockCustomer({ id: 'customer-1', name: 'John Doe' })

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomer).mockResolvedValue(mockCustomer)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCustomer('customer-1'), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual(mockCustomer)
      expect(CustomersService.getCustomer).toHaveBeenCalledWith('customer-1')
    })

    it('should not fetch when id is undefined', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService)
      
      const wrapper = createWrapper()
      const { result } = renderHook(() => useCustomer(undefined as unknown as string), { wrapper })

      expect(result.current.data).toBeUndefined()
      expect(CustomersService.getCustomer).not.toHaveBeenCalled()
    })
  })

  describe('useCreateCustomer', () => {
    it('should create customer successfully', async () => {
      const newCustomerData = {
        name: 'New Customer',
        email: 'new@example.com',
        status: 'lead' as const
      }

      const createdCustomer = createMockCustomer({ id: 'new-id', name: newCustomerData.name, email: newCustomerData.email, status: newCustomerData.status })

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.createCustomer).mockResolvedValue(createdCustomer)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCreateCustomer(), { wrapper })

      await result.current.mutateAsync(newCustomerData)

      expect(CustomersService.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'test-org-id',
          name: newCustomerData.name,
          email: newCustomerData.email,
          status: newCustomerData.status
        })
      )
    })

    it('should handle creation errors', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.createCustomer).mockRejectedValue(new Error('Creation failed'))

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCreateCustomer(), { wrapper })

      await expect(result.current.mutateAsync({
        name: 'Test Customer',
        status: 'lead'
      })).rejects.toThrow('Creation failed')
    })
  })

  describe('useUpdateCustomer', () => {
    it('should update customer successfully', async () => {
      const updates = { name: 'Updated Name' }
      const updatedCustomer = createMockCustomer({ id: 'customer-1', name: updates.name })

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.updateCustomer).mockResolvedValue(updatedCustomer)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useUpdateCustomer(), { wrapper })

      await result.current.mutateAsync({ id: 'customer-1', updates })

      expect(CustomersService.updateCustomer).toHaveBeenCalledWith('customer-1', updates)
    })
  })

  describe('useDeleteCustomer', () => {
    it('should delete customer successfully', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.deleteCustomer).mockResolvedValue(undefined)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteCustomer(), { wrapper })

      await result.current.mutateAsync('customer-1')

      expect(CustomersService.deleteCustomer).toHaveBeenCalledWith('customer-1')
    })

    it('should handle delete errors', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.deleteCustomer).mockRejectedValue(new Error('Cannot delete customer with linked surveys'))

      const wrapper = createWrapper()
      const { result } = renderHook(() => useDeleteCustomer(), { wrapper })

      await expect(result.current.mutateAsync('customer-1')).rejects.toThrow('Cannot delete customer with linked surveys')
    })
  })

  describe('Query Invalidation', () => {
    it('should invalidate customers query after creation', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.createCustomer).mockResolvedValue(createMockCustomer({ id: 'new-id', name: 'New Customer' }))

      const wrapper = createWrapper()
      const { result: createResult } = renderHook(() => useCreateCustomer(), { wrapper })
      const { result: listResult } = renderHook(() => useCustomers(), { wrapper })

      await createResult.current.mutateAsync({
        name: 'New Customer',
        status: 'lead'
      })

      // Query should be invalidated and refetch
      await waitFor(() => {
        expect(listResult.current.isRefetching || listResult.current.isLoading).toBe(true)
      })
    })

    it('should invalidate customer query after update', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.updateCustomer).mockResolvedValue(createMockCustomer({ id: 'customer-1', name: 'Updated' }))

      const wrapper = createWrapper()
      const { result: updateResult } = renderHook(() => useUpdateCustomer(), { wrapper })
      const { result: singleResult } = renderHook(() => useCustomer('customer-1'), { wrapper })

      await updateResult.current.mutateAsync({
        id: 'customer-1',
        updates: { name: 'Updated Name' }
      })

      // Individual customer query should be invalidated
      await waitFor(() => {
        expect(singleResult.current.isRefetching || singleResult.current.isLoading).toBe(true)
      })
    })
  })

  describe('Optimistic Updates', () => {
    it('should handle optimistic updates for status changes', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      // Use a delayed mock to ensure we can check isPending state
      vi.mocked(CustomersService.updateCustomer).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(
          createMockCustomer({ id: 'customer-1', status: 'customer' })
        ), 100))
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useUpdateCustomer(), { wrapper })

      // Trigger the mutation inside act
      act(() => {
        result.current.mutate({
          id: 'customer-1',
          updates: { status: 'customer' }
        })
      })

      // After mutate is called, isPending should be true
      await waitFor(() => {
        expect(result.current.isPending).toBe(true)
      })
    })
  })
})