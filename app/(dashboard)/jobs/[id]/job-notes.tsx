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
  }
  notes?: JobNote[]
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

  const handleAddNote = async () => {
    if (!noteForm.content.trim()) {
      toast({ title: 'Error', description: 'Please enter note content', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/jobs/${job.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteForm),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add note')
      }

      toast({ title: 'Success', description: 'Note added successfully' })
      setShowAddDialog(false)
      setNoteForm({ note_type: 'general', content: '', is_internal: true })
      router.refresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add note',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
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
                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={noteForm.content}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter your note..."
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
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddNote} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Note
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
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{note.content}</p>
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
