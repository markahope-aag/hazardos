'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { logger, formatError } from '@/lib/utils/logger'
import { Plus, Trash2, Loader2, ListChecks } from 'lucide-react'
import { ACTIVITY_TYPE_KINDS } from '@/lib/validations/activity-types'

interface ActivityType {
  id: string
  name: string
  kind: (typeof ACTIVITY_TYPE_KINDS)[number]
  is_active: boolean
  is_system: boolean
}

interface ActivityOutcome {
  id: string
  name: string
  halts_chain: boolean
  is_active: boolean
  is_system: boolean
}

const KIND_LABELS: Record<string, string> = {
  call: 'Call',
  email: 'Email',
  text: 'Text',
  todo: 'To-do',
}

export function ActivityVocabularyManager() {
  return (
    <Tabs defaultValue="types">
      <TabsList>
        <TabsTrigger value="types">Activity Types</TabsTrigger>
        <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
      </TabsList>
      <TabsContent value="types" className="mt-4">
        <ActivityTypesEditor />
      </TabsContent>
      <TabsContent value="outcomes" className="mt-4">
        <ActivityOutcomesEditor />
      </TabsContent>
    </Tabs>
  )
}

function ActivityTypesEditor() {
  const { toast } = useToast()
  const [items, setItems] = useState<ActivityType[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ActivityType | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/activity-types')
      if (!res.ok) throw new Error('Failed to load activity types')
      const data = await res.json()
      setItems(data.activityTypes ?? [])
    } catch (error) {
      logger.error({ error: formatError(error, 'ACTIVITY_TYPES_LOAD') }, 'Failed to load activity types')
      toast({ title: 'Could not load activity types', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const found = items.find((t) => t.id === selectedId) ?? null
    setDraft(found ? { ...found } : null)
  }, [selectedId, items])

  const create = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/activity-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Untitled type ${items.length + 1}`, kind: 'todo' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not create it')
      }
      const data = await res.json()
      await load()
      setSelectedId(data.activityType.id)
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
      const res = await fetch(`/api/activity-types/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: draft.name, kind: draft.kind, is_active: draft.is_active }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not save')
      }
      await load()
      toast({ title: 'Activity type saved' })
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
      const res = await fetch(`/api/activity-types/${draft.id}`, { method: 'DELETE' })
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

  return (
    <VocabularyEditor
      loading={loading}
      items={items}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCreate={create}
      createLabel="New activity type"
      emptyLabel="No activity types yet"
      emptyHint="Every follow-up step picks one of these to say what kind of work it is."
      itemLabel={(t) => t.name}
      itemSubtitle={(t) => KIND_LABELS[t.kind]}
      itemBadge={(t) => (!t.is_active ? 'Off' : t.is_system ? 'Default' : null)}
    >
      {draft && (
        <Card>
          <CardHeader>
            <CardTitle>Edit activity type</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="at-name">Name</Label>
              <Input
                id="at-name"
                value={draft.name}
                maxLength={120}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="at-kind">Kind</Label>
              <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as ActivityType['kind'] })}>
                <SelectTrigger id="at-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPE_KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                What the engine acts on — a Call/Email/Text step can send a reminder; a To-do can&apos;t.
              </p>
            </div>
            <ActiveToggle draft={draft} setDraft={setDraft} />
            <FooterButtons onDelete={remove} onSave={save} saving={saving} />
          </CardContent>
        </Card>
      )}
    </VocabularyEditor>
  )
}

