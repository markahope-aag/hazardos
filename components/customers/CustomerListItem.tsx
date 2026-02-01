import { useState } from 'react'
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
import CustomerStatusBadge from './CustomerStatusBadge'
import { useUpdateCustomerStatus } from '@/lib/hooks/use-customers'
import { CUSTOMER_STATUS_OPTIONS } from '@/lib/validations/customer'
import type { Customer, CustomerStatus } from '@/types/database'

interface CustomerListItemProps {
  customer: Customer
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export default function CustomerListItem({ customer, onEdit, onDelete }: CustomerListItemProps) {
  const router = useRouter()
  const updateStatusMutation = useUpdateCustomerStatus()
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)

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

  const handleViewCustomer = () => {
    router.push(`/customers/${customer.id}`)
  }

  const handleCreateSurvey = () => {
    router.push(`/site-surveys/new?customer_id=${customer.id}`)
  }

  const getSourceLabel = (source: string | null) => {
    if (!source) return '-'
    return source.charAt(0).toUpperCase() + source.slice(1)
  }

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
          {getSourceLabel(customer.source)}
        </span>
      </TableCell>

      {/* Created Date */}
      <TableCell>
        <span className="text-sm text-gray-500">
          {format(new Date(customer.created_at), 'MMM d, yyyy')}
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
            <DropdownMenuItem onClick={() => onEdit(customer)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Customer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCreateSurvey}>
              <Plus className="mr-2 h-4 w-4" />
              Create Survey
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(customer)}
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