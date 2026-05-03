'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
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
  Image as ImageIcon, Play,
} from 'lucide-react'
import {
  useWorkOrderDocuments,
  useUploadWorkOrderDocument,
  useDeleteWorkOrderDocument,
} from '@/lib/hooks/use-work-order-documents'
import {
  WorkOrderDocumentsService,
  type WorkOrderDocumentWithUploader,
} from '@/lib/supabase/work-order-documents'
import type { WorkOrderDocumentCategory } from '@/types/work-orders'

interface WorkOrderDocumentsProps {
  workOrderId: string
}

const CATEGORY_LABEL: Record<WorkOrderDocumentCategory, string> = {
  sds: 'Safety Data Sheet',
  manual: 'Manual',
  access: 'Site access',
  pre_work: 'Pre-work / site',
  signed_acknowledgment: 'Signed acknowledgment',
  other: 'Other',
}

const CATEGORY_BADGE: Record<WorkOrderDocumentCategory, string> = {
  sds: 'bg-red-100 text-red-700',
  manual: 'bg-blue-100 text-blue-700',
  access: 'bg-amber-100 text-amber-700',
  pre_work: 'bg-teal-100 text-teal-700',
  signed_acknowledgment: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-600',
}

function isImage(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith('image/')
}

function isVideo(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith('video/')
}

