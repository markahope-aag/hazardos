'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Mail, Send } from 'lucide-react'

interface EmailComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  contactName: string
  contactEmail: string | null
  onSent?: () => void
}

/**
 * Ad-hoc email composer for a contact record. Sends through the
 * EmailService (which resolves the tenant's verified-domain or shared
 * sender config) and logs the send onto the contact's activity
 * timeline. Plain-text body only for now — richer HTML composition
 * can layer on top when we have a real editor.
 */
export function EmailComposeDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  contactEmail,
  onSent,
}: EmailComposeDialogProps) {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [cc, setCc] = useState('')
  const [sending, setSending] = useState(false)

  const reset = () => {
    setSubject('')
    setBody('')
    setCc('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !body.trim()) {
      toast({
        title: 'Missing content',
        description: 'Add a subject and a message before sending.',
        variant: 'destructive',
      })
      return
    }
    setSending(true)
    try {
      // Body → very basic HTML: preserve paragraph breaks. No markdown /
      // rich text today; that's a future layer.
      const html = `<div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">${body
        .split(/\n{2,}/)
        .map((p) => `<p style="margin: 0 0 1em;">${escapeHtml(p).replace(/\n/g, '<br />')}</p>`)
        .join('')}</div>`

      const ccList = cc
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)

      const res = await fetch(`/api/contacts/${contactId}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          html,
          text: body,
          cc: ccList.length > 0 ? ccList : undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Send failed')
      }
      toast({
        title: 'Email sent',
        description: `Delivered to ${contactEmail}`,
      })
      reset()
      onSent?.()
      onOpenChange(false)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email {contactName}
          </DialogTitle>
          <DialogDescription>
            {contactEmail ? (
              <>Sends to <span className="font-mono text-xs">{contactEmail}</span></>
            ) : (
              'This contact has no email address on file.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="cc" className="text-xs text-muted-foreground">CC (optional)</Label>
            <Input
              id="cc"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="other@example.com, colleague@example.com"
            />
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              maxLength={300}
            />
          </div>
          <div>
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={10}
              className="resize-y"
              placeholder="Write your message..."
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={sending || !contactEmail}>
              {sending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Send</>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
