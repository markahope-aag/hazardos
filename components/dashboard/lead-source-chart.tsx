'use client'

import { useEffect, useState } from 'react'
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

interface LeadSourceBucket {
  source: string
  count: number
}

interface LeadSourceResponse {
  total: number
  buckets: LeadSourceBucket[]
}

interface LeadSourceChartProps {
  filters: DashboardFilters
}

// A small cycling palette — lead-source labels are free-text so we can't
// hard-code colors per value. Stable color-per-label across renders by
// hashing the source string to a palette index.
const PALETTE = [
  '#2563eb', '#16a34a', '#f59e0b', '#db2777',
  '#7c3aed', '#0891b2', '#dc2626', '#ca8a04',
  '#65a30d', '#0284c7', '#be185d', '#9333ea',
]

function colorFor(key: string): string {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

function formatSourceLabel(raw: string): string {
  if (!raw) return 'Unknown'
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

export function LeadSourceChart({ filters }: LeadSourceChartProps) {
  const [data, setData] = useState<LeadSourceBucket[]>([])
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
        const response = await fetch(`/api/analytics/lead-source?${params.toString()}`)
        if (!response.ok) throw new Error('fetch failed')
        const result: LeadSourceResponse = await response.json()
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

  const chartData = data.map((b) => ({
    ...b,
    label: formatSourceLabel(b.source),
    color: colorFor(b.source || 'unknown'),
  }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Lead Sources</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Where your jobs are coming from</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold leading-none">{total}</div>
          <p className="text-xs text-muted-foreground mt-1">tracked jobs</p>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            No lead-source data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={110}
                label={({ name, value }) => `${name} · ${value}`}
                labelLine={false}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.source} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} jobs`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
