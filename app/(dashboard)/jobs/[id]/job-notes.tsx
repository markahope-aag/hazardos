'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Plus, Trash2, Loader2, MessageSquare, AlertTriangle, Info, CheckCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { noteTypeConfig } from '@/types/jobs'

interface JobNote {
  id: string
  note_type: string
  content: string
  is_internal: boolean
  created_at: string
  created_by: string
  profile?: {
    full_name: string
  }
}

interface JobNotesProps {
  job: {
    id: string
    job_number?: string
    status?: string
    // Needed to scope photo uploads under the correct org path so the
    // storage RLS policy (first folder segment = org id) passes.
    organization_id: string
  }
  notes?: JobNote[]
}

interface NoteAttachment {
  url: string
  filename: string
  type: string
}

const noteIcons = {
  general: MessageSquare,
  safety: AlertTriangle,
  client_communication: Info,
  completion: CheckCircle,
}

export function JobNotes({ job, notes = [] }: JobNotesProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<JobNote | null>(null)

  const [noteForm, setNoteForm] = useState({
    note_type: 'general',
    content: '',
    is_internal: true,
  })
  // Photo notes can attach one or more images. Stored in job_notes.attachments
  // JSONB as {url, filename, type}; uploaded to the job-documents bucket
  // before the note itself is POSTed so a failed upload doesn't leave an
  // orphaned empty note.
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  const resetForm = () => {
    setNoteForm({ note_type: 'general', content: '', is_internal: true })
    setPhotoFiles([])
  }

  const handleAddNote = async () => {
    const isPhoto = noteForm.note_type === 'photo'
    if (!isPhoto && !noteForm.content.trim()) {
      toast({ title: 'Error', description: 'Please enter note content', variant: 'destructive' })
      return
    }
    if (isPhoto && photoFiles.length === 0 && !noteForm.content.trim()) {
      toast({
        title: 'Error',
        description: 'Attach at least one photo or add a caption.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Upload the photo files first; a note without content requires
      // at least one attachment to reach the API successfully because
      // the content field is required. We substitute a caption fallback
      // when empty.
      let attachments: Array<{ url: string; filename: string; type: string }> = []
      if (isPhoto && photoFiles.length > 0) {
        setUploadingPhotos(true)
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const results = await Promise.all(
          photoFiles.map(async (file) => {
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
            const path = `${job.organization_id}/jobs/${job.id}/notes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
            const { error: uploadError } = await supabase.storage
              .from('job-documents')
              .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: false })
            if (uploadError) throw new Error(uploadError.message)
            const { data: urlData } = supabase.storage
              .from('job-documents')
              .getPublicUrl(path)
            return {
              url: urlData.publicUrl,
              filename: file.name,
              type: file.type || 'image/jpeg',
            }
          }),
        )
        attachments = results
        setUploadingPhotos(false)
      }

      const content =
        noteForm.content.trim() ||
        (isPhoto && photoFiles.length > 0
          ? `${photoFiles.length} photo${photoFiles.length === 1 ? '' : 's'}`
          : '')

      const response = await fetch(`/api/jobs/${job.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...noteForm,
          content,
          attachments: attachments.length > 0 ? attachments : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add note')
      }

      toast({ title: 'Success', description: 'Note added successfully' })
      setShowAddDialog(false)
      resetForm()
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add note',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setUploadingPhotos(false)
    }
  }

  const handleDeleteNote = async () => {
    if (!selectedNote) return

    setLoading(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}/notes?note_id=${selectedNote.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete note')
      }

      toast({ title: 'Success', description: 'Note deleted successfully' })
      setShowDeleteDialog(false)
      setSelectedNote(null)
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete note',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Job Notes</CardTitle>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Note</DialogTitle>
                <DialogDescription>
                  Add a note to this job for record keeping.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Note Type</Label>
                  <Select
                    value={noteForm.note_type}
                    onValueChange={(value) => setNoteForm(prev => ({ ...prev, note_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(noteTypeConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Photo notes get an image picker. Multiple photos
                    can be attached to one note — useful when an issue
                    needs several angles to explain. */}
                {noteForm.note_type === 'photo' && (
                  <div className="space-y-2">
                    <Label>Photos</Label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setPhotoFiles(Array.from(e.target.files || []))
                      }
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:bg-background file:text-foreground file:text-sm file:font-medium hover:file:bg-accent"
                    />
                    {photoFiles.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {photoFiles.length} photo{photoFiles.length === 1 ? '' : 's'} selected ·{' '}
                        {(photoFiles.reduce((s, f) => s + f.size, 0) / 1024 / 1024).toFixed(1)} MB
                      </p>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>
                    {noteForm.note_type === 'photo' ? 'Caption / description' : 'Content'}
                  </Label>
                  <Textarea
                    value={noteForm.content}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder={
                      noteForm.note_type === 'photo'
                        ? 'Describe what the photo shows…'
                        : 'Enter your note...'
                    }
                    rows={4}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_internal"
                    checked={noteForm.is_internal}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, is_internal: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="is_internal">Internal note (not visible to customer)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm() }}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={loading || uploadingPhotos}>
                  {(loading || uploadingPhotos) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {uploadingPhotos ? 'Uploading…' : 'Add Note'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No notes added yet.
            </p>
          ) : (
            <div className="space-y-4">
              {notes.map(note => {
                const Icon = noteIcons[note.note_type as keyof typeof noteIcons] || MessageSquare
                const config = noteTypeConfig[note.note_type as keyof typeof noteTypeConfig]

                return (
                  <div
                    key={note.id}
                    className="border rounded-lg p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={cn('h-4 w-4', config?.color)} />
                        <Badge
                          variant="outline"
                          className={cn(config?.bgColor, config?.color)}
                        >
                          {config?.label || note.note_type}
                        </Badge>
                        {note.is_internal && (
                          <Badge variant="secondary">Internal</Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedNote(note)
                          setShowDeleteDialog(true)
                        }}
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                    {(() => {
                      // JobNote's base type doesn't include the JSONB
                      // attachments column yet; cast here rather than
                      // extending the shared type for this one read.
                      const attachments = (note as unknown as { attachments?: NoteAttachment[] })
                        .attachments
                      if (!Array.isArray(attachments) || attachments.length === 0) return null
                      return (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                          {attachments.map((att, i) => {
                            const isImage = att.type?.startsWith('image/')
                            return isImage ? (
                              <a
                                key={i}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block aspect-square overflow-hidden rounded-md border hover:opacity-90"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={att.url}
                                  alt={att.filename || 'Photo attachment'}
                                  className="w-full h-full object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                key={i}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-md border text-xs hover:bg-accent truncate"
                              >
                                {att.filename || 'Attachment'}
                              </a>
                            )
                          })}
                        </div>
                      )
                    })()}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{note.profile?.full_name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{format(parseISO(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
