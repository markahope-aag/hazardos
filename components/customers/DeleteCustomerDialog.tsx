import { useState, useEffect } from 'react'
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
import { useDeleteCustomer } from '@/lib/hooks/use-customers'
import { createClient } from '@/lib/supabase/client'
import type { Customer } from '@/types/database'

interface DeleteCustomerDialogProps {
  customer: Customer
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function DeleteCustomerDialog({ 
  customer, 
  open, 
  onClose, 
  onSuccess 
}: DeleteCustomerDialogProps) {
  const [surveysCount, setSurveysCount] = useState<number | null>(null)
  const [isLoadingSurveys, setIsLoadingSurveys] = useState(false)
  const deleteCustomerMutation = useDeleteCustomer()

  // Check for linked surveys when dialog opens
  useEffect(() => {
    if (open && customer) {
      setIsLoadingSurveys(true)
      const fetchSurveys = async () => {
        try {
          const supabase = createClient()
          const { count, error } = await supabase
            .from('site_surveys')
            .select('id', { count: 'exact' })
            .eq('customer_id', customer.id)
          
          if (!error) {
            setSurveysCount(count || 0)
          }
        } catch {
          setSurveysCount(0)
        } finally {
          setIsLoadingSurveys(false)
        }
      }
      
      fetchSurveys()
    }
  }, [open, customer])

  const handleDelete = async () => {
    try {
      await deleteCustomerMutation.mutateAsync(customer.id)
      onSuccess()
    } catch {
      // Error handling is done in the mutation hook
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{customer.name}</strong>
              {customer.company_name && ` from ${customer.company_name}`}? 
              This action cannot be undone.
            </p>
            
            {isLoadingSurveys ? (
              <p className="text-sm text-gray-500">Checking for linked surveys...</p>
            ) : surveysCount !== null && surveysCount > 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This customer has {surveysCount} linked site survey{surveysCount !== 1 ? 's' : ''}. 
                  Deleting this customer will unlink {surveysCount === 1 ? 'it' : 'them'}, but the survey{surveysCount !== 1 ? 's' : ''} will not be deleted.
                </p>
              </div>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteCustomerMutation.isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {deleteCustomerMutation.isPending ? 'Deleting...' : 'Delete Customer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}