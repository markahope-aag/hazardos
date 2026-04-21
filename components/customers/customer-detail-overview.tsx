'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Plus, User } from 'lucide-react'
import CustomerSurveysList from './customer-surveys-list'
import { useUpdateCustomer } from '@/lib/hooks/use-customers'
import { WorkflowProgress } from '@/components/workflow/workflow-progress'
import type { Customer } from '@/types/database'

const TIMESTAMP_PATTERN = /^\[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\] /

interface NoteEntry {
  timestamp: string | null
  text: string
}

function parseNotes(raw: string, createdAt: string): NoteEntry[] {
  const blocks = raw.split('\n\n').filter((b) => b.trim())
  const entries: NoteEntry[] = []

  for (const block of blocks) {
    const match = block.match(TIMESTAMP_PATTERN)
    if (match) {
      entries.push({ timestamp: match[1], text: block.replace(TIMESTAMP_PATTERN, '') })
    } else {
      entries.push({ timestamp: null, text: block })
    }
  }

  // Legacy: if the whole notes field is a single un-timestamped blob,
  // surface it as one "Original Note" entry.
  if (entries.length === 0 && raw.trim()) {
    entries.push({ timestamp: null, text: raw.trim() })
  }

  return entries.map((entry) => ({
    ...entry,
    timestamp:
      entry.timestamp ?? new Date(createdAt).toISOString().slice(0, 16).replace('T', ' '),
  }))
}

function NotesFeed({ notes, createdAt }: { notes: string; createdAt: string }) {
  const entries = parseNotes(notes, createdAt)

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No notes yet.</p>
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div key={i} className="border rounded-md p-3 text-sm">
          <p className="text-xs text-muted-foreground mb-1">
            {entry.timestamp
              ? new Date(entry.timestamp.replace(' ', 'T')).toLocaleString()
              : 'Original Note'}
          </p>
          <p className="whitespace-pre-wrap">{entry.text}</p>
        </div>
      ))}
    </div>
  )
}

interface Props {
  customer: Customer
  displayName: string
  workflow?: { surveyId: string | null; estimateId: string | null; jobId: string | null } | null
}

/**
 * Overview tab body: workflow progress strip, key dates, lead source /
 * attribution, the timestamped notes feed
 * with an add-note row, and the list of site surveys for this contact.
 * The notes list is append-prepend — new notes go to the top, old ones
 * are preserved so we keep the full history visible.
 */
export function CustomerDetailOverview({ customer, displayName, workflow }: Props) {
  const [addingNote, setAddingNote] = useState(false)
  const [newNoteValue, setNewNoteValue] = useState('')
  const updateCustomerMutation = useUpdateCustomer()

  const handleAddNote = async () => {
    if (!newNoteValue.trim()) return
    const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
    const newEntry = `[${timestamp}] ${newNoteValue.trim()}`
    const updatedNotes = customer.notes ? `${newEntry}\n\n${customer.notes}` : newEntry
    await updateCustomerMutation.mutateAsync({
      id: customer.id,
      updates: { notes: updatedNotes },
    })
    setNewNoteValue('')
    setAddingNote(false)
  }

  return (
    <div className="space-y-6">
      <WorkflowProgress
        customerId={customer.id}
        customerName={displayName}
        surveyId={workflow?.surveyId}
        estimateId={workflow?.estimateId}
        jobId={workflow?.jobId}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Key Dates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">First Touch</p>
              <p className="font-medium">
                {customer.first_touch_date
                  ? new Date(customer.first_touch_date).toLocaleDateString()
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Contacted</p>
              <p className="font-medium">
                {customer.last_contacted_date
                  ? new Date(customer.last_contacted_date).toLocaleDateString()
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Next Follow-up</p>
              <p
                className={`font-medium ${
                  customer.next_followup_date &&
                  new Date(customer.next_followup_date) < new Date()
                    ? 'text-destructive'
                    : ''
                }`}
              >
                {customer.next_followup_date
                  ? new Date(customer.next_followup_date).toLocaleDateString()
                  : '—'}
              </p>
              {customer.next_followup_note && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {customer.next_followup_note}
                </p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(customer.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead Source</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Lead Source</p>
              <p className="font-medium">{customer.lead_source || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Source Detail</p>
              <p className="font-medium">{customer.lead_source_detail || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Referred By</p>
              {customer.referred_by_contact_id ? (
                <Link
                  href={`/crm/contacts/${customer.referred_by_contact_id}`}
                  className="font-medium text-primary hover:underline flex items-center gap-1"
                >
                  <User className="h-3 w-3" />
                  View Referrer
                </Link>
              ) : (
                <p className="font-medium">—</p>
              )}
            </div>
            {customer.utm_source && (
              <div>
                <p className="text-muted-foreground">UTM Source</p>
                <p className="font-medium">{customer.utm_source}</p>
              </div>
            )}
            {customer.utm_medium && (
              <div>
                <p className="text-muted-foreground">UTM Medium</p>
                <p className="font-medium">{customer.utm_medium}</p>
              </div>
            )}
            {customer.utm_campaign && (
              <div>
                <p className="text-muted-foreground">UTM Campaign</p>
                <p className="font-medium">{customer.utm_campaign}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Notes</CardTitle>
            {!addingNote && (
              <Button variant="ghost" size="sm" onClick={() => setAddingNote(true)}>
                <Plus className="h-3 w-3 mr-1" />
                Add Note
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {addingNote && (
            <div className="space-y-2 border rounded-md p-3 bg-muted/30">
              <Textarea
                value={newNoteValue}
                onChange={(e) => setNewNoteValue(e.target.value)}
                rows={3}
                placeholder="Write a note..."
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAddingNote(false)
                    setNewNoteValue('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={updateCustomerMutation.isPending || !newNoteValue.trim()}
                >
                  {updateCustomerMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          )}
          {customer.notes ? (
            <NotesFeed notes={customer.notes} createdAt={customer.created_at} />
          ) : (
            <p className="text-sm text-muted-foreground">
              No notes yet. Click Add Note to get started.
            </p>
          )}
        </CardContent>
      </Card>

      <CustomerSurveysList customerId={customer.id} />
    </div>
  )
}
