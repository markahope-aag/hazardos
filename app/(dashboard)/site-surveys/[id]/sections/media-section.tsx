'use client'

import { useCallback, useState, useRef } from 'react'
import { nanoid } from 'nanoid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog'
import { Camera, MapPin, Calendar, Upload, Download, Trash2, Loader2, Play, Image as ImageIcon, Video } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { createClient } from '@/lib/supabase/client'
import { uploadSurveyMediaBlob } from '@/lib/services/photo-upload-service'
import { logger, formatError } from '@/lib/utils/logger'
import { cn } from '@/lib/utils'
import type { SurveyPhotoMetadata } from '@/types/database'

interface MediaSectionProps {
  surveyId: string
  media: SurveyPhotoMetadata[] | null
  onChange: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  overview: 'Overview',
  exterior: 'Exterior',
  interior: 'Interior',
  hazard_area: 'Hazard Area',
  damage: 'Damage',
  access: 'Access Points',
  utility_access: 'Utility/Access',
  equipment: 'Equipment',
  before: 'Before',
  after: 'After',
  other: 'Other',
}

const UPLOAD_CATEGORY: string = 'other'
const MAX_VIDEO_SIZE_MB = 250

function isVideo(media: SurveyPhotoMetadata): boolean {
  if (media.mediaType === 'video') return true
  if (media.mimeType?.startsWith('video/')) return true
  // Fall back to URL extension for legacy rows that pre-date mediaType.
  return /\.(mp4|mov|webm|m4v|ogv)(\?|$)/i.test(media.url)
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function downloadUrl(url: string, suggestedName: string) {
  // Anchor with `download` attribute. Cross-origin blob URLs would
  // ignore this and just navigate, but the survey-photos bucket serves
  // from the same Supabase project so the hint is honored.
  const a = document.createElement('a')
  a.href = url
  a.download = suggestedName
  a.target = '_blank'
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export function MediaSection({ surveyId, media, onChange }: MediaSectionProps) {
  const { organization } = useMultiTenantAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selected, setSelected] = useState<SurveyPhotoMetadata | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<SurveyPhotoMetadata | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const items = media ?? []

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!organization?.id) {
        toast({
          title: 'Not signed in',
          description: 'Reload the page and try again.',
          variant: 'destructive',
        })
        return
      }

      const fileArray = Array.from(files)
      if (fileArray.length === 0) return

      setIsUploading(true)
      const supabase = createClient()

      const newMetadata: SurveyPhotoMetadata[] = []
      const failed: string[] = []

      for (const file of fileArray) {
        const isVideoFile = file.type.startsWith('video/')
        const isImageFile = file.type.startsWith('image/')

        if (!isVideoFile && !isImageFile) {
          failed.push(`${file.name} (unsupported type)`)
          continue
        }

        if (isVideoFile && file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
          failed.push(`${file.name} (over ${MAX_VIDEO_SIZE_MB} MB)`)
          continue
        }

        try {
          const mediaId = `media-${Date.now()}-${nanoid(9)}`
          const mimeType = file.type || (isVideoFile ? 'video/mp4' : 'image/jpeg')

          const remoteUrl = await uploadSurveyMediaBlob({
            organizationId: organization.id,
            surveyId,
            category: UPLOAD_CATEGORY,
            mediaId,
            blob: file,
            mimeType,
          })

          newMetadata.push({
            id: mediaId,
            url: remoteUrl,
            category: UPLOAD_CATEGORY,
            location: '',
            caption: file.name,
            gpsCoordinates: null,
            timestamp: new Date().toISOString(),
            mediaType: isVideoFile ? 'video' : 'image',
            mimeType,
            fileSize: file.size,
          })
        } catch (err) {
          logger.error(
            { error: formatError(err, 'MEDIA_UPLOAD_ERROR'), filename: file.name },
            'Failed to upload survey media',
          )
          failed.push(file.name)
        }
      }

      if (newMetadata.length > 0) {
        // Re-read the current photo_metadata first instead of trusting
        // the prop, so we don't clobber a concurrent edit (or photos
        // captured by a surveyor that just synced).
        const { data: latest, error: readErr } = await supabase
          .from('site_surveys')
          .select('photo_metadata')
          .eq('id', surveyId)
          .single()

        if (readErr) {
          logger.error({ error: formatError(readErr, 'MEDIA_READ_ERROR') }, 'Failed to read photo_metadata before write')
          toast({
            title: 'Upload partially failed',
            description: 'Files uploaded to storage but the survey record could not be updated. Refresh and check.',
            variant: 'destructive',
          })
        } else {
          const existing = (latest?.photo_metadata as SurveyPhotoMetadata[] | null) ?? []
          const merged = [...existing, ...newMetadata]

          const { error: writeErr } = await supabase
            .from('site_surveys')
            .update({ photo_metadata: merged })
            .eq('id', surveyId)

          if (writeErr) {
            logger.error({ error: formatError(writeErr, 'MEDIA_WRITE_ERROR') }, 'Failed to update photo_metadata')
            toast({
              title: 'Upload failed',
              description: 'The file uploaded but the survey record could not be saved.',
              variant: 'destructive',
            })
          } else {
            toast({
              title: `Added ${newMetadata.length} ${newMetadata.length === 1 ? 'file' : 'files'}`,
              description: failed.length > 0 ? `${failed.length} failed: ${failed.join(', ')}` : undefined,
            })
            onChange()
          }
        }
      } else if (failed.length > 0) {
        toast({
          title: 'Upload failed',
          description: failed.join(', '),
          variant: 'destructive',
        })
      }

      setIsUploading(false)
    },
    [organization?.id, surveyId, onChange, toast],
  )

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return

    setIsDeleting(true)
    const supabase = createClient()

    try {
      // Pull current metadata fresh, drop the target, write back.
      const { data: latest, error: readErr } = await supabase
        .from('site_surveys')
        .select('photo_metadata')
        .eq('id', surveyId)
        .single()

      if (readErr) throw readErr

      const existing = (latest?.photo_metadata as SurveyPhotoMetadata[] | null) ?? []
      const remaining = existing.filter((m) => m.id !== pendingDelete.id)

      const { error: writeErr } = await supabase
        .from('site_surveys')
        .update({ photo_metadata: remaining })
        .eq('id', surveyId)

      if (writeErr) throw writeErr

      // Best-effort storage cleanup. The bucket path is encoded in the
      // public URL — pull the path off after `/object/public/<bucket>/`.
      const match = pendingDelete.url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/)
      if (match) {
        const path = decodeURIComponent(match[1].split('?')[0])
        await supabase.storage.from('survey-photos').remove([path]).catch((err) => {
          logger.warn({ error: formatError(err, 'STORAGE_DELETE_WARN'), path }, 'Could not remove storage object')
        })
      }

      toast({ title: 'Deleted' })
      setPendingDelete(null)
      setSelected(null)
      onChange()
    } catch (err) {
      logger.error({ error: formatError(err, 'MEDIA_DELETE_ERROR') }, 'Failed to delete survey media')
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Could not delete this file.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }, [pendingDelete, surveyId, onChange, toast])

  // Drag-drop handlers
  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }
  const onDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget === e.target) setIsDragging(false)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  // Group by category for display.
  const grouped = items.reduce(
    (acc, m) => {
      const cat = m.category || 'other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(m)
      return acc
    },
    {} as Record<string, SurveyPhotoMetadata[]>,
  )

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Survey Media ({items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 transition-colors',
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
              isUploading && 'opacity-60 pointer-events-none',
            )}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading…</p>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Drag photos or videos here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Images and video up to {MAX_VIDEO_SIZE_MB} MB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose files
                </Button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFiles(e.target.files)
                  e.target.value = ''
                }
              }}
            />
          </div>

          {items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              No media attached yet.
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([category, group]) => (
                <div key={category}>
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    {CATEGORY_LABELS[category] || category}
                    <Badge variant="secondary" className="text-xs">
                      {group.length}
                    </Badge>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {group.map((m) => {
                      const itemIsVideo = isVideo(m)
                      return (
                        <div
                          key={m.id}
                          className="group relative aspect-square cursor-pointer rounded-lg overflow-hidden bg-muted"
                          onClick={() => setSelected(m)}
                        >
                          {itemIsVideo ? (
                            <video
                              src={m.url}
                              muted
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-cover bg-black"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.url}
                              alt={m.caption || `Media ${m.id}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {itemIsVideo && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="bg-black/60 rounded-full p-2">
                                <Play className="h-5 w-5 text-white fill-white" />
                              </div>
                            </div>
                          )}
                          <div className="absolute top-1 left-1 flex gap-1">
                            <div className="bg-black/60 rounded px-1.5 py-0.5 flex items-center gap-1">
                              {itemIsVideo ? (
                                <Video className="h-3 w-3 text-white" />
                              ) : (
                                <ImageIcon className="h-3 w-3 text-white" />
                              )}
                            </div>
                            {m.gpsCoordinates && (
                              <div className="bg-black/60 rounded p-1">
                                <MapPin className="h-3 w-3 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium">
                            View
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail / lightbox */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-4xl">
          <DialogTitle className="sr-only">
            {selected?.caption || 'Media details'}
          </DialogTitle>
          {selected && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                {isVideo(selected) ? (
                  <video
                    src={selected.url}
                    controls
                    playsInline
                    preload="metadata"
                    className="w-full h-full"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.url}
                    alt={selected.caption || 'Survey media'}
                    className="w-full h-full object-contain"
                  />
                )}
              </div>

              <div className="space-y-2">
                {selected.caption && (
                  <p className="text-center font-medium">{selected.caption}</p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="outline">
                    {CATEGORY_LABELS[selected.category] || selected.category}
                  </Badge>
                  {selected.location && <span>{selected.location}</span>}
                  {selected.timestamp && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(selected.timestamp).toLocaleString()}
                    </span>
                  )}
                  {selected.fileSize && <span>{formatBytes(selected.fileSize)}</span>}
                </div>
                {selected.gpsCoordinates && (
                  <p className="text-center text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 inline mr-1" />
                    {selected.gpsCoordinates.latitude.toFixed(6)},{' '}
                    {selected.gpsCoordinates.longitude.toFixed(6)}
                  </p>
                )}
              </div>

              <div className="flex justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const isVid = isVideo(selected)
                    const ext = selected.mimeType
                      ? selected.mimeType.split('/')[1] || (isVid ? 'mp4' : 'jpg')
                      : isVid
                        ? 'mp4'
                        : 'jpg'
                    const safeName = (selected.caption || `survey-media-${selected.id}`)
                      .replace(/[^a-z0-9_\- .]/gi, '_')
                      .slice(0, 80)
                    const filename = safeName.match(/\.[a-z0-9]+$/i)
                      ? safeName
                      : `${safeName}.${ext.replace('jpeg', 'jpg').replace('quicktime', 'mov')}`
                    downloadUrl(selected.url, filename)
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setPendingDelete(selected)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this file?</DialogTitle>
            <DialogDescription>
              This removes the file from storage and the survey record. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
