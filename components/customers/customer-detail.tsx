import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowLeft, Edit, ChevronDown, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import CustomerInfoCard from './customer-info-card'
import CustomerSurveysList from './customer-surveys-list'
import CustomerActivityFeed from './customer-activity-feed'
import CustomerStatusBadge from './customer-status-badge'
import EditCustomerModal from './edit-customer-modal'
import DeleteCustomerDialog from './delete-customer-dialog'
import { useUpdateCustomerStatus } from '@/lib/hooks/use-customers'
import { CUSTOMER_STATUS_OPTIONS } from '@/lib/validations/customer'
import type { Customer, CustomerStatus } from '@/types/database'

interface CustomerDetailProps {
  customer: Customer
}

export default function CustomerDetail({ customer }: CustomerDetailProps) {
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const updateStatusMutation = useUpdateCustomerStatus()

  const handleBack = () => {
    router.push('/customers')
  }

  const handleStatusChange = async (newStatus: CustomerStatus) => {
    if (newStatus === customer.status) return
    
    setIsUpdatingStatus(true)
    try {
      await updateStatusMutation.mutateAsync({
        id: customer.id,
        status: newStatus
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  const handleDeleteSuccess = () => {
    setShowDeleteDialog(false)
    router.push('/customers')
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setShowEditModal(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={isUpdatingStatus}>
                Change Status
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CUSTOMER_STATUS_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => handleStatusChange(option.value)}
                  disabled={option.value === customer.status}
                >
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Customer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Customer Header */}
      <div className="bg-white border rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
            {customer.company_name && (
              <p className="text-lg text-gray-600 mt-1">{customer.company_name}</p>
            )}
          </div>
          <div className="text-right">
            <CustomerStatusBadge status={customer.status} className="mb-2" />
            <div className="text-sm text-gray-500">
              Source: {customer.source ? customer.source.charAt(0).toUpperCase() + customer.source.slice(1) : 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <CustomerInfoCard customer={customer} />

      {/* Notes */}
      {customer.notes && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
          <div className="prose prose-sm max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{customer.notes}</p>
          </div>
        </div>
      )}

      {/* Site Surveys */}
      <CustomerSurveysList customerId={customer.id} />

      {/* Activity Feed */}
      <CustomerActivityFeed customer={customer} />

      {/* Modals */}
      <EditCustomerModal
        customer={customer}
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
      />

      <DeleteCustomerDialog
        customer={customer}
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}