'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ClipboardList,
  ExternalLink,
  MapPin,
  Users,
  Wrench,
  Package,
  Truck,
  StickyNote,
  Plus,
} from 'lucide-react'
import type {
  WorkOrder,
  WorkOrderSnapshot,
  WorkOrderVehicle,
  WorkOrderStatus,
} from '@/types/work-orders'

interface JobWorkOrderProps {
  jobId: string
  // Optional pre-loaded summary from the job page server fetch. When
  // present, we skip the initial fetch round-trip; we still re-fetch
  // when the tab opens so dispatch-side edits show up.
  initial?: { id: string; work_order_number: string; status: WorkOrderStatus } | null
}

interface WorkOrderDetail extends WorkOrder {
  job: { id: string; job_number: string | null; name: string | null } | null
  vehicles: WorkOrderVehicle[]
}

const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  draft: 'Draft',
  issued: 'Issued',
  revised: 'Revised',
  completed: 'Completed',
  archived: 'Archived',
}
const STATUS_BADGE: Record<WorkOrderStatus, string> = {
  draft: 'bg-amber-100 text-amber-700 border-0',
  issued: 'bg-green-100 text-green-700 border-0',
  revised: 'bg-orange-100 text-orange-700 border-0',
  completed: 'bg-blue-100 text-blue-700 border-0',
  archived: 'bg-gray-200 text-gray-700 border-0',
}

function Section({
  icon,
  title,
  count,
  children,
  empty,
}: {
  icon: React.ReactNode
  title: string
  count?: number
  children: React.ReactNode
  empty?: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{title}</span>
        {typeof count === 'number' && (
          <span className="text-muted-foreground">({count})</span>
        )}
      </div>
      {count === 0 && empty ? (
        <p className="text-sm text-muted-foreground italic">{empty}</p>
      ) : (
        children
      )}
    </div>
  )
}

