import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import CustomerForm from './customer-form'
import { useCreateCustomer } from '@/lib/hooks/use-customers'
import type { CustomerFormData } from '@/lib/validations/customer'

interface CreateCustomerModalProps {
  open: boolean
  onClose: () => void
}

export default function CreateCustomerModal({ open, onClose }: CreateCustomerModalProps) {
  const createCustomerMutation = useCreateCustomer()

  const handleSubmit = async (data: CustomerFormData) => {
    const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ')
    await createCustomerMutation.mutateAsync({ ...data, name })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Contact</DialogTitle>
        </DialogHeader>
        
        <CustomerForm
          onSubmit={handleSubmit}
          onCancel={onClose}
          isSubmitting={createCustomerMutation.isPending}
          submitLabel="Create Contact"
        />
      </DialogContent>
    </Dialog>
  )
}