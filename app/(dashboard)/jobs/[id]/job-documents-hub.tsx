'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  FileText, Upload, Download, Trash2, ExternalLink, FileWarning, Calculator,
  ClipboardList, FlaskConical, Shield, ClipboardCheck,
} from 'lucide-react'
import { JobDocuments } from './job-documents'
import {
  useJobDocuments,
  useUploadJobDocument,
  useDeleteJobDocument,
} from '@/lib/hooks/use-job-documents'
import { JobDocumentsService } from '@/lib/supabase/job-documents'
import type { JobDocumentCategory } from '@/types/database'

interface ProjectLink {
  id: string
  label: string
}

interface JobDocumentsHubProps {
  jobId: string
  survey: ProjectLink | null
  estimate: ProjectLink | null
  workOrder: ProjectLink | null
}

function formatSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * One category-pinned upload + list card. Used for the dedicated
 * Waste Manifest, Occupant Protection Plan, and Daily Log sections —
 * keeps the upload affordance one click away and filters the doc
 * list to the relevant rows so the user doesn't have to scan.
 */
function CategoryDocsCard({
  jobId,
  category,
  title,
  icon,
  description,
  emptyText,
}: {
  jobId: string
  category: JobDocumentCategory
  title: string
  icon: React.ReactNode
  description: string
  emptyText: string
}) {
  const { data: allDocuments = [], isLoading } = useJobDocuments(jobId)
  const upload = useUploadJobDocument(jobId)
  const remove = useDeleteJobDocument(jobId)

  const docs = useMemo(
    () => allDocuments.filter((d) => d.category === category),
    [allDocuments, category],
  )

  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingNotes, setPendingNotes] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setPendingFile(file)
  }

  const confirmUpload = async () => {
    if (!pendingFile) return
    try {
      await upload.mutateAsync({
        file: pendingFile,
        category,
        notes: pendingNotes.trim() || undefined,
      })
      setPendingFile(null)
      setPendingNotes('')
      if (fileRef.current) fileRef.current.value = ''
    } catch {
      /* toast handled in hook */
    }
  }

  const handleDownload = async (id: string, storagePath: string, fileName: string) => {
    setDownloading(id)
    try {
      const url = await JobDocumentsService.getSignedUrl(storagePath)
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
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {icon}
              {title}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                ({docs.length})
              </span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
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
            onChange={onFile}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingFile && (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 space-y-2">
            <div className="text-sm font-medium text-blue-900">
              Ready to upload: {pendingFile.name}{' '}
              <span className="text-xs text-blue-700">
                ({formatSize(pendingFile.size)})
              </span>
            </div>
            <Input
              placeholder="Notes (optional)"
              value={pendingNotes}
              onChange={(e) => setPendingNotes(e.target.value)}
            />
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

        {isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">{emptyText}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {docs.map((doc) => (
              <li key={doc.id} className="py-2 flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    className="font-medium text-gray-900 hover:underline truncate text-left block"
                    onClick={() => handleDownload(doc.id, doc.storage_path, doc.file_name)}
                    disabled={downloading === doc.id}
                  >
                    {doc.file_name}
                  </button>
                  <div className="text-xs text-gray-500">
                    {formatSize(doc.size_bytes)} ·{' '}
                    {new Date(doc.uploaded_at).toLocaleString()}
                    {doc.uploader?.full_name && ` · ${doc.uploader.full_name}`}
                  </div>
                  {doc.notes && (
                    <div className="text-xs text-gray-600 mt-0.5 italic">{doc.notes}</div>
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
              This deletes the file from storage permanently and cannot be undone.
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

function ProjectLinkRow({
  href,
  icon,
  label,
  detail,
}: {
  href: string
  icon: React.ReactNode
  label: string
  detail: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-md border bg-background p-3 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-muted p-2">{icon}</div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{detail}</div>
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground" />
    </Link>
  )
}

export function JobDocumentsHub({
  jobId,
  survey,
  estimate,
  workOrder,
}: JobDocumentsHubProps) {
  // The job is the canonical project record — link out to every other
  // record that belongs to the same project so the office manager can
  // navigate the whole flow without bouncing to index pages.
  const hasAnyProjectLink = !!(survey || estimate || workOrder)

  return (
    <div className="space-y-6">
      {hasAnyProjectLink && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4" />
              Project records
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              The job is the canonical record — these are the related documents
              from earlier in the workflow.
            </p>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {survey ? (
              <ProjectLinkRow
                href={`/site-surveys/${survey.id}`}
                icon={<FileText className="h-4 w-4" />}
                label="Source survey"
                detail={survey.label}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                No source survey
              </div>
            )}
            {estimate ? (
              <ProjectLinkRow
                href={`/estimates/${estimate.id}`}
                icon={<Calculator className="h-4 w-4" />}
                label="Estimate"
                detail={estimate.label}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                <Calculator className="h-4 w-4" />
                No estimate linked
              </div>
            )}
            {workOrder ? (
              <ProjectLinkRow
                href={`/work-orders/${workOrder.id}`}
                icon={<ClipboardList className="h-4 w-4" />}
                label="Work order"
                detail={workOrder.label}
              />
            ) : (
              <div className="flex items-center gap-3 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                <ClipboardList className="h-4 w-4" />
                No work order yet
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pinned compliance documents — Waste Manifest is the EPA chain-
          of-custody paper that has to follow the disposal load; OPP is
          required for occupied-building work. Both deserve a fixed
          home so the office can find them in two clicks. */}
      <CategoryDocsCard
        jobId={jobId}
        category="manifest"
        title="Waste Manifests"
        icon={<FileWarning className="h-4 w-4" />}
        description="EPA waste shipment paperwork attached at end of job."
        emptyText="No waste manifests uploaded yet."
      />

      <CategoryDocsCard
        jobId={jobId}
        category="opp"
        title="Occupant Protection Plan (OPP)"
        icon={<Shield className="h-4 w-4" />}
        description="Required for abatement work in occupied buildings."
        emptyText="No OPP uploaded yet."
      />

      <CategoryDocsCard
        jobId={jobId}
        category="daily_log"
        title="Daily Logs"
        icon={<FlaskConical className="h-4 w-4" />}
        description="Crew shift logs — hours worked, area covered, photos, incidents."
        emptyText="No daily logs uploaded yet."
      />

      {/* Everything else — permits, clearance reports, air monitoring,
          insurance, customer sign-offs, correspondence, video, other.
          Excludes the categories rendered above so they aren't double-listed. */}
      <JobDocuments
        jobId={jobId}
        title="Other documents"
        excludeCategories={['manifest', 'opp', 'daily_log']}
        emptyHint="No other documents yet. Upload permits, clearance reports, COIs, photos, or anything else."
      />
    </div>
  )
}
