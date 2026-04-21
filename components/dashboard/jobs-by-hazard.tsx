'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from '@/components/charts/recharts-lazy'
import { Cell } from 'recharts'
import type { DashboardFilters } from '@/lib/dashboard/filters'

interface HazardBucket {
  hazard: string
  count: number
}

interface JobsByHazardResponse {
  total: number
  buckets: HazardBucket[]
}

// Hazard-specific colors; picked to pair with the semantic meaning of each
// (red-ish for asbestos/lead — acute regulatory exposure, blue/teal for
// mold/vermiculite — water/insulation, gray for unknown).
const HAZARD_COLOR: Record<string, string> = {
  asbestos: '#dc2626',
  mold: '#0ea5e9',
  lead: '#f59e0b',
  vermiculite: '#14b8a6',
  other: '#8b5cf6',
  unknown: '#9ca3af',
}

const HAZARD_LABEL: Record<string, string> = {
  asbestos: 'Asbestos',
  mold: 'Mold',
  lead: 'Lead',
  vermiculite: 'Vermiculite',
  other: 'Other',
  unknown: 'Unknown',
}

interface JobsByHazardProps {
  filters: DashboardFilters
}

export function JobsByHazard({ filters }: JobsByHazardProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [data, setData] = useState<HazardBucket[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('period', filters.period)
        const response = await fetch(`/api/analytics/jobs-by-hazard?${params.toString()}`)
        if (!response.ok) throw new Error('fetch failed')
        const result: JobsByHazardResponse = await response.json()
        if (cancelled) return
        setData(Array.isArray(result.buckets) ? result.buckets : [])
        setTotal(result.total || 0)
      } catch {
        if (!cancelled) {
          setData([])
          setTotal(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
    // This chart deliberately ignores filters.hazardType — the whole point
    // is to see the mix across hazards. Period still applies.
  }, [filters.period])

  // Click-through interaction: picking a bar narrows the rest of the
  // dashboard to that hazard (sets ?hazard_type=… in the URL, which the
  // top-level DashboardFiltersBar and every card already read).
  const filterByHazard = (hazard: string) => {
    if (hazard === 'unknown') return
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    if (filters.hazardType === hazard) {
      params.delete('hazard_type')
    } else {
      params.set('hazard_type', hazard)
    }
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const chartData = data.map((b) => ({
    ...b,
    label: HAZARD_LABEL[b.hazard] || b.hazard,
    isActive: filters.hazardType === b.hazard,
  }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Jobs by Hazard</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Click a bar to filter the dashboard to that hazard
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold leading-none">{total}</div>
          <p className="text-xs text-muted-foreground mt-1">total jobs</p>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            No jobs in this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value }) => `${name} · ${value}`}
                labelLine={false}
                onClick={(entry: unknown) => {
                  const e = entry as { hazard?: string }
                  if (e.hazard) filterByHazard(e.hazard)
                }}
                cursor="pointer"
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.hazard}
                    fill={HAZARD_COLOR[entry.hazard] || '#9ca3af'}
                    opacity={
                      filters.hazardType === 'all' || entry.isActive ? 1 : 0.4
                    }
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} jobs`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}

        {/* Keyboard-accessible fallback: hidden buttons tied to each bar so
            keyboard/screen-reader users can filter without a mouse. */}
        <div className="flex flex-wrap gap-2 mt-3">
          {chartData.map((entry) => (
            <button
              key={entry.hazard}
              type="button"
              onClick={() => filterByHazard(entry.hazard)}
              className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                entry.isActive
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background hover:bg-accent border-border'
              }`}
              disabled={entry.hazard === 'unknown'}
              aria-pressed={entry.isActive}
            >
              <span
                className="inline-block w-2 h-2 rounded-sm mr-1.5 align-middle"
                style={{ backgroundColor: HAZARD_COLOR[entry.hazard] || '#9ca3af' }}
              />
              {entry.label}: {entry.count}
            </button>
          ))}
        </div>

        {filters.hazardType !== 'all' && (
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams(searchParams?.toString() ?? '')
              params.delete('hazard_type')
              const qs = params.toString()
              router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
            }}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground underline"
          >
            Clear hazard filter
          </button>
        )}
      </CardContent>
    </Card>
  )
}
