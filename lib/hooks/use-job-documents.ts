import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { JobDocumentsService } from '@/lib/supabase/job-documents'
import { useMultiTenantAuth } from './use-multi-tenant-auth'
import { useToast } from '@/components/ui/use-toast'
import type { JobDocumentCategory, JobDocumentUpdate } from '@/types/database'

export function useJobDocuments(jobId: string) {
  return useQuery({
    queryKey: ['job-documents', jobId],
    queryFn: () => JobDocumentsService.list(jobId),
    enabled: !!jobId,
    staleTime: 30 * 1000,
  })
}

export function useUploadJobDocument(jobId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()

  return useMutation({
    mutationFn: async (input: {
      file: File
      category: JobDocumentCategory
      notes?: string
    }) => {
      if (!organization?.id) throw new Error('No organization found')
      return JobDocumentsService.upload({
        organizationId: organization.id,
        jobId,
        file: input.file,
        category: input.category,
        notes: input.notes,
      })
    },
    onSuccess: (doc) => {
      queryClient.invalidateQueries({ queryKey: ['job-documents', jobId] })
      toast({ title: 'Document uploaded', description: doc.file_name })
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

export function useUpdateJobDocument(jobId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: JobDocumentUpdate }) =>
      JobDocumentsService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-documents', jobId] })
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

export function useDeleteJobDocument(jobId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => JobDocumentsService.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-documents', jobId] })
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
