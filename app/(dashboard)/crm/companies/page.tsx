'use client'

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
        <p className="text-xs text-muted-foreground max-w-[200px] text-right">
          Companies are created when adding a commercial contact
        </p>
      </div>

      <CompanyList />
    </div>
  )
}
