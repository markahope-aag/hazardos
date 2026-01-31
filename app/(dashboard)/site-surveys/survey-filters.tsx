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

export function SurveyFilters({ className }: SurveyFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { organization } = useMultiTenantAuth()

  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState(searchParams.get('status') || 'all')
  const [technician, setTechnician] = useState(searchParams.get('technician') || 'all')
  const [dateFrom, setDateFrom] = useState(searchParams.get('from') || '')
  const [dateTo, setDateTo] = useState(searchParams.get('to') || '')
  const [technicians, setTechnicians] = useState<Technician[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Load technicians
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

  // Update URL params on filter change
  const updateFilters = (newFilters: Record<string, string>) => {
    const params = new URLSearchParams()

    const currentFilters = {
      search,
      status,
      technician,
      from: dateFrom,
      to: dateTo,
      ...newFilters,
    }

    Object.entries(currentFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value)
      }
    })

    router.push(`/site-surveys?${params.toString()}`)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateFilters({ search })
  }

  const handleClearFilters = () => {
    setSearch('')
    setStatus('all')
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
    search || status !== 'all' || technician !== 'all' || dateFrom || dateTo

  return (
    <div className={`space-y-4 ${className || ''}`}>
      {/* Main filters row */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search surveys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </form>

        {/* Status filter */}
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value)
            updateFilters({ status: value })
          }}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="estimated">Estimated</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        {/* Technician filter */}
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

        {/* Advanced filters toggle */}
        <Button
          variant="outline"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={showAdvanced ? 'bg-accent' : ''}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Advanced filters */}
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

      {/* Active filters indicator */}
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
