import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useBulkDeleteCustomers } from '@/lib/hooks/use-customers'

interface BulkDeleteDialogProps {
  customerIds: string[]
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function BulkDeleteDialog({ customerIds, open, onClose, onSuccess }: BulkDeleteDialogProps) {
  const bulkDeleteMutation = useBulkDeleteCustomers()

  const handleDelete = async () => {
    try {
      await bulkDeleteMutation.mutateAsync(customerIds)
      onSuccess()
    } catch {
      // Error handling is done in the mutation hook
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {customerIds.length} contact{customerIds.length !== 1 ? 's' : ''}</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {customerIds.length} selected contact{customerIds.length !== 1 ? 's' : ''}?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={bulkDeleteMutation.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete Contacts'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
