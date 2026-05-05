'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle, Download, FileBadge, Loader2, Plus, Send, Share2, Trash2, Upload,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { OrganizationDocumentsService } from '@/lib/supabase/organization-documents'
import { useMultiTenantAuth } from '@/components/providers/auth-provider'
import type {
  OrganizationDocument,
  OrganizationDocumentCategory,
  OrganizationDocumentShare,
} from '@/types/database'

interface DocRow extends OrganizationDocument {
  uploader: { id: string; full_name: string | null } | null
}

interface ShareRow extends OrganizationDocumentShare {
  shared_by_user: { id: string; full_name: string | null } | null
  document: { id: string; display_name: string; category: OrganizationDocumentCategory } | null
}

const CATEGORY_LABEL: Record<OrganizationDocumentCategory, string> = {
  license: 'License',
  certification: 'Certification',
  insurance: 'Insurance (COI)',
  bond: 'Bond',
  w9: 'W-9',
  safety_plan: 'Safety plan',
  references: 'References',
  other: 'Other',
}

const CATEGORY_ORDER: OrganizationDocumentCategory[] = [
  'license',
  'certification',
  'insurance',
  'bond',
  'safety_plan',
  'w9',
  'references',
  'other',
]

function formatDate(value: string | null): string {
  if (!value) return '—'
  // Bare YYYY-MM-DD strings need local-date parsing to avoid TZ slip.
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  if (!y || !m || !d) return value
  return new Date(y, m - 1, d).toLocaleDateString()
}

function expirationStatus(expires_on: string | null): { label: string; tone: 'ok' | 'warn' | 'expired' | null } {
  if (!expires_on) return { label: 'No expiration', tone: null }
  const [y, m, d] = expires_on.slice(0, 10).split('-').map(Number)
  const exp = new Date(y, m - 1, d)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const ms = exp.getTime() - today.getTime()
  const days = Math.round(ms / (24 * 60 * 60 * 1000))
  if (days < 0) return { label: `Expired ${-days}d ago`, tone: 'expired' }
  if (days <= 30) return { label: `Expires in ${days}d`, tone: 'warn' }
  return { label: formatDate(expires_on), tone: 'ok' }
}

