'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { useCompany, useUpdateCompany } from '@/lib/hooks/use-companies'

interface CompanyForm {
  name: string
  industry: string
  company_type: string
  account_status: string
  primary_email: string
  primary_phone: string
  website: string
  billing_address_line1: string
  billing_address_line2: string
  billing_city: string
  billing_state: string
  billing_zip: string
  service_address_line1: string
  service_address_line2: string
  service_city: string
  service_state: string
  service_zip: string
  notes: string
}

const EMPTY: CompanyForm = {
  name: '',
  industry: '',
  company_type: '',
  account_status: '',
  primary_email: '',
  primary_phone: '',
  website: '',
  billing_address_line1: '',
  billing_address_line2: '',
  billing_city: '',
  billing_state: '',
  billing_zip: '',
  service_address_line1: '',
  service_address_line2: '',
  service_city: '',
  service_state: '',
  service_zip: '',
  notes: '',
}

const COMPANY_TYPES = [
  { value: 'residential_property_mgr', label: 'Residential property manager' },
  { value: 'commercial_property_mgr', label: 'Commercial property manager' },
  { value: 'general_contractor', label: 'General contractor' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'hoa', label: 'HOA' },
  { value: 'government', label: 'Government' },
  { value: 'direct_homeowner', label: 'Direct homeowner' },
  { value: 'other', label: 'Other' },
]

const ACCOUNT_STATUSES = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'churned', label: 'Churned' },
]

export default function EditCompanyPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const companyId = params.id as string

  const { data: company, isLoading } = useCompany(companyId)
  const updateCompany = useUpdateCompany()

  const [form, setForm] = useState<CompanyForm>(EMPTY)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!company || hydrated) return
    setForm({
      name: company.name || '',
      industry: company.industry || '',
      company_type: company.company_type || '',
      account_status: company.account_status || '',
      primary_email: company.primary_email || company.email || '',
      primary_phone: company.primary_phone || company.phone || '',
      website: company.website || '',
      billing_address_line1: company.billing_address_line1 || '',
      billing_address_line2: company.billing_address_line2 || '',
      billing_city: company.billing_city || '',
      billing_state: company.billing_state || '',
      billing_zip: company.billing_zip || '',
      service_address_line1: company.service_address_line1 || '',
      service_address_line2: company.service_address_line2 || '',
      service_city: company.service_city || '',
      service_state: company.service_state || '',
      service_zip: company.service_zip || '',
      notes: company.notes || '',
    })
    setHydrated(true)
  }, [company, hydrated])

  const update = <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' })
      return
    }

    const updates: Record<string, unknown> = { name: form.name.trim() }
    // Include every other field, converting empty strings to null so
    // users can clear values they previously set.
    for (const [key, value] of Object.entries(form) as [keyof CompanyForm, string][]) {
      if (key === 'name') continue
      updates[key] = value === '' ? null : value
    }

    try {
      await updateCompany.mutateAsync({ id: companyId, updates: updates as never })
      router.push(`/crm/companies/${companyId}`)
    } catch {
      // useUpdateCompany shows its own toast on failure
    }
  }

  if (isLoading || !hydrated) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href={`/crm/companies/${companyId}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to company
      </Link>

      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6" />
          Edit {company?.name || 'Company'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Business</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
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
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => update('industry', e.target.value)}
              />
            </div>
            <div>
              <Label>Company type</Label>
              <Select
                value={form.company_type}
                onValueChange={(v) => update('company_type', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {COMPANY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Account status</Label>
              <Select
                value={form.account_status}
                onValueChange={(v) => update('account_status', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary_email">Primary email</Label>
              <Input
                id="primary_email"
                type="email"
                value={form.primary_email}
                onChange={(e) => update('primary_email', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="primary_phone">Primary phone</Label>
              <Input
                id="primary_phone"
                type="tel"
                value={form.primary_phone}
                onChange={(e) => update('primary_phone', e.target.value)}
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
            <CardTitle>Billing address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddressFields form={form} update={update} prefix="billing_" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddressFields form={form} update={update} prefix="service_" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={4}
              placeholder="Internal notes about this company…"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={`/crm/companies/${companyId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={updateCompany.isPending}>
            {updateCompany.isPending ? (
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

// Small helper so billing + service blocks don't duplicate 15 lines of
// TSX each. `prefix` must match one of the field name prefixes in the
// CompanyForm type.
function AddressFields({
  form,
  update,
  prefix,
}: {
  form: CompanyForm
  update: <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => void
  prefix: 'billing_' | 'service_'
}) {
  const k = (suffix: string) => (`${prefix}${suffix}`) as keyof CompanyForm
  return (
    <>
      <div>
        <Label htmlFor={k('address_line1')}>Street address</Label>
        <Input
          id={k('address_line1')}
          value={form[k('address_line1')]}
          onChange={(e) => update(k('address_line1'), e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={k('address_line2')}>Address line 2</Label>
        <Input
          id={k('address_line2')}
          value={form[k('address_line2')]}
          onChange={(e) => update(k('address_line2'), e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Label htmlFor={k('city')}>City</Label>
          <Input
            id={k('city')}
            value={form[k('city')]}
            onChange={(e) => update(k('city'), e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={k('state')}>State</Label>
          <Input
            id={k('state')}
            value={form[k('state')]}
            onChange={(e) => update(k('state'), e.target.value.toUpperCase())}
            maxLength={2}
            placeholder="CO"
          />
        </div>
        <div>
          <Label htmlFor={k('zip')}>ZIP</Label>
          <Input
            id={k('zip')}
            value={form[k('zip')]}
            onChange={(e) => update(k('zip'), e.target.value)}
          />
        </div>
      </div>
    </>
  )
}
