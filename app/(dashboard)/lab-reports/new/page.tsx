'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FlaskConical, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  LAB_SAMPLE_TYPE_LABELS,
  type Lab,
  type LabSampleType,
} from '@/types/lab-reports'

interface OptionRow {
  id: string
  label: string
}

const NONE_VALUE = '__none__'

export default function NewLabReportPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [labs, setLabs] = useState<Lab[]>([])
  const [estimates, setEstimates] = useState<OptionRow[]>([])
  const [workOrders, setWorkOrders] = useState<OptionRow[]>([])
  const [invoices, setInvoices] = useState<OptionRow[]>([])
  const [customers, setCustomers] = useState<OptionRow[]>([])

  const [orderedDate, setOrderedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [labId, setLabId] = useState<string>(NONE_VALUE)
  const [sampleType, setSampleType] = useState<LabSampleType>('asbestos_bulk')
  const [sampleDescription, setSampleDescription] = useState('')
  const [siteAddress, setSiteAddress] = useState('')
  const [siteCity, setSiteCity] = useState('')
  const [siteState, setSiteState] = useState('')
  const [siteZip, setSiteZip] = useState('')
  const [estimateId, setEstimateId] = useState<string>(NONE_VALUE)
  const [workOrderId, setWorkOrderId] = useState<string>(NONE_VALUE)
  const [invoiceId, setInvoiceId] = useState<string>(NONE_VALUE)
  const [customerId, setCustomerId] = useState<string>(NONE_VALUE)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [labDialogOpen, setLabDialogOpen] = useState(false)
  const [newLabName, setNewLabName] = useState('')
  const [newLabEmail, setNewLabEmail] = useState('')
  const [newLabPhone, setNewLabPhone] = useState('')
  const [creatingLab, setCreatingLab] = useState(false)

  const loadLabs = useCallback(async () => {
    try {
      const res = await fetch('/api/labs')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setLabs((data.labs || []).filter((l: Lab) => l.is_active))
    } catch {
      // empty list is acceptable; user can still create one inline
    }
  }, [])

  useEffect(() => {
    loadLabs()
  }, [loadLabs])

  // Pull recent items for the optional link selectors. Capped server-side
  // to recent records so the dropdowns stay snappy.
  useEffect(() => {
    const load = async () => {
      const [estRes, woRes, invRes, custRes] = await Promise.all([
        fetch('/api/estimates?limit=50').then((r) => (r.ok ? r.json() : { estimates: [] })),
        fetch('/api/work-orders?limit=50').then((r) => (r.ok ? r.json() : { work_orders: [] })),
        fetch('/api/invoices?limit=50').then((r) => (r.ok ? r.json() : { invoices: [] })),
        fetch('/api/customers?limit=50').then((r) => (r.ok ? r.json() : { customers: [] })),
      ])
      setEstimates(
        (estRes.estimates || []).map((e: { id: string; estimate_number: string; project_name: string | null }) => ({
          id: e.id,
          label: e.project_name ? `${e.estimate_number} — ${e.project_name}` : e.estimate_number,
        })),
      )
      setWorkOrders(
        (woRes.work_orders || []).map((w: { id: string; work_order_number: string }) => ({
          id: w.id,
          label: w.work_order_number,
        })),
      )
      setInvoices(
        (invRes.invoices || []).map((i: { id: string; invoice_number: string }) => ({
          id: i.id,
          label: i.invoice_number,
        })),
      )
      setCustomers(
        (custRes.customers || custRes.contacts || []).map(
          (c: { id: string; name: string; company_name: string | null }) => ({
            id: c.id,
            label: c.company_name ? `${c.company_name} (${c.name})` : c.name,
          }),
        ),
      )
    }
    load()
  }, [])

  const submit = async () => {
    if (!sampleType) {
      toast({ title: 'Pick a sample type', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/lab-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordered_date: orderedDate,
          lab_id: labId === NONE_VALUE ? null : labId,
          sample_type: sampleType,
          sample_description: sampleDescription || null,
          site_address: siteAddress || null,
          site_city: siteCity || null,
          site_state: siteState || null,
          site_zip: siteZip || null,
          estimate_id: estimateId === NONE_VALUE ? null : estimateId,
          work_order_id: workOrderId === NONE_VALUE ? null : workOrderId,
          invoice_id: invoiceId === NONE_VALUE ? null : invoiceId,
          customer_id: customerId === NONE_VALUE ? null : customerId,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to create')
      const created = await res.json()
      toast({ title: 'Lab report created', description: created.report_number })
      router.push(`/lab-reports/${created.id}`)
    } catch {
      toast({ title: 'Could not create lab report', variant: 'destructive' })
      setSubmitting(false)
    }
  }

  const createLab = async () => {
    if (!newLabName.trim()) return
    setCreatingLab(true)
    try {
      const res = await fetch('/api/labs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLabName.trim(),
          contact_email: newLabEmail.trim() || null,
          contact_phone: newLabPhone.trim() || null,
        }),
      })
      if (!res.ok) throw new Error()
      const created = (await res.json()) as Lab
      setLabs((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setLabId(created.id)
      setLabDialogOpen(false)
      setNewLabName('')
      setNewLabEmail('')
      setNewLabPhone('')
    } catch {
      toast({ title: 'Could not save lab', variant: 'destructive' })
    } finally {
      setCreatingLab(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild aria-label="Back to lab reports">
          <Link href="/lab-reports">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FlaskConical className="h-6 w-6" />
          New Lab Report
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sample details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ordered-date">Date ordered</Label>
              <Input
                id="ordered-date"
                type="date"
                value={orderedDate}
                onChange={(e) => setOrderedDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Lab</Label>
              <div className="flex gap-2">
                <Select value={labId} onValueChange={setLabId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pick a lab" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>—</SelectItem>
                    {labs.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={() => setLabDialogOpen(true)} aria-label="Add lab">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Sample type</Label>
              <Select value={sampleType} onValueChange={(v) => setSampleType(v as LabSampleType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LAB_SAMPLE_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sample-description">Sample description</Label>
              <Input
                id="sample-description"
                value={sampleDescription}
                onChange={(e) => setSampleDescription(e.target.value)}
                placeholder="e.g. Bulk sample, drywall texture, master bedroom"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="site-address">Street</Label>
            <Input
              id="site-address"
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="123 Main St"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="site-city">City</Label>
              <Input id="site-city" value={siteCity} onChange={(e) => setSiteCity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-state">State</Label>
              <Input
                id="site-state"
                value={siteState}
                onChange={(e) => setSiteState(e.target.value)}
                maxLength={2}
                placeholder="WA"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="site-zip">ZIP</Label>
              <Input id="site-zip" value={siteZip} onChange={(e) => setSiteZip(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Linked records (optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>—</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estimate</Label>
              <Select value={estimateId} onValueChange={setEstimateId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>—</SelectItem>
                  {estimates.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Work Order</Label>
              <Select value={workOrderId} onValueChange={setWorkOrderId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>—</SelectItem>
                  {workOrders.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice</Label>
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>—</SelectItem>
                  {invoices.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any internal context the lab won't capture in the report itself."
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild disabled={submitting}>
          <Link href="/lab-reports">Cancel</Link>
        </Button>
        <Button onClick={submit} disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create lab report
        </Button>
      </div>

      <Dialog open={labDialogOpen} onOpenChange={setLabDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a lab</DialogTitle>
            <DialogDescription>
              The lab analysing this sample. You can edit details later under Settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="lab-name">Lab name</Label>
              <Input
                id="lab-name"
                value={newLabName}
                onChange={(e) => setNewLabName(e.target.value)}
                placeholder="e.g. EMSL Analytical"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lab-email">Contact email</Label>
                <Input
                  id="lab-email"
                  type="email"
                  value={newLabEmail}
                  onChange={(e) => setNewLabEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lab-phone">Contact phone</Label>
                <Input
                  id="lab-phone"
                  value={newLabPhone}
                  onChange={(e) => setNewLabPhone(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLabDialogOpen(false)} disabled={creatingLab}>
              Cancel
            </Button>
            <Button onClick={createLab} disabled={creatingLab || !newLabName.trim()}>
              {creatingLab && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save lab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
