'use client'

import { useRef, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  FileText, Upload, Download, Trash2, FileCheck, FileWarning, FileArchive,
} from 'lucide-react'
import {
  useJobDocuments,
  useUploadJobDocument,
  useDeleteJobDocument,
} from '@/lib/hooks/use-job-documents'
import { JobDocumentsService } from '@/lib/supabase/job-documents'
import type { JobDocumentCategory } from '@/types/database'

interface JobDocumentsProps {
  jobId: string
}

const CATEGORY_LABEL: Record<JobDocumentCategory, string> = {
  permit: 'Permit',
  manifest: 'Disposal manifest',
  clearance: 'Clearance report',
  air_monitoring: 'Air monitoring',
  insurance: 'Insurance (COI)',
  regulatory: 'Regulatory notification',
  customer_signoff: 'Customer sign-off',
  correspondence: 'Correspondence',
  video: 'Video',
  other: 'Other',
}

const CATEGORY_BADGE: Record<JobDocumentCategory, string> = {
  permit: 'bg-blue-100 text-blue-700',
  manifest: 'bg-amber-100 text-amber-700',
  clearance: 'bg-green-100 text-green-700',
  air_monitoring: 'bg-teal-100 text-teal-700',
  insurance: 'bg-purple-100 text-purple-700',
  regulatory: 'bg-red-100 text-red-700',
  customer_signoff: 'bg-indigo-100 text-indigo-700',
  correspondence: 'bg-gray-100 text-gray-700',
  video: 'bg-pink-100 text-pink-700',
  other: 'bg-gray-100 text-gray-600',
}

function iconForMime(mime: string | null | undefined) {
  if (!mime) return FileText
  if (mime.startsWith('image/')) return FileCheck
  if (mime === 'application/pdf') return FileWarning
  if (mime.includes('zip') || mime.includes('compressed')) return FileArchive
  return FileText
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function JobDocuments({ jobId }: JobDocumentsProps) {
  const { data: documents = [], isLoading, error } = useJobDocuments(jobId)
  const upload = useUploadJobDocument(jobId)
  const remove = useDeleteJobDocument(jobId)

  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingCategory, setPendingCategory] = useState<JobDocumentCategory>('other')
  const [pendingNotes, setPendingNotes] = useState('')
  const [filterCategory, setFilterCategory] = useState<JobDocumentCategory | 'all'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const visibleDocs = useMemo(() => {
    if (filterCategory === 'all') return documents
    return documents.filter((d) => d.category === filterCategory)
  }, [documents, filterCategory])

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    // Best-effort category inference — MIME wins for videos (authoritative),
    // filename keywords for the paperwork categories.
    const name = file.name.toLowerCase()
    if (file.type.startsWith('video/')) setPendingCategory('video')
    else if (name.includes('permit')) setPendingCategory('permit')
    else if (name.includes('manifest')) setPendingCategory('manifest')
    else if (name.includes('clearance')) setPendingCategory('clearance')
    else if (name.includes('air') || name.includes('pcm') || name.includes('tem')) setPendingCategory('air_monitoring')
    else if (name.includes('coi') || name.includes('insurance')) setPendingCategory('insurance')
    else setPendingCategory('other')
  }

  const confirmUpload = async () => {
    if (!pendingFile) return
    try {
      await upload.mutateAsync({
        file: pendingFile,
        category: pendingCategory,
        notes: pendingNotes.trim() || undefined,
      })
      setPendingFile(null)
      setPendingNotes('')
      setPendingCategory('other')
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      /* toast handled in hook */
    }
  }

  const handleDownload = async (id: string, storagePath: string, fileName: string) => {
    setDownloading(id)
    try {
      const url = await JobDocumentsService.getSignedUrl(storagePath)
      // New tab so in-browser preview works for PDFs/images without
      // interrupting the page.
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Documents ({documents.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={filterCategory}
              onValueChange={(v) => setFilterCategory(v as JobDocumentCategory | 'all')}
            >
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(Object.keys(CATEGORY_LABEL) as JobDocumentCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={upload.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingFile && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
            <div className="text-sm font-medium text-blue-900">
              Ready to upload: {pendingFile.name}{' '}
              <span className="text-xs text-blue-700">({formatSize(pendingFile.size)})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select
                value={pendingCategory}
                onValueChange={(v) => setPendingCategory(v as JobDocumentCategory)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABEL) as JobDocumentCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CATEGORY_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Notes (optional)"
                value={pendingNotes}
                onChange={(e) => setPendingNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPendingFile(null)
                  setPendingNotes('')
                  if (fileRef.current) fileRef.current.value = ''
                }}
                disabled={upload.isPending}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={confirmUpload} disabled={upload.isPending}>
                {upload.isPending ? 'Uploading…' : 'Upload'}
              </Button>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive">
            Error loading documents: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : visibleDocs.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {documents.length === 0
              ? 'No documents yet. Upload permits, manifests, clearance reports, or any other job paperwork.'
              : 'No documents match this filter.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visibleDocs.map((doc) => {
              const Icon = iconForMime(doc.mime_type)
              return (
                <li key={doc.id} className="py-3 flex items-start gap-3">
                  <Icon className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="font-medium text-gray-900 hover:underline truncate text-left"
                        onClick={() => handleDownload(doc.id, doc.storage_path, doc.file_name)}
                        disabled={downloading === doc.id}
                      >
                        {doc.file_name}
                      </button>
                      <Badge className={CATEGORY_BADGE[doc.category]}>
                        {CATEGORY_LABEL[doc.category]}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {formatSize(doc.size_bytes)} ·{' '}
                      {new Date(doc.uploaded_at).toLocaleString()}
                      {doc.uploader?.full_name && ` · ${doc.uploader.full_name}`}
                    </div>
                    {doc.notes && (
                      <div className="text-xs text-gray-600 mt-1 italic">{doc.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleDownload(doc.id, doc.storage_path, doc.file_name)}
                      disabled={downloading === doc.id}
                      aria-label="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-destructive"
                      onClick={() => setDeletingId(doc.id)}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this document?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the file from storage permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingId) remove.mutate(deletingId)
                setDeletingId(null)
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