function iconForMime(mime: string | null | undefined) {
  if (isImage(mime)) return ImageIcon
  if (isVideo(mime)) return Play
  if (!mime) return FileText
  if (mime === 'application/pdf') return FileWarning
  if (mime.includes('zip') || mime.includes('compressed')) return FileArchive
  return FileCheck
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Best-effort category inference from filename + MIME. Photos and videos
// land in pre_work since that's the most common reason to attach media
// to a dispatch sheet (site as-found, access path, etc.). The user can
// always override before confirming.
function inferCategory(file: File): WorkOrderDocumentCategory {
  const name = file.name.toLowerCase()
  if (file.type.startsWith('image/') || file.type.startsWith('video/')) return 'pre_work'
  if (name.includes('sds') || name.includes('safety')) return 'sds'
  if (name.includes('manual') || name.includes('guide')) return 'manual'
  if (name.includes('access') || name.includes('gate') || name.includes('lockbox')) return 'access'
  if (name.includes('signed') || name.includes('ack')) return 'signed_acknowledgment'
  return 'other'
}

interface PendingItem {
  file: File
  category: WorkOrderDocumentCategory
  notes: string
}

function ThumbnailPreview({ doc }: { doc: WorkOrderDocumentWithUploader }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!isImage(doc.mime_type)) return
    WorkOrderDocumentsService.getSignedUrl(doc.storage_path).then(
      (signed) => {
        if (!cancelled) setUrl(signed)
      },
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [doc.storage_path, doc.mime_type])

  if (isImage(doc.mime_type)) {
    return (
      <div className="h-12 w-12 rounded-md overflow-hidden border bg-muted flex-shrink-0 flex items-center justify-center">
        {url ? (
          // Inline thumbnail. eslint-disable for next/image — these are
          // user-uploaded files behind signed URLs, not optimizable
          // through next/image's loader.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={doc.file_name} className="h-full w-full object-cover" />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
    )
  }

  if (isVideo(doc.mime_type)) {
    return (
      <div className="h-12 w-12 rounded-md border bg-muted flex-shrink-0 flex items-center justify-center">
        <Play className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }

  const Icon = iconForMime(doc.mime_type)
  return (
    <div className="h-12 w-12 rounded-md border bg-muted flex-shrink-0 flex items-center justify-center">
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
  )
}

export function WorkOrderDocuments({ workOrderId }: WorkOrderDocumentsProps) {
  const { data: documents = [], isLoading, error } = useWorkOrderDocuments(workOrderId)
  const upload = useUploadWorkOrderDocument(workOrderId)
  const remove = useDeleteWorkOrderDocument(workOrderId)

  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<PendingItem[]>([])
  const [filterCategory, setFilterCategory] = useState<WorkOrderDocumentCategory | 'all'>(
    'all',
  )
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const visibleDocs = useMemo(() => {
    if (filterCategory === 'all') return documents
    return documents.filter((d) => d.category === filterCategory)
  }, [documents, filterCategory])

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setPending((prev) => [
      ...prev,
      ...files.map((file) => ({
        file,
        category: inferCategory(file),
        notes: '',
      })),
    ])
    if (fileRef.current) fileRef.current.value = ''
  }

  const updatePending = (index: number, patch: Partial<PendingItem>) => {
    setPending((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)))
  }

  const removePending = (index: number) => {
    setPending((prev) => prev.filter((_, i) => i !== index))
  }

  const confirmUpload = async () => {
    if (pending.length === 0) return
    // Sequential upload — keeps signed-URL slot pressure low and makes
    // partial-failure recovery obvious (the failed entries stay queued).
    const remaining: PendingItem[] = []
    for (const item of pending) {
      try {
        await upload.mutateAsync({
          file: item.file,
          category: item.category,
          notes: item.notes.trim() || undefined,
        })
      } catch {
        remaining.push(item)
      }
    }
    setPending(remaining)
  }

  const handleDownload = async (id: string, storagePath: string, fileName: string) => {
    setDownloading(id)
    try {
      const url = await WorkOrderDocumentsService.getSignedUrl(storagePath)
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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            Documents &amp; Media ({documents.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select
              value={filterCategory}
              onValueChange={(v) =>
                setFilterCategory(v as WorkOrderDocumentCategory | 'all')
              }
            >
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {(Object.keys(CATEGORY_LABEL) as WorkOrderDocumentCategory[]).map((c) => (
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
              Attach files
            </Button>
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="*/*"
              className="hidden"
              onChange={handleFilesSelected}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {pending.length > 0 && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-3">
            <div className="text-sm font-medium text-blue-900">
              Ready to attach: {pending.length} file{pending.length === 1 ? '' : 's'}
            </div>
            <div className="space-y-2">
              {pending.map((item, idx) => (
                <div
                  key={`${item.file.name}-${idx}`}
                  className="grid grid-cols-1 md:grid-cols-[1fr_180px_1fr_auto] gap-2 items-center"
                >
                  <div className="text-sm truncate">
                    <span className="font-medium">{item.file.name}</span>{' '}
                    <span className="text-xs text-blue-700">
                      ({formatSize(item.file.size)})
                    </span>
                  </div>
                  <Select
                    value={item.category}
                    onValueChange={(v) =>
                      updatePending(idx, { category: v as WorkOrderDocumentCategory })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CATEGORY_LABEL) as WorkOrderDocumentCategory[]).map(
                        (c) => (
                          <SelectItem key={c} value={c}>
                            {CATEGORY_LABEL[c]}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Notes (optional)"
                    value={item.notes}
                    onChange={(e) => updatePending(idx, { notes: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removePending(idx)}
                    disabled={upload.isPending}
                    aria-label="Remove from queue"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPending([])}
                disabled={upload.isPending}
              >
                Cancel all
              </Button>
              <Button size="sm" onClick={confirmUpload} disabled={upload.isPending}>
                {upload.isPending ? 'Uploading…' : `Attach ${pending.length} file${pending.length === 1 ? '' : 's'}`}
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
              ? 'No documents yet. Attach SDS sheets, manuals, access info, or photos/videos the crew needs in the field.'
              : 'No documents match this filter.'}
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visibleDocs.map((doc) => (
              <li key={doc.id} className="py-3 flex items-start gap-3">
                <ThumbnailPreview doc={doc} />
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
                    className="h-8 w-8"
                    onClick={() => setDeletingId(doc.id)}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <AlertDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this document?</AlertDialogTitle>
            <AlertDialogDescription>
              The file is deleted from storage and the record is removed.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingId) {
                  await remove.mutateAsync(deletingId)
                  setDeletingId(null)
                }
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
