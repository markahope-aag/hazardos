'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Activity, Loader2, RefreshCw, RotateCcw } from 'lucide-react'

type OrderBy = 'total_time' | 'mean_time' | 'max_time' | 'calls'

interface SlowQueryRow {
  query: string
  calls: number
  total_exec_ms: number
  mean_exec_ms: number
  min_exec_ms: number
  max_exec_ms: number
  stddev_exec_ms: number
  rows_returned: number
  shared_blks_hit: number
  shared_blks_read: number
}

interface ApiResponse {
  order_by: OrderBy
  limit: number
  rows: SlowQueryRow[]
}

const ORDER_LABELS: Record<OrderBy, string> = {
  total_time: 'Total time',
  mean_time: 'Mean time',
  max_time: 'Max time',
  calls: 'Call count',
}

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`
  if (ms >= 1) return `${ms.toFixed(1)} ms`
  return `${ms.toFixed(3)} ms`
}

function formatCount(n: number): string {
  return n.toLocaleString()
}

function cacheHitRate(hit: number, read: number): string {
  const total = hit + read
  if (total === 0) return '—'
  return `${((hit / total) * 100).toFixed(1)}%`
}

export default function QueryPerformancePage() {
  const [orderBy, setOrderBy] = useState<OrderBy>('total_time')
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (order: OrderBy) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/platform-admin/query-performance?order_by=${order}&limit=50`)
      if (!res.ok) throw new Error(`Failed to load (${res.status})`)
      const json = (await res.json()) as ApiResponse
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(orderBy)
  }, [orderBy, load])

  async function handleReset() {
    if (!confirm('Reset pg_stat_statements? All accumulated query stats since the last reset will be cleared.')) return
    setResetting(true)
    try {
      const res = await fetch('/api/platform-admin/query-performance/reset', { method: 'POST' })
      if (!res.ok) throw new Error(`Reset failed (${res.status})`)
      await load(orderBy)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Query Performance
          </h1>
          <p className="text-muted-foreground max-w-3xl">
            Top entries from <code className="text-xs">pg_stat_statements</code> for this database.
            Stats accumulate from the last reset (or last DB restart) until you clear them.
            Resetting before reproducing a regression makes the offending query much easier to spot.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(orderBy)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={resetting || loading}>
            <RotateCcw className={`h-4 w-4 mr-2 ${resetting ? 'animate-spin' : ''}`} />
            Reset stats
          </Button>
        </div>
      </div>

      <Tabs value={orderBy} onValueChange={(v) => setOrderBy(v as OrderBy)}>
        <TabsList>
          <TabsTrigger value="total_time">By total time</TabsTrigger>
          <TabsTrigger value="mean_time">By mean time</TabsTrigger>
          <TabsTrigger value="max_time">By max time</TabsTrigger>
          <TabsTrigger value="calls">By calls</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Top 50 — sorted by {ORDER_LABELS[orderBy]}</CardTitle>
          <CardDescription>
            Click a query row to see the full text. Cache hit rate combines shared_blks_hit / read.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive text-sm">{error}</div>
          ) : !data || data.rows.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No query stats recorded.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead className="text-right">Calls</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Mean</TableHead>
                  <TableHead className="text-right">Max</TableHead>
                  <TableHead className="text-right">Rows</TableHead>
                  <TableHead className="text-right">Cache hit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="max-w-xl">
                      <details>
                        <summary className="cursor-pointer text-xs font-mono truncate">
                          {row.query.length > 120 ? row.query.slice(0, 120) + '…' : row.query}
                        </summary>
                        <pre className="text-xs font-mono whitespace-pre-wrap mt-2 p-2 bg-muted rounded">
                          {row.query}
                        </pre>
                      </details>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCount(row.calls)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatMs(row.total_exec_ms)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatMs(row.mean_exec_ms)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatMs(row.max_exec_ms)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{formatCount(row.rows_returned)}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {cacheHitRate(row.shared_blks_hit, row.shared_blks_read)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