export function JobWorkOrder({ jobId, initial }: JobWorkOrderProps) {
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        // The job page only embeds a pointer to the latest work order;
        // the canonical record lives behind /api/work-orders/[id]. If
        // we already have an id from `initial`, hit it directly. If
        // not, fall back to the work-orders index filtered by job.
        let workOrderId = initial?.id
        if (!workOrderId) {
          const indexRes = await fetch(`/api/work-orders`)
          if (!indexRes.ok) throw new Error('Failed to look up work order')
          const indexBody = await indexRes.json()
          // Pick the most recent work order matching this job. The list
          // endpoint already returns newest-first.
          const match = (indexBody.work_orders || []).find(
            (w: { job?: { id?: string } | null }) => w.job?.id === jobId,
          )
          workOrderId = match?.id
        }

        if (!workOrderId) {
          if (!cancelled) {
            setMissing(true)
            setLoading(false)
          }
          return
        }

        const res = await fetch(`/api/work-orders/${workOrderId}`)
        if (!res.ok) throw new Error('Failed to load work order')
        const body = await res.json()
        if (!cancelled) {
          setWorkOrder(body.work_order)
          setMissing(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [jobId, initial?.id])

  const generateWorkOrder = async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const reason =
          typeof body?.error === 'string'
            ? body.error
            : typeof body?.error?.message === 'string'
              ? body.error.message
              : null
        throw new Error(reason || `Failed to generate work order (${res.status})`)
      }
      const body = await res.json()
      const id = body.work_order?.id
      if (id) {
        const followup = await fetch(`/api/work-orders/${id}`)
        if (followup.ok) {
          const woBody = await followup.json()
          setWorkOrder(woBody.work_order)
          setMissing(false)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (missing) {
    return (
      <Card>
        <CardContent className="text-center py-12 space-y-3">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
            <ClipboardList className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-medium">No work order yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Generate a work order to give the crew a single dispatch sheet
            for the day — site, scope, people, materials, equipment, and
            vehicles all in one place.
          </p>
          <Button onClick={generateWorkOrder} disabled={generating}>
            <Plus className="h-4 w-4 mr-2" />
            {generating ? 'Generating…' : 'Generate Work Order'}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    )
  }

  if (!workOrder) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-destructive">
          {error || 'Could not load work order.'}
        </CardContent>
      </Card>
    )
  }

  const s = workOrder.snapshot as WorkOrderSnapshot
  const status = workOrder.status

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            <CardTitle className="text-base">{workOrder.work_order_number}</CardTitle>
            <Badge variant="outline" className={STATUS_BADGE[status]}>
              {STATUS_LABEL[status]}
            </Badge>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/work-orders/${workOrder.id}`}>
              Open work order
              <ExternalLink className="h-3.5 w-3.5 ml-2" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Site */}
        <Section icon={<MapPin className="h-4 w-4" />} title="Site">
          <div className="text-sm space-y-0.5">
            {[s.site?.address, s.site?.city, s.site?.state, s.site?.zip]
              .filter(Boolean)
              .join(', ') || <span className="text-muted-foreground">—</span>}
            {(s.site?.gate_code || s.site?.lockbox_code) && (
              <div className="text-xs text-muted-foreground">
                {s.site?.gate_code && <>Gate: {s.site.gate_code}</>}
                {s.site?.gate_code && s.site?.lockbox_code && ' · '}
                {s.site?.lockbox_code && <>Lockbox: {s.site.lockbox_code}</>}
              </div>
            )}
            {(s.site?.contact_onsite_name || s.site?.contact_onsite_phone) && (
              <div className="text-xs text-muted-foreground">
                Onsite: {s.site.contact_onsite_name}
                {s.site.contact_onsite_phone && ` · ${s.site.contact_onsite_phone}`}
              </div>
            )}
          </div>
        </Section>

        {/* Crew */}
        <Section
          icon={<Users className="h-4 w-4" />}
          title="Crew"
          count={s.crew?.length || 0}
          empty="No crew assigned."
        >
          <ul className="text-sm space-y-1">
            {(s.crew || []).map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="font-medium">{c.name}</span>
                {c.role && <span className="text-muted-foreground">· {c.role}</span>}
                {c.is_lead && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1 border-0 bg-blue-100 text-blue-700">
                    LEAD
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </Section>

        {/* Materials */}
        <Section
          icon={<Package className="h-4 w-4" />}
          title="Materials"
          count={s.materials?.length || 0}
          empty="None listed."
        >
          <ul className="text-sm space-y-1">
            {(s.materials || []).map((m, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span>{m.name}</span>
                <span className="text-muted-foreground text-xs">
                  {m.quantity_estimated != null
                    ? `${m.quantity_estimated}${m.unit ? ' ' + m.unit : ''}`
                    : ''}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Equipment */}
        <Section
          icon={<Wrench className="h-4 w-4" />}
          title="Equipment"
          count={s.equipment?.length || 0}
          empty="None listed."
        >
          <ul className="text-sm space-y-1">
            {(s.equipment || []).map((e, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                <span>
                  {e.name}
                  {e.is_rental && (
                    <Badge variant="outline" className="ml-2 text-xs">Rental</Badge>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">×{e.quantity}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Vehicles */}
        <Section
          icon={<Truck className="h-4 w-4" />}
          title="Vehicles"
          count={workOrder.vehicles?.length || 0}
          empty="None assigned."
        >
          <ul className="text-sm space-y-1">
            {(workOrder.vehicles || []).map((v) => {
              const label = [v.make_model, v.vehicle_type].filter(Boolean).join(' · ') || 'Vehicle'
              const sub = [
                v.driver_name && `Driver: ${v.driver_name}`,
                v.plate && `Plate: ${v.plate}`,
                v.is_rental && v.rental_vendor && `Rental: ${v.rental_vendor}`,
              ]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={v.id} className="space-y-0.5">
                  <div>{label}</div>
                  {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
                </li>
              )
            })}
          </ul>
        </Section>

        {/* Notes */}
        {workOrder.notes && (
          <Section icon={<StickyNote className="h-4 w-4" />} title="Dispatch notes">
            <p className="text-sm whitespace-pre-wrap">{workOrder.notes}</p>
          </Section>
        )}
      </CardContent>
    </Card>
  )
}
