'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, StickyNote, Phone, PhoneIncoming, PhoneOutgoing } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface AddActivityDialogProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  entityType: string
  entityId: string
  entityName?: string
}

export function AddActivityDialog({
  open,
  onClose,
  onSuccess,
  entityType,
  entityId,
  entityName,
}: AddActivityDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activityType, setActivityType] = useState<'note' | 'call'>('note')

  // Note state
  const [noteContent, setNoteContent] = useState('')

  // Call state
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('outbound')
  const [callDuration, setCallDuration] = useState('')
  const [callNotes, setCallNotes] = useState('')

  function resetForm() {
    setNoteContent('')
    setCallDirection('outbound')
    setCallDuration('')
    setCallNotes('')
    setError(null)
    setActivityType('note')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (activityType === 'note' && !noteContent.trim()) {
      setError('Note content is required')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const payload: Record<string, unknown> = {
        type: activityType,
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
      }

      if (activityType === 'note') {
        payload.content = noteContent.trim()
      } else {
        payload.call_direction = callDirection
        payload.call_duration = callDuration ? parseInt(callDuration, 10) : undefined
        payload.content = callNotes.trim() || undefined
      }

      const res = await fetch('/api/activity/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to log activity')
      }

      toast({
        title: activityType === 'note' ? 'Note added' : 'Call logged',
        description: `Activity has been recorded successfully.`,
      })
      resetForm()
      onClose()
      onSuccess?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
          <DialogDescription>
            Add a note or log a phone call for this {entityType}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="py-4">
            {error && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <Tabs
              value={activityType}
              onValueChange={(val) => setActivityType(val as 'note' | 'call')}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="note" className="flex items-center gap-2">
                  <StickyNote className="h-4 w-4" />
                  Note
                </TabsTrigger>
                <TabsTrigger value="call" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone Call
                </TabsTrigger>
              </TabsList>

              <TabsContent value="note" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="noteContent">Note *</Label>
                  <Textarea
                    id="noteContent"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Enter your note here..."
                    rows={5}
                  />
                </div>
              </TabsContent>

              <TabsContent value="call" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Call Direction</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={callDirection === 'outbound' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setCallDirection('outbound')}
                    >
                      <PhoneOutgoing className="h-4 w-4 mr-2" />
                      Outbound
                    </Button>
                    <Button
                      type="button"
                      variant={callDirection === 'inbound' ? 'default' : 'outline'}
                      className="flex-1"
                      onClick={() => setCallDirection('inbound')}
                    >
                      <PhoneIncoming className="h-4 w-4 mr-2" />
                      Inbound
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callDuration">Duration (minutes)</Label>
                  <Input
                    id="callDuration"
                    type="number"
                    min="0"
                    value={callDuration}
                    onChange={(e) => setCallDuration(e.target.value)}
                    placeholder="e.g., 15"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callNotes">Call Notes</Label>
                  <Textarea
                    id="callNotes"
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Summary of the conversation..."
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Log Activity
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
