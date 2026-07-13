'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Lock, LockOpen, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { formatCurrency } from '@/lib/utils'

export interface CommissionPeriod {
  period: string
  status: 'open' | 'closed'
  earning_count: number
  total_commission: number
  closed_at: string | null
}

interface CommissionPeriodsProps {
  periods: CommissionPeriod[]
  canManage: boolean
}

function formatPeriod(period: string): string {
  // 'YYYY-MM' → 'July 2026'
  const [y, m] = period.split('-').map(Number)
  if (!y || !m) return period
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function CommissionPeriods({ periods, canManage }: CommissionPeriodsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  const setStatus = async (period: string, status: 'open' | 'closed') => {
    setBusy(period)
    try {
      const response = await fetch('/api/commissions/periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, status }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const detail =
          typeof data?.error === 'string'
            ? data.error
            : typeof data?.error?.message === 'string'
              ? data.error.message
              : null
        throw new Error(detail || `Failed to update period (${response.status})`)
      }
      toast({ title: status === 'closed' ? 'Period closed' : 'Period reopened' })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update period',
        variant: 'destructive',
      })
    } finally {
      setBusy(null)
    }
  }

  if (periods.length === 0) {
    return <p className="text-center py-6 text-muted-foreground text-sm">No commission periods yet</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">Earnings</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
          {canManage && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {periods.map((p) => (
          <TableRow key={p.period}>
            <TableCell>{formatPeriod(p.period)}</TableCell>
            <TableCell className="text-right">{p.earning_count}</TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(p.total_commission, false)}
            </TableCell>
            <TableCell>
              {p.status === 'closed' ? (
                <Badge variant="secondary">
                  <Lock className="h-3 w-3 mr-1" />
                  Closed
                </Badge>
              ) : (
                <Badge variant="outline">Open</Badge>
              )}
            </TableCell>
            {canManage && (
              <TableCell className="text-right">
                {busy === p.period ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-auto" />
                ) : p.status === 'open' ? (
                  <Button size="sm" variant="outline" onClick={() => setStatus(p.period, 'closed')}>
                    <Lock className="h-4 w-4 mr-1" />
                    Close
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setStatus(p.period, 'open')}>
                    <LockOpen className="h-4 w-4 mr-1" />
                    Reopen
                  </Button>
                )}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
