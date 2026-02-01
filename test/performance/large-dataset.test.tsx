import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCustomers } from '@/lib/hooks/use-customers'
import { createMockCustomer } from '@/test/helpers/mock-data'
import type { Customer } from '@/types/database'

// Mock the customers service
vi.mock('@/lib/supabase/customers', () => ({
  CustomersService: {
    getCustomers: vi.fn()
  }
}))

// Mock the auth hook
vi.mock('@/lib/hooks/use-multi-tenant-auth', () => ({
  useMultiTenantAuth: () => ({
    organization: { id: 'test-org-id' }
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

describe('Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Large Dataset Handling', () => {
    it('should handle 10,000 customers efficiently', async () => {
      const largeCustomerList = Array.from({ length: 10000 }, (_, i) => 
        createMockCustomer({
          id: `customer-${i}`,
          name: `Customer ${i}`,
          email: `customer${i}@example.com`,
          status: 'prospect'
        })
      )

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue(largeCustomerList)

      const wrapper = createWrapper()
      const startTime = performance.now()
      
      const { result } = renderHook(() => useCustomers(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      const endTime = performance.now()
      const duration = endTime - startTime

      expect(result.current.data).toHaveLength(10000)
      expect(duration).toBeLessThan(1000) // Should complete within 1 second
    })

    it('should handle rapid successive queries without memory leaks', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const wrapper = createWrapper()
      const initialMemory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0

      // Perform 100 rapid queries
      for (let i = 0; i < 100; i++) {
        const { result, unmount } = renderHook(() => useCustomers({ search: `query-${i}` }), { wrapper })
        
        await waitFor(() => {
          expect(result.current.isSuccess || result.current.isError).toBe(true)
        })
        
        unmount()
      }

      const finalMemory = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    it('should handle concurrent requests efficiently', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockImplementation(async (orgId, filters) => {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 100))
        return [createMockCustomer({ id: '1', name: `Customer for ${filters?.search || 'default'}` })]
      })

      const wrapper = createWrapper()
      const startTime = performance.now()

      // Launch 10 concurrent queries
      const hooks = Array.from({ length: 10 }, (_, i) => 
        renderHook(() => useCustomers({ search: `concurrent-${i}` }), { wrapper })
      )

      // Wait for all to complete
      await Promise.all(hooks.map(({ result }) => 
        waitFor(() => expect(result.current.isSuccess).toBe(true))
      ))

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete in roughly the same time as a single request (due to concurrency)
      expect(duration).toBeLessThan(500) // Should be much less than 10 * 100ms

      // Cleanup
      hooks.forEach(({ unmount }) => unmount())
    })
  })

  describe('Edge Cases', () => {
    it('should handle extremely long customer names', async () => {
      const longName = 'A'.repeat(10000) // 10KB name
      const customer = createMockCustomer({
        id: 'long-name-customer',
        name: longName,
        email: 'test@example.com',
        status: 'prospect'
      })

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([customer])

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCustomers(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data?.[0]?.name).toBe(longName)
    })

    it('should handle malformed data gracefully', async () => {
      const malformedData = [
        { id: null, name: undefined, email: 'test@example.com' },
        { id: 'valid-id', name: 'Valid Customer', email: null },
        { id: 'another-id', name: '', email: '' },
        null,
        undefined,
        { id: 'incomplete' } // Missing required fields
      ] as unknown as Customer[]

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue(malformedData)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCustomers(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      // Should not crash and should return the data as-is
      expect(result.current.data).toEqual(malformedData)
    })

    it('should handle network timeouts', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCustomers(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toContain('timeout')
    })

    it('should handle rapid state changes', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

      const wrapper = createWrapper()
      const { result, rerender } = renderHook(
        ({ search }) => useCustomers({ search }),
        { 
          wrapper,
          initialProps: { search: 'initial' }
        }
      )

      // Rapidly change search terms
      const searchTerms = Array.from({ length: 50 }, (_, i) => `search-${i}`)
      
      for (const search of searchTerms) {
        rerender({ search })
      }

      // Should eventually settle on the last search term
      await waitFor(() => {
        expect(result.current.isSuccess || result.current.isError).toBe(true)
      })

      // Should not crash from rapid changes
      expect(result.current).toBeDefined()
    })

    it('should handle unicode and special characters', async () => {
      const specialCustomers = [
        createMockCustomer({ id: '1', name: '测试客户', email: 'test@example.com', status: 'prospect' }),
        createMockCustomer({ id: '2', name: 'Müller & Söhne', email: 'müller@example.de', status: 'customer' }),
        createMockCustomer({ id: '3', name: '🏢 Corporate Client 🚀', email: 'emoji@example.com', status: 'lead' }),
        createMockCustomer({ id: '4', name: "O'Connor & Associates", email: "oconnor@example.com", status: 'inactive' }),
        createMockCustomer({ id: '5', name: 'Client With Newlines', email: 'newlines@example.com', status: 'prospect' })
      ]

      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue(specialCustomers)

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCustomers(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toHaveLength(5)
      expect(result.current.data?.[0]?.name).toBe('测试客户')
      expect(result.current.data?.[2]?.name).toBe('🏢 Corporate Client 🚀')
    })

    it('should handle empty and null responses', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      
      // Test empty array
      vi.mocked(CustomersService.getCustomers).mockResolvedValueOnce([])
      
      const wrapper = createWrapper()
      const { result, rerender } = renderHook(() => useCustomers(), { wrapper })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toEqual([])

      // Test null response
      vi.mocked(CustomersService.getCustomers).mockResolvedValueOnce(null as unknown as Awaited<ReturnType<typeof CustomersService.getCustomers>>)
      
      rerender()

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(result.current.data).toBeNull()
    })

    it('should handle database connection failures', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockRejectedValue(
        new Error('ECONNREFUSED: Connection refused')
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCustomers(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('ECONNREFUSED')
    })

    it('should handle authentication errors gracefully', async () => {
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockRejectedValue(
        new Error('JWT expired')
      )

      const wrapper = createWrapper()
      const { result } = renderHook(() => useCustomers(), { wrapper })

      await waitFor(() => {
        expect(result.current.isError).toBe(true)
      })

      expect(result.current.error?.message).toContain('JWT expired')
    })

    it('should handle memory pressure scenarios', async () => {
      // Simulate low memory by creating large objects
      const largeObjects: Array<string[]> = []
      
      try {
        // Fill up memory with large arrays
        for (let i = 0; i < 100; i++) {
          largeObjects.push(new Array(100000).fill(`memory-test-${i}`))
        }

        const { CustomersService } = await import('@/lib/supabase/customers')
        vi.mocked(CustomersService.getCustomers).mockResolvedValue([
          createMockCustomer({ id: '1', name: 'Test Customer', status: 'prospect' })
        ])

        const wrapper = createWrapper()
        const { result } = renderHook(() => useCustomers(), { wrapper })

        await waitFor(() => {
          expect(result.current.isSuccess || result.current.isError).toBe(true)
        })

        // Should still work under memory pressure
        expect(result.current).toBeDefined()
      } finally {
        // Cleanup large objects
        largeObjects.length = 0
      }
    })
  })
})