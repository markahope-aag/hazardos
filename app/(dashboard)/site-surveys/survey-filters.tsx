'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'

interface Technician {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

interface SurveyFiltersProps {
  className?: string
}

/**
 * The four view presets surface a sensible default (Open) for the 99% case
 * while keeping historical surveys one click away. Presets act like a
 * high-level filter; the granular status enum isn't exposed directly —
 * the detail-page badge still shows the exact status per row.
 */
export const SURVEY_VIEW_OPTIONS = [
  { value: 'open', label: 'Open surveys' },
  { value: 'completed', label: 'Completed' },
  { value: 'converted', label: 'Converted' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'all', label: 'All surveys' },
] as const

export type SurveyView = (typeof SURVEY_VIEW_OPTIONS)[number]['value']

export function SurveyFilters({ className }: SurveyFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { organization } = useMultiTenantAuth()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [view, setView] = useState<SurveyView>(
    (searchParams.get('view') as SurveyView) || 'open',
  )
  const [technician, setTechnician] = useState(searchParams.get('technician') || 'all')
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '')
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    async function loadTechnicians() {
      if (!organization?.id) return

      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('organization_id', organization.id)
        .in('role', ['technician', 'admin', 'estimator'])
        .eq('is_active', true)

      setTechnicians(data || [])
    }
    loadTechnicians()
  }, [organization?.id])

  const updateFilters = (newFilters: Record<string, string>) => {
    const params = new URLSearchParams()

    const currentFilters: Record<string, string> = {
      search,
      view,
      technician,
      from: dateFrom,
      to: dateTo,
      ...newFilters,
    }

    Object.entries(currentFilters).forEach(([key, value]) => {
      if (!value) return
      // 'all' for technician means "unset"; 'open' is the view default,
      // so neither needs to stamp the URL.
      if (key === 'technician' && value === 'all') return
      if (key === 'view' && value === 'open') return
      params.set(key, value)
    })

    router.push(`/site-surveys?${params.toString()}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search })
  }

  const handleClearFilters = () => {
    setSearch('')
    setView('open')
    setTechnician('all')
    setDateFrom('')
    setDateTo('')
    router.push('/site-surveys')
  }

  const getTechnicianName = (tech: Technician) => {
    if (tech.first_name || tech.last_name) {
      return `${tech.first_name || ''} ${tech.last_name || ''}`.trim()
    }
    return tech.email
  }

  const hasActiveFilters =
    !!search || view !== 'open' || technician !== 'all' || !!dateFrom || !!dateTo

  return (
    <div className={`space-y-4 ${className || ''}`}>
      <div className="flex flex-col sm:flex-row gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search surveys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Search surveys by property address, customer, or technician"
          />
        </form>

        <Select
          value={view}
          onValueChange={(value) => {
            const next = value as SurveyView
            setView(next)
            updateFilters({ view: next })
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="View" />
          </SelectTrigger>
          <SelectContent>
            {SURVEY_VIEW_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={technician}
          onValueChange={(value) => {
            setTechnician(value)
            updateFilters({ technician: value })
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Technician" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Technicians</SelectItem>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {getTechnicianName(tech)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={showAdvanced ? 'bg-accent' : ''}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {showAdvanced && (
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted rounded-lg">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Date From</label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value)
                updateFilters({ from: e.target.value })
              }}
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Date To</label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value)
                updateFilters({ to: e.target.value })
              }}
            />
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}
