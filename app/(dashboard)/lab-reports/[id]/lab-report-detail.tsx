'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FlaskConical,
  Upload,
  Download,
  Trash2,
  Loader2,
  FileText,
  Ban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useToast } from '@/components/ui/use-toast'
import {
  LAB_REPORT_STATUS_CONFIG,
  LAB_SAMPLE_TYPE_LABELS,
  type LabReportWithRelations,
} from '@/types/lab-reports'

interface Props {
  report: LabReportWithRelations
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function LabReportDetail({ report: initial }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [report, setReport] = useState<LabReportWithRelations>(initial)
  const [uploading, setUploading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const statusConfig = LAB_REPORT_STATUS_CONFIG[report.status]

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/lab-reports/${report.id}/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const updated = await res.json()
      setReport((prev) => ({ ...prev, ...updated }))
      toast({ title: 'Lab report uploaded', description: file.name })
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const downloadFile = async () => {
    if (!report.file_name) return
    setDownloading(true)
    try {
      const res = await fetch(`/api/lab-reports/${report.id}/file`)
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { url: string; file_name: string | null }
      const a = document.createElement('a')
      a.href = data.url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.download = data.file_name || report.file_name || 'lab-report'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast({ title: 'Could not open file', variant: 'destructive' })
    } finally {
      setDownloading(false)
    }
  }

  const cancelReport = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/lab-reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setReport((prev) => ({ ...prev, ...updated }))
      toast({ title: 'Lab report cancelled' })
    } catch {
      toast({ title: 'Could not cancel', variant: 'destructive' })
    } finally {
      setBusy(false)
    }
  }

  const deleteReport = async () => {
    setBusy(true)
    try {
      const res = await fetch(`/api/lab-reports/${report.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      toast({ title: 'Lab report deleted' })
      router.push('/lab-reports')
    } catch {
      toast({ title: 'Could not delete', variant: 'destructive' })
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild aria-label="Back to lab reports">
            <Link href="/lab-reports">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FlaskConical className="h-6 w-6" />
              {report.report_number}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                {statusConfig.label}
              </Badge>
              <Badge variant="outline">{LAB_SAMPLE_TYPE_LABELS[report.sample_type]}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {report.status !== 'cancelled' && (
            <Button variant="outline" onClick={cancelReport} disabled={busy}>
              <Ban className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          <Button variant="outline" onClick={() => setConfirmDelete(true)} disabled={busy}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lab report file</CardTitle>
            </CardHeader>
            <CardContent>
              {report.file_name ? (
                <div className="rounded-md border border-gray-200 p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{report.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatSize(report.size_bytes)}
                        {report.received_date && ` · received ${new Date(report.received_date).toLocaleDateString()}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button variant="outline" onClick={downloadFile} disabled={downloading}>
                      {downloading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Open
                    </Button>
                    <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                      {uploading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4 mr-2" />
                      )}
                      Replace
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-gray-300 p-6 text-center">
                  <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">
                    No file attached yet. Upload the report when it comes back from the lab.
                  </p>
                  <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Upload file
                  </Button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,image/*,.doc,.docx"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sample</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Type</div>
                <div className="mt-0.5">{LAB_SAMPLE_TYPE_LABELS[report.sample_type]}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Date ordered</div>
                <div className="mt-0.5">{new Date(report.ordered_date).toLocaleDateString()}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Description</div>
                <div className="mt-0.5">{report.sample_description || '—'}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-muted-foreground text-xs uppercase tracking-wide">Source address</div>
                <div className="mt-0.5">
                  {report.site_address ? (
                    <>
                      {report.site_address}
                      {(report.site_city || report.site_state || report.site_zip) && (
                        <>
                          {', '}
                          {[report.site_city, report.site_state, report.site_zip]
                            .filter(Boolean)
                            .join(' ')}
                        </>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {report.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{report.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lab</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-1">
              {report.lab ? (
                <>
                  <div className="font-medium">{report.lab.name}</div>
                </>
              ) : (
                <span className="text-muted-foreground">No lab assigned</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked records</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {report.customer ? (
                <Row label="Customer">
                  <Link
                    href={`/customers/${report.customer.id}`}
                    className="text-primary hover:underline"
                  >
                    {report.customer.company_name || report.customer.name}
                  </Link>
                </Row>
              ) : null}
              {report.estimate ? (
                <Row label="Estimate">
                  <Link
                    href={`/estimates/${report.estimate.id}`}
                    className="text-primary hover:underline"
                  >
                    {report.estimate.estimate_number}
                    {report.estimate.project_name ? ` — ${report.estimate.project_name}` : ''}
                  </Link>
                </Row>
              ) : null}
              {report.work_order ? (
                <Row label="Work Order">
                  <Link
                    href={`/work-orders/${report.work_order.id}`}
                    className="text-primary hover:underline"
                  >
                    {report.work_order.work_order_number}
                  </Link>
                </Row>
              ) : null}
              {report.invoice ? (
                <Row label="Invoice">
                  <Link
                    href={`/invoices/${report.invoice.id}`}
                    className="text-primary hover:underline"
                  >
                    {report.invoice.invoice_number}
                  </Link>
                </Row>
              ) : null}
              {!report.customer && !report.estimate && !report.work_order && !report.invoice && (
                <span className="text-muted-foreground">No records linked</span>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this lab report?</AlertDialogTitle>
            <AlertDialogDescription>
              The record and any uploaded file will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={deleteReport}
              disabled={busy}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right">{children}</span>
    </div>
  )
}
