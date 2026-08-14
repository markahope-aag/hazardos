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
import { useToast } from '@/components/ui/use-toast'
import { logger, formatError } from '@/lib/utils/logger'
import { renderTemplateBody, extractPlaceholders } from '@/lib/services/template-render'
import { Plus, Trash2, Loader2, Mail, AlertTriangle } from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  is_active: boolean
  is_system: boolean
}

/**
 * What the sender actually supplies. Kept in step with the runner's
 * RecipientContext: if a placeholder is not in this list it renders as
 * nothing, so the editor has to say which names work rather than letting
 * someone invent one and find out from a customer.
 */
const AVAILABLE_VARIABLES = [
  { key: 'customer_name', description: 'First name, or "there" if unknown', sample: 'Chad' },
  { key: 'customer_full_name', description: 'Full name', sample: 'Chad Hughes' },
  { key: 'company_name', description: 'Your company name', sample: 'Advanced Health & Safety' },
  { key: 'city', description: 'The contact\'s city', sample: 'Madison' },
] as const

const SAMPLE_VARIABLES = Object.fromEntries(
  AVAILABLE_VARIABLES.map((v) => [v.key, v.sample])
) as Record<string, string>

const KNOWN_KEYS: ReadonlySet<string> = new Set<string>(AVAILABLE_VARIABLES.map((v) => v.key))

export function EmailTemplatesManager() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EmailTemplate | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/email-templates')
      if (!res.ok) throw new Error('Failed to load templates')
      const data = await res.json()
      setTemplates(data.templates ?? [])
    } catch (error) {
      logger.error({ error: formatError(error, 'EMAIL_TEMPLATES_LOAD') }, 'Failed to load templates')
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
      const res = await fetch('/api/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Untitled template ${templates.length + 1}`,
          subject: 'A message from {{company_name}}',
          body: 'Hi {{customer_name}},\n\n\n\nThanks,\n{{company_name}}',
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
      const res = await fetch(`/api/email-templates/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          subject: draft.subject,
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
      const res = await fetch(`/api/email-templates/${draft.id}`, { method: 'DELETE' })
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

  // Placeholders nobody will ever fill. A typo here is invisible until a
  // customer receives a sentence with a hole in it, so it is named here.
  const unknownPlaceholders = useMemo(() => {
    if (!draft) return []
    return [...new Set([
      ...extractPlaceholders(draft.subject),
      ...extractPlaceholders(draft.body),
    ])].filter((key) => !KNOWN_KEYS.has(key))
  }, [draft])

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
            <Mail className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No templates yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Until a step has a template attached, it appears in someone&apos;s list as a
              task to send the email by hand.
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
                    {t.subject}
                  </span>
                  {!t.is_active && (
                    <Badge variant="outline" className="mt-1 text-[10px]">Off</Badge>
                  )}
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
                  <Label htmlFor="tpl-name">Name</Label>
                  <Input
                    id="tpl-name"
                    value={draft.name}
                    maxLength={120}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only you see this. It is what you pick from when building a step.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tpl-subject">Subject</Label>
                  <Input
                    id="tpl-subject"
                    value={draft.subject}
                    maxLength={300}
                    onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tpl-body">Message</Label>
                  <Textarea
                    id="tpl-body"
                    value={draft.body}
                    rows={12}
                    maxLength={20000}
                    className="font-mono text-sm"
                    onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  />
                </div>

                <div className="space-y-2 rounded-md border bg-muted/40 p-3">
                  <p className="text-xs font-medium">Things you can drop in</p>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_VARIABLES.map((v) => (
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
                  <Label>Preview</Label>
                  <div className="rounded-md border bg-background p-4">
                    <p className="text-sm font-medium">
                      {renderTemplateBody(draft.subject, SAMPLE_VARIABLES)}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                      {renderTemplateBody(draft.body, SAMPLE_VARIABLES)}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Shown with example details, so you can read it the way a customer will.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <div>
                    <Label htmlFor="tpl-active">Available to use</Label>
                    <p className="text-xs text-muted-foreground">
                      Turning this off stops it being sent, including by steps already using it.
                    </p>
                  </div>
                  <Switch
                    id="tpl-active"
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
