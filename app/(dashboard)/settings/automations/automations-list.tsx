'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { logger, formatError } from '@/lib/utils/logger'
import { Plus, ChevronRight, Workflow, Loader2 } from 'lucide-react'

interface ProcessSummary {
  id: string
  name: string
  description: string | null
  is_active: boolean
  step_count: number
}

export function AutomationsList() {
  const { toast } = useToast()
  const [processes, setProcesses] = useState<ProcessSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/activity-processes')
      if (!res.ok) throw new Error('Failed to load automations')
      const data = await res.json()
      setProcesses(data.processes ?? [])
    } catch (error) {
      logger.error({ error: formatError(error, 'AUTOMATIONS_LOAD') }, 'Failed to load automations')
      toast({ title: 'Could not load automations', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const create = async () => {
    if (!name.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/activity-processes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Could not create the automation')
      }
      setName('')
      setOpen(false)
      await load()
    } catch (error) {
      toast({
        title: 'Could not create it',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New automation
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New automation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="automation-name">What does it do?</Label>
                <Input
                  id="automation-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="After a proposal goes out"
                  maxLength={120}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') create()
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Name it after the moment it runs. You will add the steps next, and it
                  stays switched off until you turn it on.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={create} disabled={creating || !name.trim()}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : processes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Workflow className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No automations yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              A good first one is the chain you run after sending a proposal: a reminder to
              chase it, a follow-up email, a call if you have heard nothing.
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {processes.map((p) => (
            <li key={p.id}>
              <Link href={`/settings/automations/${p.id}`}>
                <Card className="transition-colors hover:border-primary/40">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{p.name}</span>
                        {p.is_active ? (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                            On
                          </Badge>
                        ) : (
                          <Badge variant="outline">Off</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {p.step_count === 0
                          ? 'No steps yet'
                          : `${p.step_count} step${p.step_count === 1 ? '' : 's'}`}
                        {p.description ? ` · ${p.description}` : ''}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
