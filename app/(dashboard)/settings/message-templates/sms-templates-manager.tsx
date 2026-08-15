'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { logger, formatError } from '@/lib/utils/logger'
import { renderTemplateBody, extractPlaceholders } from '@/lib/services/template-render'
import { SYSTEM_TEMPLATE_VARIABLES } from '@/lib/services/system-template-variables'
import { SMS_TEMPLATE_MESSAGE_TYPES } from '@/lib/validations/sms-templates'
import { Plus, Trash2, Loader2, MessageSquare, AlertTriangle } from 'lucide-react'

interface SmsTemplate {
  id: string
  name: string
  message_type: (typeof SMS_TEMPLATE_MESSAGE_TYPES)[number]
  body: string
  is_active: boolean
  is_system: boolean
  slug: string | null
}

const MESSAGE_TYPE_LABELS: Record<string, string> = {
  appointment_reminder: 'Appointment reminder',
  job_status: 'Job status',
  lead_notification: 'Lead notification',
  payment_reminder: 'Payment reminder',
  estimate_follow_up: 'Estimate follow-up',
  general: 'General',
  marketing: 'Marketing',
}

/** Same generic set the email manager offers a tenant-authored template. */
const AVAILABLE_VARIABLES = [
  { key: 'customer_name', description: 'First name, or "there" if unknown', sample: 'Chad' },
  { key: 'customer_full_name', description: 'Full name', sample: 'Chad Hughes' },
  { key: 'company_name', description: 'Your company name', sample: 'Advanced Health & Safety' },
  { key: 'city', description: 'The contact\'s city', sample: 'Madison' },
] as const

const SYSTEM_VARIABLE_INFO: Record<string, { description: string; sample: string }> = {
  customer_name: { description: 'First name, or "there" if unknown', sample: 'Chad' },
  company_name: { description: 'Your company name', sample: 'Advanced Health & Safety' },
  scheduled_date_pretty: { description: 'The appointment date, formatted', sample: 'Thursday, August 20, 2026' },
  time_suffix: { description: '" at [time]", or blank if no time was set', sample: ' at 2:00 PM' },
  property_address: { description: 'The job site address', sample: '123 Elm St' },
  invoice_number: { description: 'The invoice number', sample: 'INV-1042' },
  amount: { description: 'The balance due, formatted', sample: '$450.00' },
  due_date: { description: 'The invoice due date, formatted', sample: '8/20/2026' },
  pay_url: { description: 'Link to pay the invoice online', sample: 'https://app.example.com/pay/abc123' },
}

function variablesFor(slug: string | null): { key: string; description: string; sample: string }[] {
  if (!slug || !SYSTEM_TEMPLATE_VARIABLES[slug]) return [...AVAILABLE_VARIABLES]
  return SYSTEM_TEMPLATE_VARIABLES[slug].map((key) => ({ key, ...SYSTEM_VARIABLE_INFO[key] }))
}

