'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { ArrowLeft, Copy, Check } from 'lucide-react'

// Mirrors ApiKeyService.getAvailableScopes(). Kept here as a static list so the
// page stays a client component; the POST route validates against the service's
// own list, so an out-of-date entry is rejected rather than silently accepted.
const SCOPES = [
  { value: 'customers:read', label: 'Read Customers' },
  { value: 'customers:write', label: 'Write Customers' },
  { value: 'companies:read', label: 'Read Companies' },
  { value: 'companies:write', label: 'Write Companies' },
  { value: 'jobs:read', label: 'Read Jobs' },
  { value: 'jobs:write', label: 'Write Jobs' },
  { value: 'invoices:read', label: 'Read Invoices' },
  { value: 'invoices:write', label: 'Write Invoices' },
  { value: 'estimates:read', label: 'Read Estimates' },
  { value: 'estimates:write', label: 'Write Estimates' },
]

export default function NewApiKeyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [scopes, setScopes] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const toggleScope = (value: string) =>
    setScopes((prev) => (prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]))

  const submit = async () => {
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }
    if (scopes.length === 0) {
      toast({ title: 'Select at least one scope', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scopes }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create API key')
      }
      const data = await res.json()
      setCreatedKey(data.key)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create API key',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const copyKey = async () => {
    if (!createdKey) return
    await navigator.clipboard.writeText(createdKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Once the key is created it's shown exactly once — the server only stores a
  // hash, so there's no way to retrieve it later.
  if (createdKey) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">API Key Created</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Copy your key now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is the only time the full key is shown. Store it somewhere safe —
              we only keep a hashed version.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm break-all">
                {createdKey}
              </code>
              <Button size="icon" variant="outline" onClick={copyKey} aria-label="Copy key">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={() => router.push('/settings/api')}>Done</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings/api"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-bold">Create API Key</h1>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Zapier integration"
            />
          </div>

          <div className="space-y-3">
            <Label>Scopes</Label>
            <div className="grid grid-cols-2 gap-2">
              {SCOPES.map((s) => (
                <label key={s.value} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={scopes.includes(s.value)}
                    onCheckedChange={() => toggleScope(s.value)}
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" asChild>
              <Link href="/settings/api">Cancel</Link>
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create Key'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
