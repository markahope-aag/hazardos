import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { WorkOrderDocumentsService } from '@/lib/supabase/work-order-documents'
import { useMultiTenantAuth } from './use-multi-tenant-auth'
import { useToast } from '@/components/ui/use-toast'
import type {
  WorkOrderDocumentCategory,
  WorkOrderDocumentUpdate,
} from '@/types/work-orders'

export function useWorkOrderDocuments(workOrderId: string) {
  return useQuery({
    queryKey: ['work-order-documents', workOrderId],
    queryFn: () => WorkOrderDocumentsService.list(workOrderId),
    enabled: !!workOrderId,
    staleTime: 30 * 1000,
  })
}

export function useUploadWorkOrderDocument(workOrderId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()

  return useMutation({
    mutationFn: async (input: {
      file: File
      category: WorkOrderDocumentCategory
      notes?: string
    }) => {
      if (!organization?.id) throw new Error('No organization found')
      return WorkOrderDocumentsService.upload({
        organizationId: organization.id,
        workOrderId,
        file: input.file,
        category: input.category,
        notes: input.notes,
      })
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['work-order-documents', workOrderId] })
      toast({ title: 'Attached', description: doc.file_name })
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    },
  })
}

export function useUpdateWorkOrderDocument(workOrderId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: WorkOrderDocumentUpdate }) =>
      WorkOrderDocumentsService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-documents', workOrderId] })
      toast({ title: 'Document updated' })
    },
    onError: (error) => {
      toast({
        title: 'Update failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    },
  })
}

export function useDeleteWorkOrderDocument(workOrderId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => WorkOrderDocumentsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-order-documents', workOrderId] })
      toast({ title: 'Document removed' })
    },
    onError: (error) => {
      toast({
        title: 'Remove failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      })
    },
  })
}
