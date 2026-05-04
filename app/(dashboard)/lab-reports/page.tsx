'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { FlaskConical, Plus, Search, Filter, FileText, Upload, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { LocationFilter, type LocationFilterValue } from '@/components/locations/location-filter'
import {
  LAB_REPORT_STATUS_CONFIG,
  LAB_SAMPLE_TYPE_LABELS,
  type LabReportWithRelations,
  type LabReportStatus,
  type LabSampleType,
} from '@/types/lab-reports'

export default function LabReportsPage() {
  const { toast } = useToast()
  const [reports, setReports] = useState<LabReportWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<LabReportStatus | 'all'>('all')
  const [sampleTypeFilter, setSampleTypeFilter] = useState<LabSampleType | 'all'>('all')
  const [locationFilter, setLocationFilter] = useState<LocationFilterValue>('all')
  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingUploadIdRef = useRef<string | null>(null)

  const triggerUpload = (reportId: string) => {
    pendingUploadIdRef.current = reportId
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    const reportId = pendingUploadIdRef.current
    pendingUploadIdRef.current = null
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (!file || !reportId) return

    setUploadingId(reportId)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/lab-reports/${reportId}/upload`, {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Upload failed')
      const updated = await res.json()
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, ...updated } : r)),
      )
      toast({ title: 'Lab report uploaded', description: file.name })
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' })
    } finally {
      setUploadingId(null)
    }
  }

  const openFile = async (reportId: string, fileName: string | null) => {
    setDownloadingId(reportId)
    try {
      const res = await fetch(`/api/lab-reports/${reportId}/file`)
      if (!res.ok) throw new Error()
      const data = (await res.json()) as { url: string; file_name: string | null }
      const a = document.createElement('a')
      a.href = data.url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.download = data.file_name || fileName || 'lab-report'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast({ title: 'Could not open file', variant: 'destructive' })
    } finally {
      setDownloadingId(null)
    }
  }

  const loadReports = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (sampleTypeFilter !== 'all') params.set('sample_type', sampleTypeFilter)
      if (locationFilter !== 'all') params.set('location_id', locationFilter)

      const res = await fetch(`/api/lab-reports?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch lab reports')
      const data = await res.json()
      setReports(data.lab_reports || [])
    } catch {
      toast({
        title: 'Error',
        description: 'Could not load lab reports.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, sampleTypeFilter, locationFilter, toast])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return reports
    const q = searchQuery.toLowerCase()
    return reports.filter((r) => {
      const haystack = [
        r.report_number,
        r.sample_description,
        r.site_address,
        r.site_city,
        r.site_state,
        r.site_zip,
        r.lab?.name,
        r.estimate?.estimate_number,
        r.estimate?.project_name,
        r.work_order?.work_order_number,
        r.invoice?.invoice_number,
        r.customer?.company_name,
        r.customer?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [reports, searchQuery])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6" />
            Lab Reports
          </h1>
          <p className="text-muted-foreground">
            Track samples sent to outside labs and attach the returned reports.
          </p>
        </div>
        <Button asChild>
          <Link href="/lab-reports/new">
            <Plus className="h-4 w-4 mr-2" />
            New Lab Report
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address, lab, sample, estimate, work order, invoice…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search lab reports"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LabReportStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={sampleTypeFilter}
          onValueChange={(v) => setSampleTypeFilter(v as LabSampleType | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sample Types</SelectItem>
            {Object.entries(LAB_SAMPLE_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <LocationFilter value={locationFilter} onChange={setLocationFilter} />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report #</TableHead>
              <TableHead>Ordered</TableHead>
              <TableHead>Lab</TableHead>
              <TableHead>Sample</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Linked</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">File</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Loading lab reports…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <p className="text-muted-foreground">No lab reports found</p>
                  <Button asChild variant="link" className="mt-2">
                    <Link href="/lab-reports/new">Create your first lab report</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => {
                const statusConfig = LAB_REPORT_STATUS_CONFIG[r.status]
                const links: { label: string; href: string }[] = []
                if (r.estimate) {
                  links.push({
                    label: r.estimate.estimate_number,
                    href: `/estimates/${r.estimate.id}`,
                  })
                }
                if (r.work_order) {
                  links.push({
                    label: r.work_order.work_order_number,
                    href: `/work-orders/${r.work_order.id}`,
                  })
                }
                if (r.invoice) {
                  links.push({
                    label: r.invoice.invoice_number,
                    href: `/invoices/${r.invoice.id}`,
                  })
                }

                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Link
                        href={`/lab-reports/${r.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {r.report_number}
                      </Link>
                    </TableCell>
                    <TableCell>{new Date(r.ordered_date).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{r.lab?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {LAB_SAMPLE_TYPE_LABELS[r.sample_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-sm">
                      {r.site_address ? (
                        <>
                          {r.site_address}
                          {r.site_city ? `, ${r.site_city}` : ''}
                          {r.site_state ? `, ${r.site_state}` : ''}
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {links.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {links.map((l) => (
                            <Link
                              key={l.href}
                              href={l.href}
                              className="text-xs text-primary hover:underline"
                            >
                              {l.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}
                      >
                        {statusConfig.label}
                      </Badge>
                      {r.status === 'received' && r.file_name && (
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <FileText className="h-3 w-3" />
                          <span className="truncate max-w-[140px]">{r.file_name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.file_name ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openFile(r.id, r.file_name)}
                            disabled={downloadingId === r.id}
                            aria-label={`Open ${r.file_name}`}
                            title="Open file"
                          >
                            {downloadingId === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => triggerUpload(r.id)}
                            disabled={uploadingId === r.id}
                            aria-label="Replace file"
                            title="Replace file"
                          >
                            {uploadingId === r.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      ) : r.status === 'cancelled' ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => triggerUpload(r.id)}
                          disabled={uploadingId === r.id}
                        >
                          {uploadingId === r.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-1" />
                          )}
                          Upload
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,image/*,.doc,.docx"
        onChange={handleFileSelected}
      />
    </div>
  )
}
