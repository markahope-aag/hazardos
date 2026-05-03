'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ClipboardList, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface WorkOrderRow {
  id: string
  work_order_number: string
  status: 'draft' | 'issued'
  notes: string | null
  issued_at: string | null
  created_at: string
  updated_at: string
  job: {
    id: string
    job_number: string | null
    name: string | null
    job_address: string | null
    job_city: string | null
    job_state: string | null
    scheduled_start_date: string | null
    customer: {
      id: string
      name: string | null
      company_name: string | null
    } | null
  } | null
}

export default function WorkOrdersPage() {
  const { toast } = useToast()
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/work-orders')
        if (!res.ok) throw new Error('Failed to load work orders')
        const body = await res.json()
        if (!cancelled) setWorkOrders(body.work_orders || [])
      } catch (err) {
        if (!cancelled) {
          toast({
            title: 'Could not load work orders',
            description: err instanceof Error ? err.message : 'Try again shortly.',
            variant: 'destructive',
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [toast])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Work Orders</h1>
          <p className="text-muted-foreground">
            The sheet the crew takes to the site — site details, people, materials, equipment, vehicles.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/jobs">Generate from a job</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : workOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <ClipboardList className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No work orders yet</h3>
            <p className="text-sm text-muted-foreground">
              Work orders are generated from a job. Open a job and click &quot;Generate Work Order&quot;.
            </p>
            <Button asChild>
              <Link href="/jobs">Go to jobs</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Work Order #</TableHead>
                <TableHead>Job</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((wo) => {
                const customerName = wo.job?.customer
                  ? wo.job.customer.company_name || wo.job.customer.name || 'Unnamed'
                  : '—'
                const site = [wo.job?.job_address, wo.job?.job_city, wo.job?.job_state]
                  .filter(Boolean)
                  .join(', ') || '—'
                const scheduled = wo.job?.scheduled_start_date
                  ? new Date(wo.job.scheduled_start_date).toLocaleDateString()
                  : '—'
                return (
                  <TableRow key={wo.id}>
                    <TableCell>
                      <Link
                        href={`/work-orders/${wo.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {wo.work_order_number}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {wo.job?.id ? (
                        <Link
                          href={`/jobs/${wo.job.id}`}
                          className="text-sm hover:underline"
                        >
                          {wo.job.job_number || 'View job'}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{customerName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[280px] truncate">
                      {site}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{scheduled}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          wo.status === 'issued'
                            ? 'bg-green-100 text-green-700 border-0'
                            : 'bg-amber-100 text-amber-700 border-0'
                        }
                      >
                        {wo.status === 'issued' ? 'Issued' : 'Draft'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
