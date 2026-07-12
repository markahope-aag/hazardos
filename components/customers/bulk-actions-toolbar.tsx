import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Tag, UserCog, Trash2, X } from 'lucide-react'
import BulkDeleteDialog from './bulk-delete-dialog'
import BulkStatusDialog from './bulk-status-dialog'
import BulkAssignOwnerDialog from './bulk-assign-owner-dialog'
import { downloadCustomersCsv } from '@/lib/utils/customer-csv-export'
import type { Customer } from '@/types/database'

interface BulkActionsToolbarProps {
  selectedCustomers: Customer[]
  onClearSelection: () => void
}

type ActiveDialog = 'delete' | 'status' | 'owner' | null

export default function BulkActionsToolbar({ selectedCustomers, onClearSelection }: BulkActionsToolbarProps) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null)
  const selectedIds = selectedCustomers.map((c) => c.id)

  const closeDialog = () => setActiveDialog(null)
  const handleDialogSuccess = () => {
    closeDialog()
    onClearSelection()
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/50 px-4 py-2">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">
          {selectedCustomers.length} selected
        </span>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="mr-1 h-3.5 w-3.5" /> Clear
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setActiveDialog('owner')}>
          <UserCog className="mr-1.5 h-3.5 w-3.5" /> Assign Owner
        </Button>
        <Button variant="outline" size="sm" onClick={() => setActiveDialog('status')}>
          <Tag className="mr-1.5 h-3.5 w-3.5" /> Change Status
        </Button>
        <Button variant="outline" size="sm" onClick={() => downloadCustomersCsv(selectedCustomers)}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700"
          onClick={() => setActiveDialog('delete')}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete
        </Button>
      </div>

      <BulkDeleteDialog
        customerIds={selectedIds}
        open={activeDialog === 'delete'}
        onClose={closeDialog}
        onSuccess={handleDialogSuccess}
      />
      <BulkStatusDialog
        customerIds={selectedIds}
        open={activeDialog === 'status'}
        onClose={closeDialog}
        onSuccess={handleDialogSuccess}
      />
      <BulkAssignOwnerDialog
        customerIds={selectedIds}
        open={activeDialog === 'owner'}
        onClose={closeDialog}
        onSuccess={handleDialogSuccess}
      />
    </div>
  )
}
