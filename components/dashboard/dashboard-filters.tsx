'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition } from 'react'
import {
  DashboardFilters,
  DashboardPeriod,
  DashboardHazardType,
  PERIOD_OPTIONS,
  HAZARD_TYPE_OPTIONS,
  DEFAULT_FILTERS,
} from '@/lib/dashboard/filters'
import { cn } from '@/lib/utils'

interface DashboardFiltersBarProps {
  filters: DashboardFilters
}

export function DashboardFiltersBar({ filters }: DashboardFiltersBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const updateFilter = (key: 'period' | 'hazard_type', value: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    const defaultValue =
      key === 'period' ? DEFAULT_FILTERS.period : DEFAULT_FILTERS.hazardType
    if (value === defaultValue) {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const qs = params.toString()
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        'rounded-lg border bg-card p-3',
        isPending && 'opacity-70 transition-opacity'
      )}
    >
      <FilterGroup
        label="Period"
        value={filters.period}
        options={PERIOD_OPTIONS}
        onChange={(value) => updateFilter('period', value as DashboardPeriod)}
      />
      <FilterGroup
        label="Hazard"
        value={filters.hazardType}
        options={HAZARD_TYPE_OPTIONS}
        onChange={(value) => updateFilter('hazard_type', value as DashboardHazardType)}
      />
    </div>
  )
}

interface FilterGroupProps<T extends string> {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}

function FilterGroup<T extends string>({ label, value, options, onChange }: FilterGroupProps<T>) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1" role="group" aria-label={label}>
        {options.map((opt) => {
          const isActive = opt.value === value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              aria-pressed={isActive}
              className={cn(
                'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
