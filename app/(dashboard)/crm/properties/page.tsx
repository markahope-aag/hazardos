'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  MapPin, Search, ChevronLeft, ChevronRight, Users, Briefcase,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react'
import { useProperties, type PropertiesSortKey, type PropertiesSortDir } from '@/lib/hooks/use-properties'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'

const PAGE_SIZE = 25

export default function PropertiesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState<PropertiesSortKey>('recent')
  const [sortDir, setSortDir] = useState<PropertiesSortDir>('desc')
  const debounced = useDebouncedValue(search, 300)

  // Clicking the same column toggles asc/desc. Clicking a different
  // column starts from the sensible default for that column's type
  // (A→Z for text, highest-first for counts).
  const toggleSort = (key: PropertiesSortKey) => {
    if (sortBy === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(key)
      setSortDir(key === 'jobs' || key === 'recent' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  const sortIcon = (key: PropertiesSortKey) => {
    if (sortBy !== key) return <ArrowUpDown className="h-3 w-3 text-gray-300" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />
  }

  const queryOptions = useMemo(
    () => ({ search: debounced, page, pageSize: PAGE_SIZE, sortBy, sortDir }),
    [debounced, page, sortBy, sortDir],
  )

  const { data: properties = [], isLoading, error } = useProperties(queryOptions)

  const hasNext = properties.length === PAGE_SIZE
  const hasPrev = page > 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
        <p className="text-gray-600 mt-1">
          Search by address. Every property carries the full history of work done there —
          regardless of who owns it today.
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search address, city, state, zip..."
          className="pl-9"
          autoFocus
        />
      </div>

      {error && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-destructive mb-2">Error loading properties</div>
            <div className="text-sm text-gray-500">
              {error instanceof Error ? error.message : 'An unexpected error occurred'}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="p-10 text-center">
              <MapPin className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <div className="text-sm text-gray-600">
                {debounced
                  ? `No properties found for "${debounced}".`
                  : 'No properties yet. They will appear here as you add contacts, surveys, and jobs with addresses.'}
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => toggleSort('address')}
                      className="flex items-center gap-1.5 font-medium hover:text-primary transition-colors"
                    >
                      Address
                      {sortIcon('address')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      type="button"
                      onClick={() => toggleSort('city')}
                      className="flex items-center gap-1.5 font-medium hover:text-primary transition-colors"
                    >
                      City / State
                      {sortIcon('city')}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead className="text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('jobs')}
                      className="inline-flex items-center gap-1.5 font-medium hover:text-primary transition-colors"
                    >
                      Jobs
                      {sortIcon('jobs')}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {properties.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell>
                      <Link
                        href={`/crm/properties/${p.id}`}
                        className="block font-medium text-gray-900 hover:underline"
                      >
                        {p.address_line1}
                      </Link>
                      {p.address_line2 && (
                        <div className="text-xs text-gray-500">{p.address_line2}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {[p.city, p.state, p.zip].filter(Boolean).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <span className="inline-flex items-center gap-1 text-gray-700">
                        <Users className="h-3.5 w-3.5 text-gray-400" />
                        {p.current_contact_count}
                        {p.past_contact_count > 0 && (
                          <span className="text-gray-400">
                            {' '}/ {p.past_contact_count} past
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-700">
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5 text-gray-400" />
                        {p.job_count}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {(hasPrev || hasNext) && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">Page {page}</div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
