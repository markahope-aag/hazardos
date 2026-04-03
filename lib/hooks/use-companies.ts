import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CompaniesService } from '@/lib/supabase/companies'
import { useMultiTenantAuth } from './use-multi-tenant-auth'
import { useToast } from '@/components/ui/use-toast'
import type { CompanyInsert, CompanyUpdate, CompanyStatus } from '@/types/database'

interface UseCompaniesOptions {
  search?: string
  status?: CompanyStatus | 'all'
  page?: number
  pageSize?: number
}

export function useCompanies(options: UseCompaniesOptions = {}) {
  const { organization } = useMultiTenantAuth()
  const { search, status, page = 1, pageSize = 25 } = options

  return useQuery({
    queryKey: ['companies', organization?.id, search, status, page, pageSize],
    queryFn: async () => {
      if (!organization?.id) throw new Error('No organization found')
      const offset = (page - 1) * pageSize
      return CompaniesService.getCompanies(organization.id, {
        search: search || undefined,
        status: status === 'all' ? undefined : status,
        limit: pageSize,
        offset,
      })
    },
    enabled: !!organization?.id,
    staleTime: 30 * 1000,
  })
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: () => CompaniesService.getCompany(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

export function useCompanyStats() {
  const { organization } = useMultiTenantAuth()

  return useQuery({
    queryKey: ['company-stats', organization?.id],
    queryFn: async () => {
      if (!organization?.id) throw new Error('No organization found')
      return CompaniesService.getCompanyStats(organization.id)
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateCompany() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()

  return useMutation({
    mutationFn: (companyData: Omit<CompanyInsert, 'organization_id' | 'created_by'>) => {
      if (!organization?.id) throw new Error('No organization found')
      return CompaniesService.createCompany({
        ...companyData,
        organization_id: organization.id,
      })
    },
    onSuccess: (newCompany) => {
      queryClient.invalidateQueries({ queryKey: ['companies', organization?.id] })
      queryClient.invalidateQueries({ queryKey: ['company-stats', organization?.id] })
      toast({
        title: 'Company created',
        description: `${newCompany.name} has been added successfully.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error creating company',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: CompanyUpdate }) =>
      CompaniesService.updateCompany(id, updates),
    onSuccess: (updatedCompany) => {
      queryClient.setQueryData(['company', updatedCompany.id], updatedCompany)
      queryClient.invalidateQueries({ queryKey: ['companies', organization?.id] })
      queryClient.invalidateQueries({ queryKey: ['company-stats', organization?.id] })
      toast({
        title: 'Company updated',
        description: `${updatedCompany.name} has been updated successfully.`,
      })
    },
    onError: (error) => {
      toast({
        title: 'Error updating company',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()

  return useMutation({
    mutationFn: (id: string) => CompaniesService.deleteCompany(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', organization?.id] })
      queryClient.invalidateQueries({ queryKey: ['company-stats', organization?.id] })
      toast({
        title: 'Company deleted',
        description: 'Company has been deleted successfully.',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error deleting company',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

export function useSearchCompanies(searchTerm: string) {
  const { organization } = useMultiTenantAuth()

  return useQuery({
    queryKey: ['companies-search', organization?.id, searchTerm],
    queryFn: async () => {
      if (!organization?.id) throw new Error('No organization found')
      return CompaniesService.searchCompanies(organization.id, searchTerm)
    },
    enabled: !!organization?.id && searchTerm.length >= 2,
    staleTime: 10 * 1000,
  })
}
