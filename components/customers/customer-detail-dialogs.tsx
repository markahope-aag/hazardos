'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { useUpdateCustomer } from '@/lib/hooks/use-customers'
import type { Customer } from '@/types/database'

// ---------------------------------------------------------------------------
// Log Call
// ---------------------------------------------------------------------------

interface LogCallProps {
  customerId: string
  displayName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Quick-action dialog that records an inbound or outbound phone call as a
 * manual activity. Hits /api/activity/manual directly — no separate
 * mutation hook since this is fire-and-forget.
 */
export function LogCallDialog({ customerId, displayName, open, onOpenChange }: LogCallProps) {
  const { toast } = useToast()
  const [callDirection, setCallDirection] = useState<'inbound' | 'outbound'>('outbound')
  const [callDuration, setCallDuration] = useState('')
  const [callNotes, setCallNotes] = useState('')

  const reset = () => {
    setCallDirection('outbound')
    setCallDuration('')
    setCallNotes('')
  }

  const handleLog = async () => {
    try {
      const res = await fetch('/api/activity/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'call',
          entity_type: 'customer',
          entity_id: customerId,
          entity_name: displayName,
          call_direction: callDirection,
          call_duration: callDuration ? Number(callDuration) : undefined,
          content: callNotes,
        }),
      })
      if (!res.ok) throw new Error('Failed to log call')
      toast({
        title: 'Call logged',
        description: `${callDirection === 'inbound' ? 'Inbound' : 'Outbound'} call recorded.`,
      })
      onOpenChange(false)
      reset()
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to log call. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Call</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Direction</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="callDirection"
                  checked={callDirection === 'outbound'}
                  onChange={() => setCallDirection('outbound')}
                  className="accent-primary"
                />
                Outbound
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="callDirection"
                  checked={callDirection === 'inbound'}
                  onChange={() => setCallDirection('inbound')}
                  className="accent-primary"
                />
                Inbound
              </label>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="callDuration">Duration (minutes)</Label>
            <Input
              id="callDuration"
              type="number"
              min="0"
              placeholder="e.g. 15"
              value={callDuration}
              onChange={(e) => setCallDuration(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="callNotes">Notes</Label>
            <Textarea
              id="callNotes"
              rows={3}
              placeholder="What was discussed..."
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleLog}>Log Call</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Follow-up
// ---------------------------------------------------------------------------

interface FollowUpProps {
  customer: Customer
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Schedules the contact's next_followup_date + optional note. Writes to
 * the customers row so the date surfaces on the contact list's overdue
 * follow-up indicator too.
 */
export function FollowUpDialog({ customer, open, onOpenChange }: FollowUpProps) {
  const { toast } = useToast()
  const updateCustomerMutation = useUpdateCustomer()
  const [followUpDate, setFollowUpDate] = useState('')
  const [followUpNote, setFollowUpNote] = useState('')

  const handleSet = async () => {
    if (!followUpDate) return
    try {
      await updateCustomerMutation.mutateAsync({
        id: customer.id,
        updates: {
          next_followup_date: followUpDate,
          next_followup_note: followUpNote || null,
        },
      })
      toast({
        title: 'Follow-up set',
        description: `Follow-up scheduled for ${new Date(followUpDate).toLocaleDateString()}.`,
      })
      onOpenChange(false)
      setFollowUpDate('')
      setFollowUpNote('')
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to set follow-up. Please try again.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set Follow-up</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="followUpDate">Date</Label>
            <Input
              id="followUpDate"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="followUpNote">Note (optional)</Label>
            <Input
              id="followUpNote"
              placeholder="Reason for follow-up..."
              value={followUpNote}
              onChange={(e) => setFollowUpNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSet} disabled={!followUpDate}>
            Set Follow-up
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