export function SmsTemplatesManager() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<SmsTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<SmsTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sms-templates')
      if (!res.ok) throw new Error('Failed to load templates')
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch (error) {
      logger.error({ error: formatError(error, 'SMS_TEMPLATES_LOAD') }, 'Failed to load templates')
      toast({ title: 'Could not load templates', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const found = templates.find((t) => t.id === selectedId) ?? null
    setDraft(found ? { ...found } : null)
  }, [selectedId, templates])

  const create = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/sms-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Untitled template ${templates.length + 1}`,
          message_type: 'general',
          body: 'Hi {{customer_name}}, this is {{company_name}}. Reply STOP to opt out.',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not create the template')
      }
      const data = await res.json()
      await load()
      setSelectedId(data.template.id)
    } catch (error) {
      toast({
        title: 'Could not create it',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sms-templates/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          message_type: draft.message_type,
          body: draft.body,
          is_active: draft.is_active,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not save')
      }
      await load()
      toast({ title: 'Template saved' })
    } catch (error) {
      toast({
        title: 'Not saved',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!draft) return
    setSaving(true)
    try {
      const res = await fetch(`/api/sms-templates/${draft.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not delete')
      }
      setSelectedId(null)
      await load()
    } catch (error) {
      toast({
        title: 'Could not delete it',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const insert = (key: string) => {
    if (!draft) return
    setDraft({ ...draft, body: `${draft.body}{{${key}}}` })
  }

  const availableVars = useMemo(() => variablesFor(draft?.slug ?? null), [draft?.slug])
  const sampleVariables = useMemo(
    () => Object.fromEntries(availableVars.map((v) => [v.key, v.sample])) as Record<string, string>,
    [availableVars]
  )
  const knownKeys = useMemo(() => new Set(availableVars.map((v) => v.key)), [availableVars])

  const unknownPlaceholders = useMemo(() => {
    if (!draft) return []
    return [...new Set(extractPlaceholders(draft.body))].filter((key) => !knownKeys.has(key))
  }, [draft, knownKeys])

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={create} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          New template
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No templates yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Until a step has a template attached, it appears in someone&apos;s list as a
              task to send the text by hand.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <ul className="space-y-1">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    t.id === selectedId ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                  }`}
                >
                  <span className="block truncate font-medium">{t.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {MESSAGE_TYPE_LABELS[t.message_type] ?? t.message_type}
                  </span>
                  <div className="mt-1 flex gap-1">
                    {t.is_system && (
                      <Badge variant="outline" className="text-[10px]">Default</Badge>
                    )}
                    {!t.is_active && (
                      <Badge variant="outline" className="text-[10px]">Off</Badge>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>

          {draft ? (
            <Card>
              <CardHeader>
                <CardTitle>Edit template</CardTitle>
                <CardDescription>
                  Changes apply to messages already queued, so fixing a typo reaches
                  anything that has not gone out yet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sms-tpl-name">Name</Label>
                  <Input
                    id="sms-tpl-name"
                    value={draft.name}
                    maxLength={100}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only you see this. It is what you pick from when building a step.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sms-tpl-type">Type</Label>
                  <Select
                    value={draft.message_type}
                    onValueChange={(v) => setDraft({ ...draft, message_type: v as SmsTemplate['message_type'] })}
                    disabled={draft.is_system}
                  >
                    <SelectTrigger id="sms-tpl-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SMS_TEMPLATE_MESSAGE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {MESSAGE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sms-tpl-body">Message</Label>
                  <Textarea
                    id="sms-tpl-body"
                    value={draft.body}
                    rows={5}
                    maxLength={1000}
                    className="font-mono text-sm"
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {draft.body.length}/1000 — anything past ~160 characters splits into extra
                    billed segments.
                  </p>
                </div>

                <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                  <p className="text-xs font-medium">Things you can drop in</p>
                  <div className="flex flex-wrap gap-2">
                    {availableVars.map((v) => (
                      <Button
                        key={v.key}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 font-mono text-xs"
                        title={v.description}
                        onClick={() => insert(v.key)}
                      >
                        {`{{${v.key}}}`}
                      </Button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anything else you write in double braces comes out blank.
                  </p>
                </div>

                {unknownPlaceholders.length > 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="font-medium">
                        {unknownPlaceholders.length === 1 ? 'This will come out blank' : 'These will come out blank'}
                      </p>
                      <p className="font-mono text-xs">
                        {unknownPlaceholders.map((k) => `{{${k}}}`).join('  ')}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium leading-none">Preview</p>
                  <div className="rounded-md border bg-background p-4">
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                      {renderTemplateBody(draft.body, sampleVariables)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Shown with example details, so you can read it the way a customer will.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <div>
                    <Label htmlFor="sms-tpl-active">Available to use</Label>
                    <p className="text-xs text-muted-foreground">
                      Turning this off stops it being sent, including by steps already using it.
                    </p>
                  </div>
                  <Switch
                    id="sms-tpl-active"
                    checked={draft.is_active}
                    onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
                  />
                </div>

                <div className="flex justify-between gap-2">
                  <Button variant="outline" onClick={remove} disabled={saving}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex h-full items-center justify-center py-16 text-center text-sm text-muted-foreground">
                Pick a template to edit it.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
