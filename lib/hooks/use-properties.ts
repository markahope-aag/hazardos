import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PropertiesService } from '@/lib/supabase/properties'
import { useMultiTenantAuth } from './use-multi-tenant-auth'
import { useToast } from '@/components/ui/use-toast'
import type {
  PropertyInsert,
  PropertyUpdate,
  PropertyContactInsert,
  PropertyContactUpdate,
} from '@/types/database'

export type PropertiesSortKey = 'recent' | 'address' | 'city' | 'jobs'
export type PropertiesSortDir = 'asc' | 'desc'

interface UsePropertiesOptions {
  search?: string
  page?: number
  pageSize?: number
  sortBy?: PropertiesSortKey
  sortDir?: PropertiesSortDir
}

export function useProperties(options: UsePropertiesOptions = {}) {
  const { organization } = useMultiTenantAuth()
  const { search, page = 1, pageSize = 25, sortBy, sortDir } = options

  return useQuery({
    queryKey: ['properties', organization?.id, search, page, pageSize, sortBy, sortDir],
    queryFn: async () => {
      if (!organization?.id) throw new Error('No organization found')
      const offset = (page - 1) * pageSize
      return PropertiesService.listProperties(organization.id, {
        search: search || undefined,
        limit: pageSize,
        offset,
        sortBy,
        sortDir,
      })
    },
    enabled: !!organization?.id,
    staleTime: 30 * 1000,
  })
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: ['property', id],
    queryFn: () => PropertiesService.getProperty(id),
    enabled: !!id,
    staleTime: 60 * 1000,
  })
}

export function usePropertyHistory(id: string) {
  return useQuery({
    queryKey: ['property-history', id],
    queryFn: () => PropertiesService.getPropertyHistory(id),
    enabled: !!id,
    staleTime: 30 * 1000,
  })
}

export function useCreateProperty() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()

  return useMutation({
    mutationFn: async (input: Omit<PropertyInsert, 'organization_id'>) => {
      if (!organization?.id) throw new Error('No organization found')
      return PropertiesService.createProperty({ ...input, organization_id: organization.id })
    },
    onSuccess: (property) => {
      queryClient.invalidateQueries({ queryKey: ['properties', organization?.id] })
      toast({ title: 'Property created', description: property.address_line1 })
    },
    onError: (error) => {
      toast({
        title: 'Error creating property',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateProperty() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: PropertyUpdate }) =>
      PropertiesService.updateProperty(id, updates),
    onSuccess: (property) => {
      queryClient.setQueryData(['property', property.id], property)
      queryClient.invalidateQueries({ queryKey: ['properties', organization?.id] })
      queryClient.invalidateQueries({ queryKey: ['property-history', property.id] })
      toast({ title: 'Property updated' })
    },
    onError: (error) => {
      toast({
        title: 'Error updating property',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteProperty() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()

  return useMutation({
    mutationFn: (id: string) => PropertiesService.deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties', organization?.id] })
      toast({ title: 'Property deleted' })
    },
    onError: (error) => {
      toast({
        title: 'Error deleting property',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

export function useAddPropertyContact() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()

  return useMutation({
    mutationFn: async (input: Omit<PropertyContactInsert, 'organization_id'>) => {
      if (!organization?.id) throw new Error('No organization found')
      return PropertiesService.addPropertyContact({ ...input, organization_id: organization.id })
    },
    onSuccess: (pc) => {
      queryClient.invalidateQueries({ queryKey: ['property-history', pc.property_id] })
      toast({ title: 'Contact added to property' })
    },
    onError: (error) => {
      toast({
        title: 'Error adding contact',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdatePropertyContact() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: PropertyContactUpdate }) =>
      PropertiesService.updatePropertyContact(id, updates),
    onSuccess: (pc) => {
      queryClient.invalidateQueries({ queryKey: ['property-history', pc.property_id] })
      toast({ title: 'Property contact updated' })
    },
    onError: (error) => {
      toast({
        title: 'Error updating contact',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

export function useMarkContactMovedOut() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({
      id,
      movedOutDate,
      notes,
    }: {
      id: string
      movedOutDate: string
      notes?: string
    }) => PropertiesService.markContactMovedOut(id, movedOutDate, notes),
    onSuccess: (pc) => {
      queryClient.invalidateQueries({ queryKey: ['property-history', pc.property_id] })
      toast({ title: 'Marked as moved out' })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}

export function useRemovePropertyContact() {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()

  return useMutation({
    mutationFn: (id: string) => PropertiesService.removePropertyContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-history'] })
      queryClient.invalidateQueries({ queryKey: ['properties', organization?.id] })
      toast({ title: 'Contact removed from property' })
    },
    onError: (error) => {
      toast({
        title: 'Error removing contact',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    },
  })
}
