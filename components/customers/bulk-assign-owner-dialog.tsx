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
import { useBulkAssignCustomerOwner } from '@/lib/hooks/use-customers'
import { useOrgMembers } from '@/lib/hooks/use-org-members'

interface BulkAssignOwnerDialogProps {
  customerIds: string[]
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

const UNASSIGNED = '__unassigned__'

export default function BulkAssignOwnerDialog({ customerIds, open, onClose, onSuccess }: BulkAssignOwnerDialogProps) {
  const [ownerId, setOwnerId] = useState<string>(UNASSIGNED)
  const { data: members = [], isLoading: isLoadingMembers } = useOrgMembers()
  const bulkAssignMutation = useBulkAssignCustomerOwner()

  const handleSubmit = async () => {
    try {
      await bulkAssignMutation.mutateAsync({
        ids: customerIds,
        accountOwnerId: ownerId === UNASSIGNED ? null : ownerId,
      })
      onSuccess()
    } catch {
      // Error handling is done in the mutation hook
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign owner for {customerIds.length} contact{customerIds.length !== 1 ? 's' : ''}</DialogTitle>
          <DialogDescription>
            This sets the account owner on all selected contacts.
          </DialogDescription>
        </DialogHeader>

        <Select value={ownerId} onValueChange={setOwnerId} disabled={isLoadingMembers}>
          <SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {[member.first_name, member.last_name].filter(Boolean).join(' ') || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={bulkAssignMutation.isPending}>
            {bulkAssignMutation.isPending ? 'Assigning...' : 'Assign Owner'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
