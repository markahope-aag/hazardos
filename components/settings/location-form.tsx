'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Save } from 'lucide-react'
import type { Location } from '@/types/integrations'

interface LocationFormProps {
  location?: Location
}

interface FormState {
  name: string
  code: string
  address_line1: string
  address_line2: string
  city: string
  state: string
  zip: string
  country: string
  phone: string
  email: string
  timezone: string
  is_headquarters: boolean
  is_active: boolean
}

const TIMEZONES: Array<{ value: string; label: string }> = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
]

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA',
  'RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]

function toFormState(loc?: Location): FormState {
  return {
    name: loc?.name ?? '',
    code: loc?.code ?? '',
    address_line1: loc?.address_line1 ?? '',
    address_line2: loc?.address_line2 ?? '',
    city: loc?.city ?? '',
    state: loc?.state ?? '',
    zip: loc?.zip ?? '',
    country: loc?.country ?? 'US',
    phone: loc?.phone ?? '',
    email: loc?.email ?? '',
    timezone: loc?.timezone ?? 'America/New_York',
    is_headquarters: loc?.is_headquarters ?? false,
    is_active: loc?.is_active ?? true,
  }
}

export function LocationForm({ location }: LocationFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = Boolean(location)

  const [form, setForm] = useState<FormState>(toFormState(location))
  const [saving, setSaving] = useState(false)

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const url = isEdit ? `/api/locations/${location!.id}` : '/api/locations'
      const method = isEdit ? 'PATCH' : 'POST'

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        code: form.code.trim() || null,
        address_line1: form.address_line1.trim() || null,
        address_line2: form.address_line2.trim() || null,
        city: form.city.trim() || null,
        state: form.state || null,
        zip: form.zip.trim() || null,
        country: form.country || 'US',
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        timezone: form.timezone,
        is_headquarters: form.is_headquarters,
      }
      if (isEdit) payload.is_active = form.is_active

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message || 'Failed to save location')
      }

      toast({
        title: isEdit ? 'Location updated' : 'Location created',
      })
      router.push('/settings/locations')
      router.refresh()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to save location',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Location details</CardTitle>
          <CardDescription>
            Basic information about this office or service area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                placeholder="e.g. Phoenix Office"
                required
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Short code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setField('code', e.target.value)}
                placeholder="e.g. PHX"
                maxLength={20}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="office@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={form.timezone}
              onValueChange={(v) => setField('timezone', v)}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
          <CardDescription>Used on proposals, invoices, and dispatch.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address_line1">Address line 1</Label>
            <Input
              id="address_line1"
              value={form.address_line1}
              onChange={(e) => setField('address_line1', e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_line2">Address line 2</Label>
            <Input
              id="address_line2"
              value={form.address_line2}
              onChange={(e) => setField('address_line2', e.target.value)}
              maxLength={200}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Select value={form.state} onValueChange={(v) => setField('state', v)}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                value={form.zip}
                onChange={(e) => setField('zip', e.target.value)}
                maxLength={20}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_headquarters" className="text-base">
                Headquarters
              </Label>
              <p className="text-sm text-muted-foreground">
                Only one location can be HQ. Setting this will unset any other.
              </p>
            </div>
            <Switch
              id="is_headquarters"
              checked={form.is_headquarters}
              onCheckedChange={(v) => setField('is_headquarters', v)}
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_active" className="text-base">
                  Active
                </Label>
                <p className="text-sm text-muted-foreground">
                  Inactive locations are hidden from dispatch and assignment dropdowns.
                </p>
              </div>
              <Switch
                id="is_active"
                checked={form.is_active}
                onCheckedChange={(v) => setField('is_active', v)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Link href="/settings/locations">
          <Button type="button" variant="outline" disabled={saving}>
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {isEdit ? 'Save changes' : 'Create location'}
        </Button>
      </div>
    </form>
  )
}
