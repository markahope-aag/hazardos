'use client'

import { use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Truck,
  CheckCircle,
  ExternalLink,
  MapPin,
  Users,
  Wrench,
  Package,
  Phone,
  FileText,
} from 'lucide-react'
import type { ManifestSnapshot, ManifestVehicle } from '@/types/manifests'

interface ManifestDetail {
  id: string
  manifest_number: string
  status: 'draft' | 'issued'
  notes: string | null
  snapshot: ManifestSnapshot
  issued_at: string | null
  issued_by: string | null
  created_at: string
  updated_at: string
  job: { id: string; job_number: string | null; name: string | null } | null
  vehicles: ManifestVehicle[]
}

export default function ManifestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { toast } = useToast()
  const [manifest, setManifest] = useState<ManifestDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notes, setNotes] = useState('')
  const [extraItems, setExtraItems] = useState<{ label: string; detail: string | null }[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/manifests/${id}`)
      if (!res.ok) throw new Error('Failed to load manifest')
      const body = await res.json()
      setManifest(body.manifest)
      setNotes(body.manifest.notes || '')
      setExtraItems(body.manifest.snapshot?.extra_items || [])
    } catch (err) {
      toast({
        title: 'Could not load manifest',
        description: err instanceof Error ? err.message : 'Try again shortly.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    load()
  }, [load])

  const saveEdits = async () => {
    if (!manifest) return
    setSaving(true)
    try {
      const res = await fetch(`/api/manifests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim() || null,
          snapshot: { extra_items: extraItems.filter((i) => i.label.trim()) },
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error?.message || 'Save failed')
      }
      toast({ title: 'Manifest updated' })
      load()
    } catch (err) {
      toast({
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const issueManifest = async () => {
    if (!manifest) return
    if (!confirm('Issue this manifest? Once issued, it can no longer be edited.')) return
    setSaving(true)
    try {
      const res = await fetch(`/api/manifests/${id}/issue`, { method: 'POST' })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error?.message || 'Failed to issue')
      }
      toast({ title: 'Manifest issued' })
      load()
    } catch (err) {
      toast({
        title: 'Could not issue',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!manifest) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-3">Manifest not found.</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/manifests">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to manifests
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const s = manifest.snapshot
  const isDraft = manifest.status === 'draft'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/manifests">
            <Button variant="ghost" size="icon" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {manifest.manifest_number}
            </h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge
                variant="outline"
                className={
                  isDraft
                    ? 'bg-amber-100 text-amber-700 border-0'
                    : 'bg-green-100 text-green-700 border-0'
                }
              >
                {isDraft ? 'Draft' : 'Issued'}
              </Badge>
              {manifest.job?.id && (
                <Link
                  href={`/jobs/${manifest.job.id}`}
                  className="inline-flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  {manifest.job.job_number || 'job'}
                </Link>
              )}
              {manifest.issued_at && (
                <span>· Issued {new Date(manifest.issued_at).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDraft && (
            <Button onClick={issueManifest} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Issue manifest
            </Button>
          )}
        </div>
      </div>

      {/* Site */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Site
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="font-medium">{s.site.address || 'No address'}</div>
          <div className="text-muted-foreground">
            {[s.site.city, s.site.state, s.site.zip].filter(Boolean).join(', ') || '—'}
          </div>
          {(s.site.gate_code || s.site.lockbox_code) && (
            <div className="pt-2 grid grid-cols-2 gap-2">
              {s.site.gate_code && (
                <div>
                  <div className="text-muted-foreground text-xs">Gate code</div>
                  <div className="font-mono">{s.site.gate_code}</div>
                </div>
              )}
              {s.site.lockbox_code && (
                <div>
                  <div className="text-muted-foreground text-xs">Lockbox</div>
                  <div className="font-mono">{s.site.lockbox_code}</div>
                </div>
              )}
            </div>
          )}
          {(s.site.contact_onsite_name || s.site.contact_onsite_phone) && (
            <div className="pt-2 text-sm flex items-center gap-2">
              <Phone className="h-3 w-3 text-muted-foreground" />
              <span>
                {s.site.contact_onsite_name || 'Onsite contact'}
                {s.site.contact_onsite_phone && ` · ${s.site.contact_onsite_phone}`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job + estimate summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Job scope
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="font-medium">{s.job.name || s.job.job_number}</div>
            <div className="text-muted-foreground">
              {s.job.scheduled_start_date && `${new Date(s.job.scheduled_start_date).toLocaleDateString()}`}
              {s.job.scheduled_start_time && ` at ${s.job.scheduled_start_time}`}
              {s.job.estimated_duration_hours && ` · ~${s.job.estimated_duration_hours}h`}
            </div>
          </div>
          {s.job.hazard_types.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {s.job.hazard_types.map((h) => (
                <Badge key={h} variant="secondary" className="text-xs">
                  {h}
                </Badge>
              ))}
            </div>
          )}
          {s.estimate?.scope_of_work && (
            <div>
              <div className="text-muted-foreground text-xs mb-1">Scope</div>
              <div className="whitespace-pre-wrap">{s.estimate.scope_of_work}</div>
            </div>
          )}
          {s.job.access_notes && (
            <div>
              <div className="text-muted-foreground text-xs mb-1">Access</div>
              <div className="whitespace-pre-wrap">{s.job.access_notes}</div>
            </div>
          )}
          {s.job.special_instructions && (
            <div>
              <div className="text-muted-foreground text-xs mb-1">Special instructions</div>
              <div className="whitespace-pre-wrap">{s.job.special_instructions}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crew */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Crew ({s.crew.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {s.crew.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No crew assigned. Add crew on the job, then regenerate the manifest.
            </p>
          ) : (
            <ul className="divide-y">
              {s.crew.map((c, i) => (
                <li key={`${c.profile_id}-${i}`} className="py-2 flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{c.name}</span>
                    {c.role && <span className="text-muted-foreground"> · {c.role}</span>}
                    {c.is_lead && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Lead
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.scheduled_start || ''}
                    {c.scheduled_start && c.scheduled_end && ' – '}
                    {c.scheduled_end || ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Materials ({s.materials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {s.materials.length === 0 ? (
            <p className="text-sm text-muted-foreground">None listed.</p>
          ) : (
            <ul className="divide-y">
              {s.materials.map((m, i) => (
                <li key={`${m.name}-${i}`} className="py-2 text-sm flex items-center justify-between">
                  <span>
                    <span className="font-medium">{m.name}</span>
                    {m.type && <span className="text-muted-foreground"> · {m.type}</span>}
                  </span>
                  <span className="text-muted-foreground">
                    {m.quantity_estimated ?? ''}
                    {m.unit ? ` ${m.unit}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Equipment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4" />
            Equipment ({s.equipment.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {s.equipment.length === 0 ? (
            <p className="text-sm text-muted-foreground">None listed.</p>
          ) : (
            <ul className="divide-y">
              {s.equipment.map((e, i) => (
                <li key={`${e.name}-${i}`} className="py-2 text-sm flex items-center justify-between">
                  <span>
                    <span className="font-medium">{e.name}</span>
                    {e.type && <span className="text-muted-foreground"> · {e.type}</span>}
                    {e.is_rental && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Rental
                      </Badge>
                    )}
                  </span>
                  <span className="text-muted-foreground">×{e.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Vehicles */}
      <VehiclesSection
        manifestId={manifest.id}
        vehicles={manifest.vehicles}
        disabled={!isDraft}
        onChange={load}
      />

      {/* Extra items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plus className="h-4 w-4" />
            Additional items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Items the crew needs that aren't already on the job record — PPE spares,
            signage, manifests, badges, etc.
          </p>
          <div className="space-y-2">
            {extraItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2">
                <Input
                  placeholder="Label"
                  value={item.label}
                  onChange={(e) => {
                    const next = [...extraItems]
                    next[i] = { ...next[i], label: e.target.value }
                    setExtraItems(next)
                  }}
                  disabled={!isDraft}
                  className="max-w-[240px]"
                />
                <Input
                  placeholder="Notes (optional)"
                  value={item.detail || ''}
                  onChange={(e) => {
                    const next = [...extraItems]
                    next[i] = { ...next[i], detail: e.target.value || null }
                    setExtraItems(next)
                  }}
                  disabled={!isDraft}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove item"
                  disabled={!isDraft}
                  onClick={() => setExtraItems(extraItems.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          {isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExtraItems([...extraItems, { label: '', detail: null }])}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add item
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Dispatch notes + save */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dispatch notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            disabled={!isDraft}
            placeholder="Anything to tell the crew that isn't captured above."
          />
          {isDraft && (
            <div className="flex justify-end">
              <Button onClick={saveEdits} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function VehiclesSection({
  manifestId,
  vehicles,
  disabled,
  onChange,
}: {
  manifestId: string
  vehicles: ManifestVehicle[]
  disabled: boolean
  onChange: () => void
}) {
  const { toast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    vehicle_type: '',
    make_model: '',
    plate: '',
    driver_name: '',
    is_rental: false,
    rental_vendor: '',
  })
  const [saving, setSaving] = useState(false)

  const addVehicle = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/manifests/${manifestId}/vehicles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_type: form.vehicle_type || null,
          make_model: form.make_model || null,
          plate: form.plate || null,
          driver_name: form.driver_name || null,
          is_rental: form.is_rental,
          rental_vendor: form.is_rental ? (form.rental_vendor || null) : null,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error?.message || 'Failed to add')
      }
      toast({ title: 'Vehicle added' })
      setShowAdd(false)
      setForm({
        vehicle_type: '',
        make_model: '',
        plate: '',
        driver_name: '',
        is_rental: false,
        rental_vendor: '',
      })
      onChange()
    } catch (err) {
      toast({
        title: 'Could not add vehicle',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const removeVehicle = async (vehicleId: string) => {
    if (!confirm('Remove this vehicle from the manifest?')) return
    try {
      const res = await fetch(`/api/manifests/${manifestId}/vehicles/${vehicleId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to remove')
      onChange()
    } catch (err) {
      toast({
        title: 'Could not remove vehicle',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Truck className="h-4 w-4" />
          Vehicles ({vehicles.length})
        </CardTitle>
        {!disabled && !showAdd && (
          <Button variant="outline" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add vehicle
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {vehicles.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground">No vehicles listed.</p>
        )}

        {vehicles.length > 0 && (
          <ul className="divide-y">
            {vehicles.map((v) => (
              <li key={v.id} className="py-3 flex items-start justify-between gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {v.make_model || v.vehicle_type || 'Vehicle'}
                    {v.plate && <span className="ml-2 font-mono text-xs text-muted-foreground">{v.plate}</span>}
                    {v.is_rental && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Rental
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {v.driver_name && `Driver: ${v.driver_name}`}
                    {v.rental_vendor && ` · Vendor: ${v.rental_vendor}`}
                  </div>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove vehicle"
                    onClick={() => removeVehicle(v.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {showAdd && (
          <div className="space-y-3 mt-3 pt-3 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Input
                  placeholder="Truck, trailer, van..."
                  value={form.vehicle_type}
                  onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Make/Model</Label>
                <Input
                  placeholder="Ford F-250"
                  value={form.make_model}
                  onChange={(e) => setForm({ ...form, make_model: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Plate</Label>
                <Input
                  value={form.plate}
                  onChange={(e) => setForm({ ...form, plate: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Driver</Label>
                <Input
                  value={form.driver_name}
                  onChange={(e) => setForm({ ...form, driver_name: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="is-rental"
                type="checkbox"
                checked={form.is_rental}
                onChange={(e) => setForm({ ...form, is_rental: e.target.checked })}
              />
              <Label htmlFor="is-rental" className="text-sm cursor-pointer">
                Rental
              </Label>
            </div>
            {form.is_rental && (
              <div>
                <Label className="text-xs">Rental vendor</Label>
                <Input
                  value={form.rental_vendor}
                  onChange={(e) => setForm({ ...form, rental_vendor: e.target.value })}
                />
              </div>
            )}
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={addVehicle} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Add vehicle
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
