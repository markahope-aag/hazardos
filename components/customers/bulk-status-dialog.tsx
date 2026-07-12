import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useBulkUpdateCustomerStatus } from '@/lib/hooks/use-customers'
import type { CustomerStatus } from '@/types/database'

interface BulkStatusDialogProps {
  customerIds: string[]
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const STATUS_OPTIONS: { value: CustomerStatus; label: string }[] = [
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'customer', label: 'Customer' },
  { value: 'past_customer', label: 'Past Customer' },
  { value: 'inactive', label: 'Inactive' },
]

export default function BulkStatusDialog({ customerIds, open, onClose, onSuccess }: BulkStatusDialogProps) {
  const [status, setStatus] = useState<CustomerStatus>('prospect')
  const bulkStatusMutation = useBulkUpdateCustomerStatus()

  const handleSubmit = async () => {
    try {
      await bulkStatusMutation.mutateAsync({ ids: customerIds, status })
      onSuccess()
    } catch {
      // Error handling is done in the mutation hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change status for {customerIds.length} contact{customerIds.length !== 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            This updates the status on all selected contacts.
          </DialogDescription>
        </DialogHeader>

        <Select value={status} onValueChange={(v) => setStatus(v as CustomerStatus)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={bulkStatusMutation.isPending}>
            {bulkStatusMutation.isPending ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