export default function CredentialsPage() {
  const { profile } = useMultiTenantAuth()
  const { toast } = useToast()
  const [docs, setDocs] = useState<DocRow[]>([])
  const [shares, setShares] = useState<ShareRow[]>([])
  const [loading, setLoading] = useState(true)

  const [uploadOpen, setUploadOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [shareDoc, setShareDoc] = useState<DocRow | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [docsRes, sharesRes] = await Promise.all([
        fetch('/api/organization-documents'),
        fetch('/api/organization-documents/shares'),
      ])
      if (docsRes.ok) {
        const data = await docsRes.json()
        setDocs(data.documents || [])
      }
      if (sharesRes.ok) {
        const data = await sharesRes.json()
        setShares(data.shares || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const grouped = useMemo(() => {
    const map = new Map<OrganizationDocumentCategory, DocRow[]>()
    for (const cat of CATEGORY_ORDER) map.set(cat, [])
    for (const d of docs) {
      const cat = d.category as OrganizationDocumentCategory
      const list = map.get(cat) ?? []
      list.push(d)
      map.set(cat, list)
    }
    return map
  }, [docs])

  const handleDownload = async (doc: DocRow) => {
    try {
      const url = await OrganizationDocumentsService.getSignedUrl(doc.storage_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch {
      toast({ title: 'Could not open file', variant: 'destructive' })
    }
  }

  const handleDelete = async (doc: DocRow) => {
    if (!confirm(`Remove ${doc.display_name}? This cannot be undone.`)) return
    try {
      await OrganizationDocumentsService.remove(doc.id)
      toast({ title: 'Removed' })
      refresh()
    } catch (e) {
      toast({
        title: 'Remove failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    }
  }

  const handleShare = (doc: DocRow) => {
    setShareDoc(doc)
    setShareOpen(true)
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileBadge className="h-6 w-6" />
            Licenses & Permits
          </h1>
          <p className="text-muted-foreground">
            Upload your company&rsquo;s licenses, certifications, insurance, bonds, and safety
            plans — then send them to prospects with one click.
          </p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : docs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileBadge className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>No credentials uploaded yet.</p>
            <p className="text-sm mt-1">
              Add your state license, EPA certification, COI, etc. to make sharing painless.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {CATEGORY_ORDER.map((cat) => {
            const list = grouped.get(cat) ?? []
            if (list.length === 0) return null
            return (
              <Card key={cat}>
                <CardHeader>
                  <CardTitle className="text-base">{CATEGORY_LABEL[cat]}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Document</TableHead>
                        <TableHead>Number</TableHead>
                        <TableHead>Issuing authority</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="w-[200px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {list.map((doc) => {
                        const exp = expirationStatus(doc.expires_on)
                        return (
                          <TableRow key={doc.id}>
                            <TableCell>
                              <div className="font-medium">{doc.display_name}</div>
                              <div className="text-xs text-muted-foreground">{doc.file_name}</div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {doc.document_number || '—'}
                            </TableCell>
                            <TableCell className="text-sm">{doc.issuing_authority || '—'}</TableCell>
                            <TableCell>
                              {exp.tone === 'expired' ? (
                                <Badge variant="destructive">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {exp.label}
                                </Badge>
                              ) : exp.tone === 'warn' ? (
                                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  {exp.label}
                                </Badge>
                              ) : exp.tone === 'ok' ? (
                                <span className="text-sm">{exp.label}</span>
                              ) : (
                                <span className="text-sm text-muted-foreground">{exp.label}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} aria-label="Download">
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleShare(doc)} aria-label="Share">
                                  <Share2 className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDelete(doc)} aria-label="Delete">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Audit history — proves to a regulator (or anyone) what we sent
          out and to whom. */}
      <Card>
        <CardHeader>
          <CardTitle>Share history</CardTitle>
          <CardDescription>
            Every credential that&rsquo;s been emailed out, with the recipient and the link
            expiry.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {shares.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No shares yet. Send a document to a prospect and it&rsquo;ll be logged here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Sent by</TableHead>
                  <TableHead>Sent at</TableHead>
                  <TableHead>Link expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shares.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.document?.display_name || '—'}</TableCell>
                    <TableCell>
                      <div>{s.recipient_email}</div>
                      {s.recipient_name && (
                        <div className="text-xs text-muted-foreground">{s.recipient_name}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {s.shared_by_user?.full_name || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(s.shared_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(s.link_expires_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {profile?.organization_id && (
        <UploadDialog
          open={uploadOpen}
          onClose={() => setUploadOpen(false)}
          organizationId={profile.organization_id}
          onUploaded={() => {
            setUploadOpen(false)
            refresh()
          }}
        />
      )}

      <ShareDialog
        open={shareOpen}
        onClose={() => {
          setShareOpen(false)
          setShareDoc(null)
        }}
        doc={shareDoc}
        onShared={() => {
          setShareOpen(false)
          setShareDoc(null)
          refresh()
        }}
      />
    </div>
  )
}

function UploadDialog({
  open,
  onClose,
  organizationId,
  onUploaded,
}: {
  open: boolean
  onClose: () => void
  organizationId: string
  onUploaded: () => void
}) {
  const { toast } = useToast()
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [category, setCategory] = useState<OrganizationDocumentCategory>('license')
  const [documentNumber, setDocumentNumber] = useState('')
  const [issuingAuthority, setIssuingAuthority] = useState('')
  const [issuedOn, setIssuedOn] = useState('')
  const [expiresOn, setExpiresOn] = useState('')
  const [notes, setNotes] = useState('')

  const reset = () => {
    setFile(null)
    setDisplayName('')
    setCategory('license')
    setDocumentNumber('')
    setIssuingAuthority('')
    setIssuedOn('')
    setExpiresOn('')
    setNotes('')
  }

  const handleFileChange = (f: File | null) => {
    setFile(f)
    // Default the display name to the filename minus extension when blank.
    if (f && !displayName) {
      setDisplayName(f.name.replace(/\.[^.]+$/, ''))
    }
  }

  const handleSubmit = async () => {
    if (!file || !displayName.trim()) {
      toast({ title: 'File and name are required', variant: 'destructive' })
      return
    }
    setUploading(true)
    try {
      await OrganizationDocumentsService.upload({
        organizationId,
        file,
        displayName: displayName.trim(),
        category,
        documentNumber: documentNumber.trim() || undefined,
        issuingAuthority: issuingAuthority.trim() || null,
        issuedOn: issuedOn || null,
        expiresOn: expiresOn || null,
        notes: notes.trim() || null,
      })
      toast({ title: 'Document uploaded' })
      reset()
      onUploaded()
    } catch (e) {
      toast({
        title: 'Upload failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Credential</DialogTitle>
          <DialogDescription>
            PDF or image is fine. Add an expiration date so we can warn you before it lapses.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <Label htmlFor="cred_file">File *</Label>
            <Input
              id="cred_file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cred_name">Display name *</Label>
              <Input
                id="cred_name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="California Asbestos Contractor License"
              />
            </div>
            <div>
              <Label htmlFor="cred_category">Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as OrganizationDocumentCategory)}>
                <SelectTrigger id="cred_category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_ORDER.map((c) => (
                    <SelectItem key={c} value={c}>{CATEGORY_LABEL[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cred_number">Document number</Label>
              <Input
                id="cred_number"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="ASB-1234567"
              />
            </div>
            <div>
              <Label htmlFor="cred_authority">Issuing authority</Label>
              <Input
                id="cred_authority"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                placeholder="CA DOSH / CSLB"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cred_issued">Issued on</Label>
              <Input
                id="cred_issued"
                type="date"
                value={issuedOn}
                onChange={(e) => setIssuedOn(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="cred_expires">Expires on</Label>
              <Input
                id="cred_expires"
                type="date"
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cred_notes">Notes</Label>
            <Textarea
              id="cred_notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes — not visible to recipients."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploading}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={uploading}>
            {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="h-4 w-4 mr-2" /> Upload</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ShareDialog({
  open,
  onClose,
  doc,
  onShared,
}: {
  open: boolean
  onClose: () => void
  doc: DocRow | null
  onShared: () => void
}) {
  const { toast } = useToast()
  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (open) {
      setRecipientEmail('')
      setRecipientName('')
      setMessage('')
    }
  }, [open])

  const handleSend = async () => {
    if (!doc) return
    if (!recipientEmail.trim()) {
      toast({ title: 'Recipient email is required', variant: 'destructive' })
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/organization-documents/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_ids: [doc.id],
          recipient_email: recipientEmail.trim(),
          recipient_name: recipientName.trim() || undefined,
          message: message.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Send failed')
      }
      toast({ title: 'Sent', description: `Emailed to ${recipientEmail.trim()}` })
      onShared()
    } catch (e) {
      toast({
        title: 'Send failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share credential</DialogTitle>
          <DialogDescription>
            {doc ? <>Send <strong>{doc.display_name}</strong> via email. The recipient gets a link valid for 14 days.</> : 'Choose a credential to share.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="share_email">Recipient email *</Label>
            <Input
              id="share_email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="prospect@example.com"
            />
          </div>
          <div>
            <Label htmlFor="share_name">Recipient name</Label>
            <Input
              id="share_name"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <Label htmlFor="share_message">Message (optional)</Label>
            <Textarea
              id="share_message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hi Jane — here's the license you asked for. Let me know if you need anything else."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || !doc}>
            {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : <><Send className="h-4 w-4 mr-2" /> Send</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
