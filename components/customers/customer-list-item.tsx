import { useState, memo, useCallback, useMemo } from 'react'
import { format } from 'date-fns'
import { TableCell, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, Edit, Trash2, Plus, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import CustomerStatusBadge from './customer-status-badge'
import { useUpdateCustomerStatus } from '@/lib/hooks/use-customers'
import { CUSTOMER_STATUS_OPTIONS } from '@/lib/validations/customer'
import type { Customer, CustomerStatus } from '@/types/database'

interface CustomerListItemProps {
  customer: Customer
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

function CustomerListItem({ customer, onEdit, onDelete }: CustomerListItemProps) {
  const router = useRouter()
  const updateStatusMutation = useUpdateCustomerStatus()
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

  // Memoize expensive computations
  const formattedDate = useMemo(() => {
    return format(new Date(customer.created_at), 'MMM d, yyyy')
  }, [customer.created_at])

  const sourceLabel = useMemo(() => {
    if (!customer.source) return '-'
    return customer.source.charAt(0).toUpperCase() + customer.source.slice(1)
  }, [customer.source])

  // Memoize event handlers to prevent unnecessary re-renders of child components
  const handleStatusChange = useCallback(async (newStatus: CustomerStatus) => {
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
  }, [customer.id, customer.status, updateStatusMutation])

  const handleViewCustomer = useCallback(() => {
    router.push(`/customers/${customer.id}`)
  }, [router, customer.id])

  const handleCreateSurvey = useCallback(() => {
    router.push(`/site-surveys/new?customer_id=${customer.id}`)
  }, [router, customer.id])

  const handleEdit = useCallback(() => {
    onEdit(customer)
  }, [onEdit, customer])

  const handleDelete = useCallback(() => {
    onDelete(customer)
  }, [onDelete, customer])

  return (
    <TableRow className="hover:bg-gray-50">
      {/* Name & Company */}
      <TableCell>
        <div>
          <div className="font-medium text-gray-900">{customer.name}</div>
          {customer.company_name && (
            <div className="text-sm text-gray-500">{customer.company_name}</div>
          )}
        </div>
      </TableCell>

      {/* Contact */}
      <TableCell>
        <div className="space-y-1">
          {customer.email && (
            <div className="text-sm text-gray-900">{customer.email}</div>
          )}
          {customer.phone && (
            <div className="text-sm text-gray-500">{customer.phone}</div>
          )}
          {!customer.email && !customer.phone && (
            <div className="text-sm text-gray-400">No contact info</div>
          )}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isUpdatingStatus}
              className="h-auto p-1 hover:bg-transparent"
            >
              <CustomerStatusBadge status={customer.status} />
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>

      {/* Source */}
      <TableCell>
        <span className="text-sm text-gray-600">
          {sourceLabel}
        </span>
      </TableCell>

      {/* Created Date */}
      <TableCell>
        <span className="text-sm text-gray-500">
          {formattedDate}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleViewCustomer}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Customer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateSurvey}>
              <Plus className="mr-2 h-4 w-4" />
              Create Survey
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleDelete}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Customer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

// Custom comparison function to prevent unnecessary re-renders
const arePropsEqual = (prevProps: CustomerListItemProps, nextProps: CustomerListItemProps) => {
  // Compare customer object properties that affect rendering
  const prevCustomer = prevProps.customer
  const nextCustomer = nextProps.customer
  
  // Check if it's the same customer instance
  if (prevCustomer === nextCustomer) return true
  
  // Deep comparison of customer properties that affect the UI
  const customerPropsEqual = (
    prevCustomer.id === nextCustomer.id &&
    prevCustomer.name === nextCustomer.name &&
    prevCustomer.company_name === nextCustomer.company_name &&
    prevCustomer.email === nextCustomer.email &&
    prevCustomer.phone === nextCustomer.phone &&
    prevCustomer.status === nextCustomer.status &&
    prevCustomer.source === nextCustomer.source &&
    prevCustomer.created_at === nextCustomer.created_at
  )
  
  // Check if callback functions are the same (they should be memoized in parent)
  const callbacksEqual = (
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onDelete === nextProps.onDelete
  )
  
  return customerPropsEqual && callbacksEqual
}

export default memo(CustomerListItem, arePropsEqual)