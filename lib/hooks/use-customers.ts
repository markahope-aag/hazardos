import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CustomersService } from '@/lib/supabase/customers'
import { useMultiTenantAuth } from './use-multi-tenant-auth'
import { useToast } from '@/components/ui/use-toast'
import type { CustomerInsert, CustomerUpdate, CustomerStatus, CustomerSource } from '@/types/database'

interface UseCustomersOptions {
  search?: string
  status?: CustomerStatus | 'all'
  source?: CustomerSource | 'all'
  page?: number
  pageSize?: number
}

// Hook to fetch customers with search/filter/pagination
export function useCustomers(options: UseCustomersOptions = {}) {
  const { organization } = useMultiTenantAuth()
  
  return useQuery({
    queryKey: ['customers', organization?.id, options],
    queryFn: async () => {
      if (!organization?.id) {
        throw new Error('No organization found')
      }

      const { search, status, source: _source, page = 1, pageSize = 25 } = options
      const offset = (page - 1) * pageSize

      return CustomersService.getCustomers(organization.id, {
        search: search || undefined,
        status: status === 'all' ? undefined : status,
        limit: pageSize,
        offset
      })
    },
    enabled: !!organization?.id,
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Hook to fetch a single customer
export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => CustomersService.getCustomer(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  })
}

// Hook to get customer statistics
export function useCustomerStats() {
  const { organization } = useMultiTenantAuth()
  
  return useQuery({
    queryKey: ['customer-stats', organization?.id],
    queryFn: async () => {
      if (!organization?.id) {
        throw new Error('No organization found')
      }
      return CustomersService.getCustomerStats(organization.id)
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Mutation hook to create a customer
export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()

  return useMutation({
    mutationFn: (customerData: Omit<CustomerInsert, 'organization_id' | 'created_by'>) => {
      if (!organization?.id) {
        throw new Error('No organization found')
      }
      
      return CustomersService.createCustomer({
        ...customerData,
        organization_id: organization.id
      })
    },
    onSuccess: (newCustomer) => {
      // Invalidate and refetch customers list
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] })
      
      toast({
        title: 'Customer created',
        description: `${newCustomer.name} has been added successfully.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error creating customer',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

// Mutation hook to update a customer
export function useUpdateCustomer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CustomerUpdate }) =>
      CustomersService.updateCustomer(id, updates),
    onSuccess: (updatedCustomer) => {
      // Update the specific customer in cache
      queryClient.setQueryData(['customer', updatedCustomer.id], updatedCustomer)
      
      // Invalidate customers list to refresh
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] })
      
      toast({
        title: 'Customer updated',
        description: `${updatedCustomer.name} has been updated successfully.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error updating customer',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

// Mutation hook to delete a customer
export function useDeleteCustomer() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => CustomersService.deleteCustomer(id),
    onSuccess: () => {
      // Invalidate customers list and stats
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] })
      
      toast({
        title: 'Customer deleted',
        description: 'Customer has been deleted successfully.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error deleting customer',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

// Hook to update customer status quickly
export function useUpdateCustomerStatus() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CustomerStatus }) =>
      CustomersService.updateCustomerStatus(id, status),
    onSuccess: (updatedCustomer) => {
      // Update the specific customer in cache
      queryClient.setQueryData(['customer', updatedCustomer.id], updatedCustomer)
      
      // Invalidate customers list to refresh
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer-stats'] })
      
      toast({
        title: 'Status updated',
        description: `Customer status changed to ${updatedCustomer.status}.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error updating status',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}