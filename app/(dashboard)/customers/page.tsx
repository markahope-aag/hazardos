'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import CustomerList from '@/components/customers/CustomerList'
import CreateCustomerModal from '@/components/customers/CreateCustomerModal'
import EditCustomerModal from '@/components/customers/EditCustomerModal'
import DeleteCustomerDialog from '@/components/customers/DeleteCustomerDialog'
import type { Customer } from '@/types/database'

export default function CustomersPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer)
  }

  const handleDeleteCustomer = (customer: Customer) => {
    setDeletingCustomer(customer)
  }

  const handleDeleteSuccess = () => {
    setDeletingCustomer(null)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600 mt-1">
            Manage your leads, prospects, and customers
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Customer List */}
      <CustomerList
        onEditCustomer={handleEditCustomer}
        onDeleteCustomer={handleDeleteCustomer}
      />

      {/* Modals */}
      <CreateCustomerModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          open={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
        />
      )}

      {deletingCustomer && (
        <DeleteCustomerDialog
          customer={deletingCustomer}
          open={!!deletingCustomer}
          onClose={() => setDeletingCustomer(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  )
}