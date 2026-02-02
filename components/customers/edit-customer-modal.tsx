import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import CustomerForm from './customer-form'
import DeleteCustomerDialog from './delete-customer-dialog'
import { useUpdateCustomer } from '@/lib/hooks/use-customers'
import type { CustomerFormData } from '@/lib/validations/customer'
import type { Customer } from '@/types/database'

interface EditCustomerModalProps {
  customer: Customer
  open: boolean
  onClose: () => void
}

export default function EditCustomerModal({ customer, open, onClose }: EditCustomerModalProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const updateCustomerMutation = useUpdateCustomer()

  const handleSubmit = async (data: CustomerFormData) => {
    await updateCustomerMutation.mutateAsync({
      id: customer.id,
      updates: data
    })
    onClose()
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteSuccess = () => {
    setShowDeleteDialog(false)
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between">
            <DialogTitle>Edit Customer</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogHeader>
          
          <CustomerForm
            customer={customer}
            onSubmit={handleSubmit}
            onCancel={onClose}
            isSubmitting={updateCustomerMutation.isPending}
            submitLabel="Update Customer"
          />
        </DialogContent>
      </Dialog>

      <DeleteCustomerDialog
        customer={customer}
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onSuccess={handleDeleteSuccess}
      />
    </>
  )
}