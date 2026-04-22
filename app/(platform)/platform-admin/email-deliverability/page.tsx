'use client'

import { useEffect, useState } from 'react'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { AlertTriangle, CheckCircle, Loader2, Mail } from 'lucide-react'

interface TenantStats {
  organization_id: string
  organization_name: string
  total_sent: number
  delivered: number
  bounced: number
  complained: number
  failed: number
  bounce_rate: number
  complaint_rate: number
  has_verified_domain: boolean
  needs_attention: boolean
  first_send_at: string | null
  last_send_at: string | null
}

interface Response {
  window_days: number
  bounce_threshold: number
  complaint_threshold: number
  tenants: TenantStats[]
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`
}

export default function EmailDeliverabilityPage() {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/platform-admin/email-deliverability')
        if (!res.ok) throw new Error('Failed to load metrics')
        const json = await res.json()
        setData(json)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-destructive">
          {error || 'No data'}
        </CardContent>
      </Card>
    )
  }

  const attention = data.tenants.filter((t) => t.needs_attention)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Email Deliverability
        </h1>
        <p className="text-muted-foreground">
          Per-tenant send stats over the last {data.window_days} days.
          Tenants crossing {pct(data.bounce_threshold)} bounce or{' '}
          {pct(data.complaint_threshold)} complaint rates (with 50+ sends) are flagged — those are the
          thresholds Google and Yahoo use before downgrading shared-sender reputation.
        </p>
      </div>

      {attention.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              {attention.length} tenant{attention.length === 1 ? '' : 's'} need attention
            </CardTitle>
            <CardDescription className="text-red-900 dark:text-red-200">
              Consider pushing these tenants to verify their own domain so their reputation
              doesn't impact shared-IP deliverability.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-1">
              {attention.map((t) => (
                <li key={t.organization_id}>
                  <strong>{t.organization_name}</strong>
                  {' — '}
                  {pct(t.bounce_rate)} bounce / {pct(t.complaint_rate)} complaint across {t.total_sent} sends
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Tenants</CardTitle>
          <CardDescription>Sorted with flagged tenants at the top.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.tenants.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No email sends in the last {data.window_days} days.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Sent</TableHead>
                  <TableHead className="text-right">Delivered</TableHead>
                  <TableHead className="text-right">Bounced</TableHead>
                  <TableHead className="text-right">Complained</TableHead>
                  <TableHead className="text-right">Failed</TableHead>
                  <TableHead>Domain</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tenants.map((t) => (
                  <TableRow key={t.organization_id} className={t.needs_attention ? 'bg-red-50 dark:bg-red-950/30' : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {t.needs_attention && <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />}
                        <span className="font-medium">{t.organization_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{t.total_sent}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{t.delivered}</TableCell>
                    <TableCell className={`text-right font-mono text-sm ${t.bounce_rate >= data.bounce_threshold ? 'text-red-600 font-bold' : ''}`}>
                      {t.bounced} <span className="text-xs text-muted-foreground">({pct(t.bounce_rate)})</span>
                    </TableCell>
                    <TableCell className={`text-right font-mono text-sm ${t.complaint_rate >= data.complaint_threshold ? 'text-red-600 font-bold' : ''}`}>
                      {t.complained} <span className="text-xs text-muted-foreground">({pct(t.complaint_rate)})</span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{t.failed}</TableCell>
                    <TableCell>
                      {t.has_verified_domain ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Shared
                        </Badge>
                      )}
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
