import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import CustomerForm from './customer-form'
import { useCreateCustomer } from '@/lib/hooks/use-customers'
import type { CustomerFormData } from '@/lib/validations/customer-form'
import type { Customer } from '@/types/database'

interface CreateCustomerModalProps {
  open: boolean
  onClose: () => void
  /** Prefill a new contact as commercial for this company (deep link from a company page). */
  initialCompanyName?: string
  /** Called with the newly created contact once the insert succeeds, before onClose. */
  onCreated?: (customer: Customer) => void
}

export default function CreateCustomerModal({ open, onClose, initialCompanyName, onCreated }: CreateCustomerModalProps) {
  const createCustomerMutation = useCreateCustomer()

  const handleSubmit = async (data: CustomerFormData) => {
    const name = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ')
    const customer = await createCustomerMutation.mutateAsync({ ...data, name })
    onCreated?.(customer)
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
          initialCompanyName={initialCompanyName}
        />
      </DialogContent>
    </Dialog>
  )
}