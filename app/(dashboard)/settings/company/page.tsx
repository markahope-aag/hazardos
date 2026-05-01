'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Save, Building, Clock, Camera } from 'lucide-react'
import { DEFAULT_TIMEZONE, US_TIMEZONE_OPTIONS } from '@/lib/timezone'

const DEFAULT_PHOTO_RETENTION_DAYS = 1095 // 3 years
const MIN_PHOTO_RETENTION_DAYS = 90
const MAX_PHOTO_RETENTION_DAYS = 3650 // 10 years

interface CompanyForm {
  name: string
  email: string
  phone: string
  website: string
  license_number: string
  address: string
  city: string
  state: string
  zip: string
  timezone: string
  photo_retention_days: number
}

const EMPTY: CompanyForm = {
  name: '',
  email: '',
  phone: '',
  website: '',
  license_number: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  timezone: DEFAULT_TIMEZONE,
  photo_retention_days: DEFAULT_PHOTO_RETENTION_DAYS,
}

export default function CompanyProfilePage() {
  const { toast } = useToast()
  const [form, setForm] = useState<CompanyForm>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/organizations/me')
        if (!res.ok) throw new Error('Failed to load company profile')
        const data = await res.json()
        const org = data.organization || {}
        setForm({
          name: org.name || '',
          email: org.email || '',
          phone: org.phone || '',
          website: org.website || '',
          license_number: org.license_number || '',
          address: org.address || '',
          city: org.city || '',
          state: org.state || '',
          zip: org.zip || '',
          timezone: org.timezone || DEFAULT_TIMEZONE,
          photo_retention_days: org.photo_retention_days ?? DEFAULT_PHOTO_RETENTION_DAYS,
        })
      } catch (e) {
        toast({
          title: 'Failed to load',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  const update = <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({
        title: 'Company name is required',
        variant: 'destructive',
      })
      return
    }
    if (
      !Number.isFinite(form.photo_retention_days)
      || form.photo_retention_days < MIN_PHOTO_RETENTION_DAYS
      || form.photo_retention_days > MAX_PHOTO_RETENTION_DAYS
    ) {
      toast({
        title: 'Photo retention out of range',
        description: `Must be between ${MIN_PHOTO_RETENTION_DAYS} and ${MAX_PHOTO_RETENTION_DAYS} days.`,
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/organizations/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'Save failed')
      }
      toast({ title: 'Company profile updated' })
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Building className="h-6 w-6" />
          Company Profile
        </h1>
        <p className="text-muted-foreground">
          Business information, contact details, and license number. These fields appear on
          proposals, invoices, and customer-facing documents.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business</CardTitle>
            <CardDescription>
              Legal business name and what customers will see on your paperwork.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Company name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                required
                maxLength={255}
              />
            </div>
            <div>
              <Label htmlFor="license_number">License number</Label>
              <Input
                id="license_number"
                value={form.license_number}
                onChange={(e) => update('license_number', e.target.value)}
                placeholder="State abatement license, EPA certification, etc."
                maxLength={100}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>Where customers and vendors can reach you.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="office@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => update('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Office address</CardTitle>
            <CardDescription>
              Used as the default return address on invoices and proposals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Street address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => update('address', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => update('city', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => update('state', e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder="CO"
                />
              </div>
              <div>
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" value={form.zip} onChange={(e) => update('zip', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Locale
            </CardTitle>
            <CardDescription>
              Your local timezone drives every date on the dashboard, schedule,
              and reports — "today", "upcoming jobs", date pickers, and
              period windows are all computed here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={form.timezone}
                onValueChange={(v) => update('timezone', v)}
              >
                <SelectTrigger id="timezone">
                  <SelectValue placeholder="Select your timezone" />
                </SelectTrigger>
                <SelectContent>
                  {US_TIMEZONE_OPTIONS.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Currently set to <code className="font-mono">{form.timezone}</code>.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Survey photo retention
            </CardTitle>
            <CardDescription>
              How long survey photos and videos are kept before they're permanently
              deleted. Photos remain visible to the whole team for the first 180 days,
              then move to admin-only access until they're deleted at the end of the
              retention window.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-md space-y-2">
              <Label htmlFor="photo_retention_days">Retention window (days)</Label>
              <Input
                id="photo_retention_days"
                type="number"
                inputMode="numeric"
                min={MIN_PHOTO_RETENTION_DAYS}
                max={MAX_PHOTO_RETENTION_DAYS}
                step={1}
                value={form.photo_retention_days}
                onChange={(e) =>
                  update('photo_retention_days', Number(e.target.value) || 0)
                }
              />
              <p className="text-xs text-muted-foreground">
                Default is {DEFAULT_PHOTO_RETENTION_DAYS} days (3 years). Allowed range:{' '}
                {MIN_PHOTO_RETENTION_DAYS}–{MAX_PHOTO_RETENTION_DAYS} days. Changing this
                value retroactively recomputes the deletion date for every existing
                photo in your organization.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