function ActivityOutcomesEditor() {
  const { toast } = useToast()
  const [items, setItems] = useState<ActivityOutcome[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<ActivityOutcome | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/activity-outcomes')
      if (!res.ok) throw new Error('Failed to load outcomes')
      const data = await res.json()
      setItems(data.activityOutcomes ?? [])
    } catch (error) {
      logger.error({ error: formatError(error, 'ACTIVITY_OUTCOMES_LOAD') }, 'Failed to load outcomes')
      toast({ title: 'Could not load outcomes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const found = items.find((o) => o.id === selectedId) ?? null
    setDraft(found ? { ...found } : null)
  }, [selectedId, items])

  const create = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/activity-outcomes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `Untitled outcome ${items.length + 1}` }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not create it')
      }
      const data = await res.json()
      await load()
      setSelectedId(data.activityOutcome.id)
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
      const res = await fetch(`/api/activity-outcomes/${draft.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          halts_chain: draft.halts_chain,
          is_active: draft.is_active,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not save')
      }
      await load()
      toast({ title: 'Outcome saved' })
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
      const res = await fetch(`/api/activity-outcomes/${draft.id}`, { method: 'DELETE' })
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

  return (
    <VocabularyEditor
      loading={loading}
      items={items}
      selectedId={selectedId}
      onSelect={setSelectedId}
      onCreate={create}
      createLabel="New outcome"
      emptyLabel="No outcomes yet"
      emptyHint="Completing a step picks one of these to say how it went, and whether the chain keeps going."
      itemLabel={(o) => o.name}
      itemSubtitle={(o) => (o.halts_chain ? 'Stops the chain' : 'Advances the chain')}
      itemBadge={(o) => (!o.is_active ? 'Off' : o.is_system ? 'Default' : null)}
    >
      {draft && (
        <Card>
          <CardHeader>
            <CardTitle>Edit outcome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ao-name">Name</Label>
              <Input
                id="ao-name"
                value={draft.name}
                maxLength={120}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border p-3">
              <div>
                <Label htmlFor="ao-halts">Stops the chain</Label>
                <p className="text-xs text-muted-foreground">
                  Off: completing a step with this outcome moves the chain to its next step, same as
                  any other outcome. On: the chain stops here instead — for outcomes like &quot;Not
                  interested&quot; where there&apos;s nothing left to do.
                </p>
              </div>
              <Switch
                id="ao-halts"
                checked={draft.halts_chain}
                onCheckedChange={(checked) => setDraft({ ...draft, halts_chain: checked })}
              />
            </div>
            <ActiveToggle draft={draft} setDraft={setDraft} />
            <FooterButtons onDelete={remove} onSave={save} saving={saving} />
          </CardContent>
        </Card>
      )}
    </VocabularyEditor>
  )
}

function ActiveToggle<T extends { is_active: boolean }>({
  draft,
  setDraft,
}: {
  draft: T
  setDraft: (d: T) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-t pt-4">
      <div>
        <Label htmlFor="vocab-active">Available to use</Label>
        <p className="text-xs text-muted-foreground">
          Turning this off hides it from new steps without breaking anything already using it.
        </p>
      </div>
      <Switch
        id="vocab-active"
        checked={draft.is_active}
        onCheckedChange={(checked) => setDraft({ ...draft, is_active: checked })}
      />
    </div>
  )
}

function FooterButtons({
  onDelete,
  onSave,
  saving,
}: {
  onDelete: () => void
  onSave: () => void
  saving: boolean
}) {
  return (
    <div className="flex justify-between gap-2">
      <Button variant="outline" onClick={onDelete} disabled={saving}>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
      <Button onClick={onSave} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save changes
      </Button>
    </div>
  )
}

interface VocabularyItem {
  id: string
}

function VocabularyEditor<T extends VocabularyItem>({
  loading,
  items,
  selectedId,
  onSelect,
  onCreate,
  createLabel,
  emptyLabel,
  emptyHint,
  itemLabel,
  itemSubtitle,
  itemBadge,
  children,
}: {
  loading: boolean
  items: T[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  createLabel: string
  emptyLabel: string
  emptyHint: string
  itemLabel: (item: T) => string
  itemSubtitle: (item: T) => string
  itemBadge: (item: T) => string | null
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {createLabel}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ListChecks className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{emptyLabel}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{emptyHint}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[240px_1fr]">
          <ul className="space-y-1">
            {items.map((item) => {
              const badge = itemBadge(item)
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      item.id === selectedId ? 'border-primary bg-primary/5' : 'hover:bg-muted'
                    }`}
                  >
                    <span className="block truncate font-medium">{itemLabel(item)}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {itemSubtitle(item)}
                    </span>
                    {badge && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {badge}
                      </Badge>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>

          {children ?? (
            <Card>
              <CardContent className="flex h-full items-center justify-center py-16 text-center text-sm text-muted-foreground">
                Pick one to edit it.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
