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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft, Loader2, Plus, Trash2, Truck, CheckCircle,
  ExternalLink, MapPin, Users, Wrench, Package, Phone,
  FileText, Download, Mail,
} from 'lucide-react'
import type {
  Manifest,
  ManifestSnapshot,
  ManifestVehicle,
} from '@/types/manifests'
import { generateManifestPDF } from '@/lib/services/manifest-pdf-generator'

interface ManifestDetail extends Manifest {
  job: { id: string; job_number: string | null; name: string | null } | null
  vehicles: ManifestVehicle[]
}

type CrewItem = ManifestSnapshot['crew'][number]
type MaterialItem = ManifestSnapshot['materials'][number]
type EquipmentItem = ManifestSnapshot['equipment'][number]
type ExtraItem = ManifestSnapshot['extra_items'][number]

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

  // Edit-buffer state for every section — the draft-mode edits live here
  // until the user clicks "Save changes", which PATCHes the snapshot.
  const [notes, setNotes] = useState('')
  const [crew, setCrew] = useState<CrewItem[]>([])
  const [materials, setMaterials] = useState<MaterialItem[]>([])
  const [equipment, setEquipment] = useState<EquipmentItem[]>([])
  const [extraItems, setExtraItems] = useState<ExtraItem[]>([])

  // Dialogs
  const [showIssueConfirm, setShowIssueConfirm] = useState(false)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [emailing, setEmailing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/manifests/${id}`)
      if (!res.ok) throw new Error('Failed to load manifest')
      const body = await res.json()
      setManifest(body.manifest)
      const s: ManifestSnapshot = body.manifest.snapshot || {}
      setNotes(body.manifest.notes || '')
      setCrew(s.crew || [])
      setMaterials(s.materials || [])
      setEquipment(s.equipment || [])
      setExtraItems(s.extra_items || [])
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

  const saveAll = async () => {
    if (!manifest) return
    setSaving(true)
    try {
      const res = await fetch(`/api/manifests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim() || null,
          snapshot: {
            crew,
            materials: materials.filter((m) => m.name.trim()),
            equipment: equipment.filter((e) => e.name.trim()),
            extra_items: extraItems.filter((i) => i.label.trim()),
          },
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error?.message || 'Save failed')
      }
      toast({ title: 'Manifest saved' })
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
    setSaving(true)
    try {
      const res = await fetch(`/api/manifests/${id}/issue`, { method: 'POST' })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error?.message || 'Failed to issue')
      }
      toast({
        title: 'Manifest issued',
        description: 'The manifest is locked and ready for dispatch.',
      })
      setShowIssueConfirm(false)
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

  const downloadPdf = () => {
    if (!manifest) return
    // Use the in-memory manifest so the crew sees exactly what's on
    // screen, including any unsaved edits — same as hitting print.
    const snapshotForPdf: ManifestSnapshot = {
      ...manifest.snapshot,
      crew,
      materials,
      equipment,
      extra_items: extraItems,
    }
    const doc = generateManifestPDF(
      {
        ...manifest,
        snapshot: snapshotForPdf,
        notes: notes.trim() || null,
      } as Manifest,
      manifest.vehicles,
    )
    doc.save(`${manifest.manifest_number}.pdf`)
  }

  const sendEmail = async () => {
    if (!manifest) return
    const recipients = emailTo
      .split(/[,\s]+/)
      .map((r) => r.trim())
      .filter(Boolean)
    if (recipients.length === 0) {
      toast({
        title: 'Add at least one recipient',
        variant: 'destructive',
      })
      return
    }
    setEmailing(true)
    try {
      const res = await fetch(`/api/manifests/${id}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: recipients,
          message: emailMessage.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        throw new Error(b?.error?.message || 'Could not send')
      }
      const body = await res.json()
      toast({
        title: 'Manifest emailed',
        description: `Sent to ${body.recipients} recipient${body.recipients === 1 ? '' : 's'}.`,
      })
      setShowEmailDialog(false)
      setEmailTo('')
      setEmailMessage('')
    } catch (err) {
      toast({
        title: 'Could not send email',
        description: err instanceof Error ? err.message : 'Try again.',
        variant: 'destructive',
      })
    } finally {
      setEmailing(false)
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={downloadPdf}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={() => setShowEmailDialog(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          {isDraft && (
            <Button onClick={() => setShowIssueConfirm(true)} disabled={saving}>
              <CheckCircle className="h-4 w-4 mr-2" />
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
          <div className="font-medium">{s.site?.address || 'No address'}</div>
          <div className="text-muted-foreground">
            {[s.site?.city, s.site?.state, s.site?.zip].filter(Boolean).join(', ') || '—'}
          </div>
          {(s.site?.gate_code || s.site?.lockbox_code) && (
            <div className="pt-2 grid grid-cols-2 gap-2">
              {s.site?.gate_code && (
                <div>
                  <div className="text-muted-foreground text-xs">Gate code</div>
                  <div className="font-mono">{s.site.gate_code}</div>
                </div>
              )}
              {s.site?.lockbox_code && (
                <div>
                  <div className="text-muted-foreground text-xs">Lockbox</div>
                  <div className="font-mono">{s.site.lockbox_code}</div>
                </div>
              )}
            </div>
          )}
          {(s.site?.contact_onsite_name || s.site?.contact_onsite_phone) && (
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
            <div className="font-medium">{s.job?.name || s.job?.job_number}</div>
            <div className="text-muted-foreground">
              {s.job?.scheduled_start_date && `${new Date(s.job.scheduled_start_date).toLocaleDateString()}`}
              {s.job?.scheduled_start_time && ` at ${s.job.scheduled_start_time}`}
              {s.job?.estimated_duration_hours && ` · ~${s.job.estimated_duration_hours}h`}
            </div>
          </div>
          {s.job?.hazard_types?.length ? (
            <div className="flex flex-wrap gap-1">
              {s.job.hazard_types.map((h) => (
                <Badge key={h} variant="secondary" className="text-xs">
                  {h}
                </Badge>
              ))}
            </div>
          ) : null}
          {s.estimate?.scope_of_work && (
            <div>
              <div className="text-muted-foreground text-xs mb-1">Scope</div>
              <div className="whitespace-pre-wrap">{s.estimate.scope_of_work}</div>
            </div>
          )}
          {s.job?.access_notes && (
            <div>
              <div className="text-muted-foreground text-xs mb-1">Access</div>
              <div className="whitespace-pre-wrap">{s.job.access_notes}</div>
            </div>
          )}
          {s.job?.special_instructions && (
            <div>
              <div className="text-muted-foreground text-xs mb-1">Special instructions</div>
              <div className="whitespace-pre-wrap">{s.job.special_instructions}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crew */}
      <EditableListCard
        title={`Crew (${crew.length})`}
        icon={<Users className="h-4 w-4" />}
        canEdit={isDraft}
        items={crew}
        onAdd={() =>
          setCrew([
            ...crew,
            {
              profile_id: null,
              name: '',
              role: null,
              is_lead: false,
              scheduled_start: null,
              scheduled_end: null,
            },
          ])
        }
        onRemove={(i) => setCrew(crew.filter((_, j) => j !== i))}
        renderRow={(c, i) =>
          isDraft ? (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <Input
                value={c.name}
                onChange={(e) => {
                  const next = [...crew]
                  next[i] = { ...c, name: e.target.value }
                  setCrew(next)
                }}
                placeholder="Name"
                className="max-w-[200px]"
              />
              <Input
                value={c.role ?? ''}
                onChange={(e) => {
                  const next = [...crew]
                  next[i] = { ...c, role: e.target.value || null }
                  setCrew(next)
                }}
                placeholder="Role"
                className="max-w-[140px]"
              />
              <label className="inline-flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={c.is_lead}
                  onChange={(e) => {
                    const next = [...crew]
                    next[i] = { ...c, is_lead: e.target.checked }
                    setCrew(next)
                  }}
                />
                Lead
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full text-sm">
              <span>
                <span className="font-medium">{c.name}</span>
                {c.role && <span className="text-muted-foreground"> · {c.role}</span>}
                {c.is_lead && (
                  <Badge variant="outline" className="ml-2 text-xs">Lead</Badge>
                )}
              </span>
            </div>
          )
        }
        emptyText="No crew assigned. Add crew below, or assign on the job and regenerate."
      />

      {/* Materials */}
      <EditableListCard
        title={`Materials (${materials.length})`}
        icon={<Package className="h-4 w-4" />}
        canEdit={isDraft}
        items={materials}
        onAdd={() =>
          setMaterials([
            ...materials,
            { name: '', type: null, quantity_estimated: null, unit: null, notes: null },
          ])
        }
        onRemove={(i) => setMaterials(materials.filter((_, j) => j !== i))}
        renderRow={(m, i) =>
          isDraft ? (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <Input
                value={m.name}
                onChange={(e) => {
                  const next = [...materials]
                  next[i] = { ...m, name: e.target.value }
                  setMaterials(next)
                }}
                placeholder="Material"
                className="flex-1 min-w-[160px]"
              />
              <Input
                type="number"
                value={m.quantity_estimated ?? ''}
                onChange={(e) => {
                  const next = [...materials]
                  next[i] = {
                    ...m,
                    quantity_estimated: e.target.value === '' ? null : Number(e.target.value),
                  }
                  setMaterials(next)
                }}
                placeholder="Qty"
                className="w-20"
              />
              <Input
                value={m.unit ?? ''}
                onChange={(e) => {
                  const next = [...materials]
                  next[i] = { ...m, unit: e.target.value || null }
                  setMaterials(next)
                }}
                placeholder="Unit"
                className="w-20"
              />
            </div>
          ) : (
            <div className="flex items-center justify-between w-full text-sm">
              <span>
                <span className="font-medium">{m.name}</span>
                {m.type && <span className="text-muted-foreground"> · {m.type}</span>}
              </span>
              <span className="text-muted-foreground">
                {m.quantity_estimated ?? ''}
                {m.unit ? ` ${m.unit}` : ''}
              </span>
            </div>
          )
        }
        emptyText="None listed."
      />

      {/* Equipment */}
      <EditableListCard
        title={`Equipment (${equipment.length})`}
        icon={<Wrench className="h-4 w-4" />}
        canEdit={isDraft}
        items={equipment}
        onAdd={() =>
          setEquipment([
            ...equipment,
            {
              name: '',
              type: null,
              quantity: 1,
              is_rental: false,
              rental_start_date: null,
              rental_end_date: null,
              notes: null,
            },
          ])
        }
        onRemove={(i) => setEquipment(equipment.filter((_, j) => j !== i))}
        renderRow={(e, i) =>
          isDraft ? (
            <div className="flex flex-wrap items-center gap-2 w-full">
              <Input
                value={e.name}
                onChange={(ev) => {
                  const next = [...equipment]
                  next[i] = { ...e, name: ev.target.value }
                  setEquipment(next)
                }}
                placeholder="Equipment"
                className="flex-1 min-w-[160px]"
              />
              <Input
                type="number"
                value={e.quantity ?? 1}
                onChange={(ev) => {
                  const next = [...equipment]
                  next[i] = { ...e, quantity: Number(ev.target.value) || 1 }
                  setEquipment(next)
                }}
                className="w-20"
                placeholder="Qty"
              />
              <label className="inline-flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={e.is_rental}
                  onChange={(ev) => {
                    const next = [...equipment]
                    next[i] = { ...e, is_rental: ev.target.checked }
                    setEquipment(next)
                  }}
                />
                Rental
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full text-sm">
              <span>
                <span className="font-medium">{e.name}</span>
                {e.type && <span className="text-muted-foreground"> · {e.type}</span>}
                {e.is_rental && (
                  <Badge variant="outline" className="ml-2 text-xs">Rental</Badge>
                )}
              </span>
              <span className="text-muted-foreground">×{e.quantity}</span>
            </div>
          )
        }
        emptyText="None listed."
      />

      {/* Vehicles — remain server-backed with their own endpoint since
          they have plate/driver/rental metadata that doesn't live on the
          snapshot. */}
      <VehiclesSection
        manifestId={manifest.id}
        vehicles={manifest.vehicles}
        disabled={!isDraft}
        onChange={load}
      />

      {/* Extra items */}
      <EditableListCard
        title={`Additional items (${extraItems.length})`}
        icon={<Plus className="h-4 w-4" />}
        canEdit={isDraft}
        items={extraItems}
        onAdd={() => setExtraItems([...extraItems, { label: '', detail: null }])}
        onRemove={(i) => setExtraItems(extraItems.filter((_, j) => j !== i))}
        renderRow={(item, i) =>
          isDraft ? (
            <div className="flex items-start gap-2 w-full">
              <Input
                placeholder="Label"
                value={item.label}
                onChange={(e) => {
                  const next = [...extraItems]
                  next[i] = { ...item, label: e.target.value }
                  setExtraItems(next)
                }}
                className="max-w-[240px]"
              />
              <Input
                placeholder="Notes (optional)"
                value={item.detail || ''}
                onChange={(e) => {
                  const next = [...extraItems]
                  next[i] = { ...item, detail: e.target.value || null }
                  setExtraItems(next)
                }}
                className="flex-1"
              />
            </div>
          ) : (
            <div className="flex items-start justify-between w-full text-sm">
              <span className="font-medium">{item.label}</span>
              {item.detail && (
                <span className="text-muted-foreground text-xs">{item.detail}</span>
              )}
            </div>
          )
        }
        emptyText="PPE spares, signage, permits — anything not already captured above."
        helpText="Items the crew needs that aren't already on the estimate."
      />

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
              <Button onClick={saveAll} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue confirmation */}
      <AlertDialog open={showIssueConfirm} onOpenChange={setShowIssueConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Issue this manifest?</AlertDialogTitle>
            <AlertDialogDescription>
              Once issued, the manifest is locked. Crew, materials, equipment,
              vehicles, and notes become read-only. You can still download or
              email the PDF. Save any pending changes first — issuing uses the
              last saved snapshot.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={issueManifest} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Issue manifest
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Email manifest</DialogTitle>
            <DialogDescription>
              {manifest.manifest_number} will go out as a PDF attachment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="email-to">Recipients</Label>
              <Input
                id="email-to"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="crew@example.com, foreman@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Comma-separated. Up to 10 addresses.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message">Message (optional)</Label>
              <Textarea
                id="email-message"
                rows={4}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                placeholder="Short note to include in the email body."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(false)}
              disabled={emailing}
            >
              Cancel
            </Button>
            <Button onClick={sendEmail} disabled={emailing}>
              {emailing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface EditableListCardProps<T> {
  title: string
  icon?: React.ReactNode
  canEdit: boolean
  items: T[]
  onAdd: () => void
  onRemove: (index: number) => void
  renderRow: (item: T, index: number) => React.ReactNode
  emptyText: string
  helpText?: string
}

function EditableListCard<T>({
  title, icon, canEdit, items, onAdd, onRemove, renderRow,
  emptyText, helpText,
}: EditableListCardProps<T>) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {helpText && <p className="text-xs text-muted-foreground">{helpText}</p>}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 py-1.5 border-b last:border-b-0">
                <div className="flex-1 min-w-0">{renderRow(item, i)}</div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => onRemove(i)}
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
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
