'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
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

function formatSourceLabel(raw: string): string {
  if (!raw) return 'Unknown'
  // Accept snake_case, kebab-case, or already-pretty strings.
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

  const max = data.reduce((m, b) => Math.max(m, b.count), 0)

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
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
            No lead-source data for this period
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((bucket) => {
              const percent = max > 0 ? (bucket.count / max) * 100 : 0
              const share = total > 0 ? Math.round((bucket.count / total) * 100) : 0
              return (
                <div key={bucket.source} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{formatSourceLabel(bucket.source)}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      {bucket.count} <span className="text-xs">({share}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full bg-primary/80 rounded-full transition-all')}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
