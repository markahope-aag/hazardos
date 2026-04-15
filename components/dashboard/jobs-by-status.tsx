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

const COLORS: Record<string, string> = {
  scheduled: '#3b82f6',
  in_progress: '#eab308',
  completed: '#22c55e',
  invoiced: '#a855f7',
  paid: '#06b6d4',
  cancelled: '#ef4444',
  on_hold: '#f97316',
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
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Jobs by Status</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {filters.hazardType === 'all' ? 'All hazard types' : `${filters.hazardType} only`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold leading-none">{total}</div>
          <p className="text-xs text-muted-foreground mt-1">total jobs</p>
        </div>
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
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) =>
                  `${String(name).replace(/_/g, ' ')} (${((percent ?? 0) * 100).toFixed(0)}%)`
                }
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
        )}
      </CardContent>
    </Card>
  )
}
