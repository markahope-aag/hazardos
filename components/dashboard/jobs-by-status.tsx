'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from '@/components/charts/recharts-lazy'
import { Cell } from 'recharts'
import type { DashboardFilters } from '@/lib/dashboard/filters'

interface JobStatusBucket {
  status: string
  count: number
}

interface JobsByStatusResponse {
  total: number
  buckets: JobStatusBucket[]
}

// Brand-aligned semantic palette. HazardOS Orange (#ED6F3B) tags the
// work-in-flight state, Navy (#1F2937) anchors the "billed" phase, and
// emerald claims the happy "money in" ending. Paused / cancelled slide
// into muted slate and deep red so they read as off-happy-path.
const COLORS: Record<string, string> = {
  scheduled: '#F59E0B',
  in_progress: '#ED6F3B',
  completed: '#059669',
  invoiced: '#1F2937',
  paid: '#10B981',
  cancelled: '#991B1B',
  on_hold: '#64748B',
}

interface JobsByStatusProps {
  filters: DashboardFilters
}

export function JobsByStatus({ filters }: JobsByStatusProps) {
  const [data, setData] = useState<JobStatusBucket[]>([])
  const [total, setTotal] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('period', filters.period)
        if (filters.hazardType !== 'all') {
          params.set('hazard_type', filters.hazardType)
        }
        const response = await fetch(`/api/analytics/jobs-by-status?${params.toString()}`)
        if (!response.ok) throw new Error('fetch failed')
        const result: JobsByStatusResponse = await response.json()
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
  }, [filters.period, filters.hazardType])

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Jobs by Status</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {filters.hazardType === 'all' ? 'All hazard types' : `${filters.hazardType} only`}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No jobs match the selected filters
          </div>
        ) : (
          // Donut layout: inner label absorbs the big total so the number
          // is impossible to miss, and the ring around it reads as a
          // composition of that number. Outer labels show each slice's
          // count directly (the dashboard is small-scale — showing 3 and 2
          // and 1 is more useful than "43%" and "29%" at a glance).
          <div className="relative">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={1}
                  label={({ name, value }) =>
                    `${String(name).replace(/_/g, ' ')} · ${value}`
                  }
                  labelLine={false}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[entry.status] || '#9ca3af'}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

            {/* Centered total in the donut hole. Positioned above the
                legend row (~40px of legend height at the bottom) so it sits
                in the middle of the ring, not the middle of the card. */}
            <div
              className="pointer-events-none absolute inset-x-0 flex flex-col items-center"
              style={{ top: 110 }}
              aria-hidden="true"
            >
              <div className="text-4xl font-bold leading-none">{total}</div>
              <div className="text-xs text-muted-foreground mt-1">
                total {total === 1 ? 'job' : 'jobs'}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
