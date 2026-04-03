'use client'

import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import CompanyList from '@/components/companies/company-list'

export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
          <p className="text-gray-600 mt-1">
            Manage your business accounts and organizations
          </p>
        </div>
        <Button disabled title="Coming soon">
          <Plus className="mr-2 h-4 w-4" />
          Add Company
        </Button>
      </div>

      <CompanyList />
    </div>
  )
}
