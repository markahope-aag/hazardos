'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import CustomerList from '@/components/customers/customer-list'
import CreateCustomerModal from '@/components/customers/create-customer-modal'
import EditCustomerModal from '@/components/customers/edit-customer-modal'
import DeleteCustomerDialog from '@/components/customers/delete-customer-dialog'
import type { Customer } from '@/types/database'

export default function ContactsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">
            Manage your leads, prospects, and customers
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Contact
        </Button>
      </div>

      <CustomerList
        onEditCustomer={(customer) => setEditingCustomer(customer)}
        onDeleteCustomer={(customer) => setDeletingCustomer(customer)}
      />

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
          onSuccess={() => setDeletingCustomer(null)}
        />
      )}
    </div>
  )
}
