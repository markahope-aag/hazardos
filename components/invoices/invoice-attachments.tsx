'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Paperclip, FlaskConical, Loader2, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { LAB_SAMPLE_TYPE_LABELS, type LabSampleType } from '@/types/lab-reports'

const CATEGORY_LABEL: Record<string, string> = {
  permit: 'Permit',
  manifest: 'Waste manifest',
  clearance: 'Clearance report',
  air_monitoring: 'Air monitoring',
  insurance: 'Insurance (COI)',
  regulatory: 'Regulatory notification',
  customer_signoff: 'Customer sign-off',
  correspondence: 'Correspondence',
  video: 'Video',
  daily_log: 'Daily log',
  opp: 'OPP',
  other: 'Other',
}

interface JobDocument {
  id: string
  file_name: string
  category: string
  mime_type: string | null
  size_bytes: number | null
  uploaded_at: string
  notes: string | null
}

interface AttachmentRow {
  job_document_id: string
  attached_at: string
  document: JobDocument | null
}

interface AttachedLabReport {
  id: string
  report_number: string
  file_name: string | null
  sample_type: LabSampleType
  received_date: string | null
  mime_type: string | null
  size_bytes: number | null
}

interface AvailableLabReport {
  id: string
  report_number: string
  file_name: string | null
  sample_type: LabSampleType
  sample_description: string | null
  ordered_date: string
  received_date: string | null
  invoice_id: string | null
  customer_id: string | null
}

interface Props {
  invoiceId: string
  jobId: string | null
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function InvoiceAttachments({ invoiceId, jobId }: Props) {
  const { toast } = useToast()
  const [attachments, setAttachments] = useState<AttachmentRow[]>([])
  const [attachedLabReports, setAttachedLabReports] = useState<AttachedLabReport[]>([])
  const [availableDocs, setAvailableDocs] = useState<JobDocument[]>([])
  const [availableLabReports, setAvailableLabReports] = useState<AvailableLabReport[]>([])
  const [hasLinkedJob, setHasLinkedJob] = useState<boolean>(!!jobId)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set())
  const [selectedLabs, setSelectedLabs] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/attachments`)
      if (!res.ok) throw new Error('Failed to load attachments')
      const data = await res.json()
      setAttachments(data.attachments || [])
      setAttachedLabReports(data.lab_reports || [])
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  const openPicker = async () => {
    setSelectedDocs(new Set(attachments.map((a) => a.job_document_id)))
    setSelectedLabs(new Set(attachedLabReports.map((l) => l.id)))
    setDialogOpen(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/available-documents`)
      if (!res.ok) throw new Error('Failed to load documents')
      const data = await res.json()
      setAvailableDocs(data.documents || [])
      setAvailableLabReports(data.lab_reports || [])
      setHasLinkedJob(!!data.has_linked_job)
    } catch {
      toast({ title: 'Could not load documents', variant: 'destructive' })
    }
  }

  const toggleDoc = (id: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleLab = (id: string) => {
    setSelectedLabs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const [docsRes, labsRes] = await Promise.all([
        fetch(`/api/invoices/${invoiceId}/attachments`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_document_ids: Array.from(selectedDocs) }),
        }),
        fetch(`/api/invoices/${invoiceId}/lab-reports`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lab_report_ids: Array.from(selectedLabs) }),
        }),
      ])
      if (!docsRes.ok || !labsRes.ok) throw new Error('Failed to save')
      toast({ title: 'Attachments updated' })
      setDialogOpen(false)
      await fetchAttachments()
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const totalAttached = attachments.length + attachedLabReports.length

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
          </CardTitle>
          <Button size="sm" variant="outline" onClick={openPicker}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Manage
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          ) : totalAttached === 0 ? (
            <p className="text-sm text-muted-foreground">
              No files attached. Pick lab reports or job documents — they&apos;ll be sent with the invoice email.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {attachedLabReports.map((l) => (
                <li
                  key={`lab-${l.id}`}
                  className="flex items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <FlaskConical className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <Link
                        href={`/lab-reports/${l.id}`}
                        className="font-medium text-primary hover:underline truncate"
                      >
                        {l.report_number}
                      </Link>
                      {l.file_name && (
                        <span className="text-xs text-muted-foreground truncate">
                          {l.file_name}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {LAB_SAMPLE_TYPE_LABELS[l.sample_type]}
                      {l.size_bytes ? ` · ${formatSize(l.size_bytes)}` : ''}
                    </div>
                  </div>
                </li>
              ))}
              {attachments.map((a) =>
                a.document ? (
                  <li
                    key={`doc-${a.job_document_id}`}
                    className="flex items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{a.document.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {CATEGORY_LABEL[a.document.category] ?? 'Other'}
                        {a.document.size_bytes ? ` · ${formatSize(a.document.size_bytes)}` : ''}
                      </div>
                    </div>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Attach files to this invoice</DialogTitle>
            <DialogDescription>
              Selected files will be attached to the invoice email.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2 space-y-6">
            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <FlaskConical className="h-3 w-3" />
                Lab reports
              </h4>
              {availableLabReports.length === 0 ? (
                <div className="rounded border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-muted-foreground">
                  No lab reports available.{' '}
                  <Link href="/lab-reports/new" className="underline">
                    Add one →
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  {availableLabReports.map((r) => {
                    const id = `inv-lab-${r.id}`
                    const checked = selectedLabs.has(r.id)
                    return (
                      <Label
                        key={r.id}
                        htmlFor={id}
                        className={`flex items-start gap-3 rounded border px-3 py-2 cursor-pointer ${
                          checked
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={() => toggleLab(r.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">
                            {r.report_number}
                            {r.file_name && (
                              <span className="text-xs text-muted-foreground ml-2">
                                {r.file_name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {LAB_SAMPLE_TYPE_LABELS[r.sample_type]}
                            {r.received_date
                              ? ` · received ${new Date(r.received_date).toLocaleDateString()}`
                              : ''}
                          </div>
                        </div>
                      </Label>
                    )
                  })}
                </div>
              )}
            </section>

            <section>
              <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                Job documents
              </h4>
              {!hasLinkedJob ? (
                <div className="rounded border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-muted-foreground">
                  This invoice isn&apos;t linked to a job, so no job documents are available.
                </div>
              ) : availableDocs.length === 0 ? (
                <div className="rounded border border-dashed border-gray-200 px-3 py-4 text-center text-sm text-muted-foreground">
                  No documents on the linked job yet.{' '}
                  {jobId && (
                    <Link href={`/jobs/${jobId}`} className="underline">
                      Open the job to upload one →
                    </Link>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  {availableDocs.map((doc) => {
                    const id = `inv-doc-${doc.id}`
                    const checked = selectedDocs.has(doc.id)
                    return (
                      <Label
                        key={doc.id}
                        htmlFor={id}
                        className={`flex items-start gap-3 rounded border px-3 py-2 cursor-pointer ${
                          checked
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <Checkbox
                          id={id}
                          checked={checked}
                          onCheckedChange={() => toggleDoc(doc.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{doc.file_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {CATEGORY_LABEL[doc.category] ?? 'Other'}
                            {doc.size_bytes ? ` · ${formatSize(doc.size_bytes)}` : ''}
                          </div>
                        </div>
                      </Label>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t pt-4">
            <span className="text-xs text-muted-foreground">
              {selectedDocs.size + selectedLabs.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Save selection
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
