'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Building2, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useCompanies } from '@/lib/hooks/use-companies'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import type { Company } from '@/types/database'

interface CompanyListProps {
  onEditCompany?: (company: Company) => void
  onDeleteCompany?: (company: Company) => void
}

export default function CompanyList({ onEditCompany, onDeleteCompany }: CompanyListProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 25

  const debouncedSearch = useDebouncedValue(search, 300)

  const queryOptions = useMemo(() => ({
    search: debouncedSearch,
    page,
    pageSize,
  }), [debouncedSearch, page, pageSize])

  const { data: companies = [], isLoading, error } = useCompanies(queryOptions)

  const handleNextPage = useCallback(() => setPage(p => p + 1), [])
  const handlePrevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), [])

  const hasNextPage = companies.length === pageSize
  const hasPrevPage = page > 1

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-destructive mb-2">Error loading companies</div>
          <div className="text-sm text-gray-500">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search companies..."
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Companies
            {!isLoading && (
              <span className="text-sm font-normal text-gray-500">
                ({companies.length}{hasNextPage ? '+' : ''})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[160px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {search ? 'No companies found' : 'No companies yet'}
              </h3>
              <p className="text-gray-500">
                {search ? 'Try adjusting your search' : 'Companies are created when you add a commercial contact'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    {(onEditCompany || onDeleteCompany) && (
                      <TableHead className="w-[80px]">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell>
                        <Link href={`/crm/companies/${company.id}`} className="font-medium text-primary hover:underline">
                          {company.name}
                        </Link>
                        {company.email && (
                          <div className="text-sm text-muted-foreground">{company.email}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {company.industry || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {company.phone || '—'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[company.city, company.state].filter(Boolean).join(', ') || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={company.status === 'active' ? 'default' : 'secondary'}>
                          {company.status}
                        </Badge>
                      </TableCell>
                      {(onEditCompany || onDeleteCompany) && (
                        <TableCell>
                          <div className="flex gap-1">
                            {onEditCompany && (
                              <Button variant="ghost" size="sm" onClick={() => onEditCompany(company)}>
                                Edit
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {(hasNextPage || hasPrevPage) && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-gray-500">Page {page}</div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={!hasPrevPage}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleNextPage} disabled={!hasNextPage}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
