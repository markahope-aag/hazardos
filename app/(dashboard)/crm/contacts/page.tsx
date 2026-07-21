'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Plus, Upload } from 'lucide-react'
import CustomerList from '@/components/customers/customer-list'
import CreateCustomerModal from '@/components/customers/create-customer-modal'
import EditCustomerModal from '@/components/customers/edit-customer-modal'
import DeleteCustomerDialog from '@/components/customers/delete-customer-dialog'
import ImportContactsDialog from '@/components/customers/import-contacts-dialog'
import type { Customer } from '@/types/database'

export default function ContactsPage() {
  return (
    <Suspense fallback={null}>
      <ContactsPageContent />
    </Suspense>
  )
}

function ContactsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null)
  // Captured into state (not read live) so stripping the URL below doesn't
  // clear the prefill before the modal's form mounts.
  const [prefillCompany, setPrefillCompany] = useState<string | undefined>(undefined)

  // Deep link from a company page: ?newContact=true[&company=Name] opens the
  // create modal, prefilling the company as a commercial contact (CO12).
  useEffect(() => {
    if (searchParams.get('newContact') === 'true') {
      setPrefillCompany(searchParams.get('company') || undefined)
      setShowCreateModal(true)
      // Strip the params so a refresh / back doesn't re-open the modal.
      router.replace('/crm/contacts')
    }
  }, [searchParams, router])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="text-gray-600 mt-1">
            Manage your leads, prospects, and customers
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Contact
          </Button>
        </div>
      </div>

      <CustomerList
        onEditCustomer={(customer) => setEditingCustomer(customer)}
        onDeleteCustomer={(customer) => setDeletingCustomer(customer)}
      />

      <CreateCustomerModal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setPrefillCompany(undefined) }}
        initialCompanyName={prefillCompany}
      />

      <ImportContactsDialog
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
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
