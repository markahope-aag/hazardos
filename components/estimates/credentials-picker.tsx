'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { FileBadge, Loader2, Plus, X } from 'lucide-react'
import Link from 'next/link'
import { differenceInDays, parseISO } from 'date-fns'

const CATEGORY_LABEL: Record<string, string> = {
  license: 'Licenses',
  certification: 'Certifications',
  insurance: 'Insurance',
  bond: 'Bonds',
  w9: 'W-9',
  safety_plan: 'Safety Plans',
  references: 'References',
  other: 'Other',
}

const CATEGORY_ORDER: string[] = [
  'license',
  'certification',
  'insurance',
  'bond',
  'safety_plan',
  'w9',
  'references',
  'other',
]

interface OrgDocument {
  id: string
  display_name: string
  file_name: string
  category: string
  document_number: string | null
  expires_on: string | null
}

interface AttachmentRow {
  document_id: string
  attached_at: string
  document: OrgDocument | null
}

interface Props {
  estimateId: string
}

function expirationBadge(expires_on: string | null) {
  if (!expires_on) return null
  const days = differenceInDays(parseISO(expires_on), new Date())
  if (days < 0) {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">Expired</span>
  }
  if (days <= 30) {
    return <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Expires in {days}d</span>
  }
  return null
}

export function CredentialsPicker({ estimateId }: Props) {
  const { toast } = useToast()
  const [attachments, setAttachments] = useState<AttachmentRow[]>([])
  const [allDocs, setAllDocs] = useState<OrgDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  const fetchAttachments = useCallback(async () => {
    try {
      const res = await fetch(`/api/estimates/${estimateId}/attachments`)
      if (!res.ok) throw new Error('Failed to load attachments')
      const data = await res.json()
      setAttachments(data.attachments || [])
    } finally {
      setLoading(false)
    }
  }, [estimateId])

  useEffect(() => {
    fetchAttachments()
  }, [fetchAttachments])

  const openPicker = async () => {
    // Pull the org's full credential catalog only when the picker opens —
    // skips the request on every page load for users who never click it.
    setSelected(new Set(attachments.map((a) => a.document_id)))
    setDialogOpen(true)
    try {
      const res = await fetch('/api/organization-documents')
      if (!res.ok) throw new Error('Failed to load credentials')
      const data = await res.json()
      setAllDocs(data.documents || [])
    } catch {
      toast({ title: 'Could not load credentials', variant: 'destructive' })
    }
  }

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/estimates/${estimateId}/attachments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_ids: Array.from(selected) }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'Attachments updated' })
      setDialogOpen(false)
      await fetchAttachments()
    } catch {
      toast({ title: 'Save failed', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const docsByCategory = allDocs.reduce<Record<string, OrgDocument[]>>((acc, doc) => {
    const cat = doc.category || 'other'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(doc)
    return acc
  }, {})

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileBadge className="h-4 w-4" />
            Credentials & Permits
          </CardTitle>
          <Button size="sm" variant="outline" onClick={openPicker}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Manage
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Loading…
            </div>
          ) : attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No credentials attached. Pick from your saved licenses, insurance, and bonds — they&apos;ll be included with the proposal email when this estimate is sent.{' '}
              <Link href="/settings/credentials" className="underline">
                Manage credentials library
              </Link>
            </p>
          ) : (
            <ul className="space-y-1.5">
              {attachments.map((a) =>
                a.document ? (
                  <li
                    key={a.document_id}
                    className="flex items-center justify-between gap-2 rounded border border-gray-200 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{a.document.display_name}</span>
                        {expirationBadge(a.document.expires_on)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {CATEGORY_LABEL[a.document.category] ?? 'Other'}
                        {a.document.document_number && ` · ${a.document.document_number}`}
                      </div>
                    </div>
                  </li>
                ) : null,
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Attach credentials to this estimate</DialogTitle>
            <DialogDescription>
              Selected documents will be included as secure links in the proposal email.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            {allDocs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No credentials uploaded yet.{' '}
                <Link href="/settings/credentials" className="underline">
                  Upload your first one →
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {CATEGORY_ORDER.filter((cat) => docsByCategory[cat]?.length).map((cat) => (
                  <div key={cat}>
                    <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                      {CATEGORY_LABEL[cat]}
                    </h4>
                    <div className="space-y-1">
                      {docsByCategory[cat].map((doc) => {
                        const id = `doc-${doc.id}`
                        const checked = selected.has(doc.id)
                        return (
                          <Label
                            key={doc.id}
                            htmlFor={id}
                            className={`flex items-start gap-3 rounded border px-3 py-2 cursor-pointer ${
                              checked ? 'border-primary bg-primary/5' : 'border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <Checkbox id={id} checked={checked} onCheckedChange={() => toggle(doc.id)} className="mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{doc.display_name}</span>
                                {expirationBadge(doc.expires_on)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {doc.document_number && `${doc.document_number} · `}
                                {doc.file_name}
                              </div>
                            </div>
                          </Label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row items-center justify-between gap-2 border-t pt-4">
            <span className="text-xs text-muted-foreground">
              {selected.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                <X className="h-3.5 w-3.5 mr-1" /> Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Save selection
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
