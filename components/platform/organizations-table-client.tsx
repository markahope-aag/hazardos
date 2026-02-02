'use client'

import { useState, useCallback } from 'react'
import { OrganizationsTable } from './organizations-table'
import type { OrganizationSummary } from '@/types/platform-admin'

interface OrganizationsTableClientProps {
  initialData: OrganizationSummary[]
  initialTotal: number
  initialTotalPages: number
}

export function OrganizationsTableClient({
  initialData,
  initialTotal,
  initialTotalPages,
}: OrganizationsTableClientProps) {
  const [organizations, setOrganizations] = useState(initialData)
  const [, setTotal] = useState(initialTotal)
  const [totalPages, setTotalPages] = useState(initialTotalPages)
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const fetchOrganizations = useCallback(async (params: {
    page?: number
    search?: string
    status?: string
  }) => {
    setLoading(true)
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.set('page', params.page.toString())
      if (params.search) queryParams.set('search', params.search)
      if (params.status && params.status !== 'all') queryParams.set('status', params.status)
      queryParams.set('limit', '20')

      const response = await fetch(`/api/platform/organizations?${queryParams}`)
      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.data)
        setTotal(data.total)
        setTotalPages(data.totalPages)
        setCurrentPage(data.page)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const handlePageChange = (page: number) => {
    fetchOrganizations({ page })
  }

  const handleSearch = (query: string) => {
    fetchOrganizations({ search: query, page: 1 })
  }

  const handleStatusFilter = (status: string) => {
    fetchOrganizations({ status, page: 1 })
  }

  return (
    <div className={loading ? 'opacity-50 pointer-events-none' : ''}>
      <OrganizationsTable
        organizations={organizations}
        showPagination={true}
        totalPages={totalPages}
        currentPage={currentPage}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onStatusFilter={handleStatusFilter}
      />
    </div>
  )
}
