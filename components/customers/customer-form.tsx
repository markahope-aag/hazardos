import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { customerSchema, CUSTOMER_STATUS_OPTIONS, CUSTOMER_SOURCE_OPTIONS, CONTACT_TYPE_OPTIONS, CONTACT_ROLE_OPTIONS } from '@/lib/validations/customer'
import { useFormAnalytics } from '@/lib/hooks/use-analytics'
import { useSearchCompanies } from '@/lib/hooks/use-companies'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { logger, formatError } from '@/lib/utils/logger'
import type { CustomerFormData } from '@/lib/validations/customer'
import type { Customer, CustomerStatus, CustomerSource, ContactType, ContactRole } from '@/types/database'

interface CustomerFormProps {
  customer?: Customer
  onSubmit: (data: CustomerFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  submitLabel?: string
}

export default function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save Contact'
}: CustomerFormProps) {
  const formAnalytics = useFormAnalytics('customer', customer ? 'edit_customer' : 'create_customer')
  const { profile } = useMultiTenantAuth()

  // Editing an existing address is admin-only (enforced at the DB too).
  // Creating a brand-new contact always gets full access.
  const role = profile?.role
  const isAdminForAddress =
    role === 'admin' || role === 'tenant_owner' || role === 'platform_owner' || role === 'platform_admin'
  const addressLocked = !!customer && !isAdminForAddress

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors }
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ? {
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      title: customer.title || '',
      contact_type: customer.contact_type || 'residential',
      contact_role: customer.contact_role || undefined,
      company_name: customer.company_name || '',
      company_id: customer.company_id || '',
      email: customer.email || '',
      mobile_phone: customer.mobile_phone || '',
      office_phone: customer.office_phone || '',
      phone: customer.phone || '',
      preferred_contact_method: customer.preferred_contact_method as 'email' | 'phone' | 'text' | 'mail' | undefined,
      address_line1: customer.address_line1 || '',
      address_line2: customer.address_line2 || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
      status: customer.status,
      source: customer.source || undefined,
      marketing_consent: customer.marketing_consent,
      opted_into_email: customer.opted_into_email || false,
      opted_into_sms: customer.opted_into_sms || false,
      lead_source: customer.lead_source || '',
      lead_source_detail: customer.lead_source_detail || '',
      referral_source: customer.referral_source || '',
      notes: customer.notes || '',
      next_followup_date: customer.next_followup_date || '',
      next_followup_note: customer.next_followup_note || '',
    } : {
      first_name: '',
      last_name: '',
      contact_type: 'residential' as const,
      status: 'inquiry' as const,
      marketing_consent: false,
    }
  })

  const watchedContactType = watch('contact_type')
  const watchedCompanyName = watch('company_name')
  const { data: companyResults = [] } = useSearchCompanies(watchedContactType === 'commercial' ? (watchedCompanyName || '') : '')

  useEffect(() => {
    formAnalytics.startTracking(20)
  }, [formAnalytics])

  const handleFormSubmit = handleSubmit(async (data: CustomerFormData) => {
    data.name = [data.first_name, data.last_name].filter(Boolean).join(' ')
    // Coerce empty strings to undefined so DB receives null instead of ""
    if (!data.next_followup_date) data.next_followup_date = undefined
    if (!data.next_followup_note) data.next_followup_note = undefined
    if (!data.lead_source) data.lead_source = undefined
    if (!data.lead_source_detail) data.lead_source_detail = undefined
    if (!data.address_line2) data.address_line2 = undefined
    if (!data.office_phone) data.office_phone = undefined
    if (!data.phone) data.phone = undefined
    if (!data.title) data.title = undefined
    if (!data.company_id) data.company_id = undefined
    if (!data.referral_source) data.referral_source = undefined
    try {
      await onSubmit(data)
      formAnalytics.trackSuccess()
    } catch (error) {
      formAnalytics.trackFailure(error instanceof Error ? error.message : 'unknown_error')
      logger.error({ error: formatError(error, 'CONTACT_FORM_ERROR') }, 'Form submission error')
    }
  })

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Section 1: Contact Type */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Type</h3>
        <div className="flex gap-3">
          {CONTACT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setValue('contact_type', option.value as ContactType)
                if (option.value === 'residential') {
                  setValue('company_name', '')
                  setValue('company_id', '')
                  setValue('contact_role', undefined)
                }
              }}
              className={`flex-1 p-3 rounded-lg border-2 text-left transition-colors ${
                watchedContactType === option.value
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div className="text-xs text-muted-foreground">{option.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Section 2: Basic Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="first_name">First Name *</Label>
            <Input id="first_name" {...register('first_name')} />
            {errors.first_name && <p className="text-sm text-destructive mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="last_name">Last Name</Label>
            <Input id="last_name" {...register('last_name')} />
          </div>
        </div>
        {watchedContactType === 'commercial' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="title">Title / Role</Label>
              <Input id="title" {...register('title')} placeholder="e.g., Facilities Manager" />
            </div>
            <div>
              <Label htmlFor="contact_role">Contact Role</Label>
              <Select value={watch('contact_role') || ''} onValueChange={(v) => setValue('contact_role', v as ContactRole)}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {CONTACT_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {watchedContactType === 'commercial' && (
          <div>
            <Label htmlFor="company_name">Company *</Label>
            <Input id="company_name" {...register('company_name')} placeholder="Search or enter company name" list="company-suggestions" />
            {companyResults.length > 0 && watchedCompanyName && (
              <datalist id="company-suggestions">
                {companyResults.map((c) => (<option key={c.id} value={c.name} />))}
              </datalist>
            )}
            <p className="text-xs text-muted-foreground mt-1">Type to search existing or enter new</p>
          </div>
        )}
      </div>

      {/* Section 3: Contact Methods */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Methods</h3>
        <div className={`grid grid-cols-1 gap-4 ${watchedContactType === 'commercial' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="mobile_phone">{watchedContactType === 'commercial' ? 'Mobile Phone' : 'Phone'}</Label>
            <Input id="mobile_phone" type="tel" {...register('mobile_phone')} />
          </div>
          {watchedContactType === 'commercial' && (
            <div>
              <Label htmlFor="office_phone">Office Phone</Label>
              <Input id="office_phone" type="tel" {...register('office_phone')} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Preferred Contact Method</Label>
            <Select value={watch('preferred_contact_method') || ''} onValueChange={(v) => setValue('preferred_contact_method', v as 'email' | 'phone' | 'text' | 'mail')}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="text">Text / SMS</SelectItem>
                <SelectItem value="mail">Mail</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center space-x-2">
            <Checkbox id="opted_into_email" checked={watch('opted_into_email')} onCheckedChange={(c) => setValue('opted_into_email', !!c)} />
            <Label htmlFor="opted_into_email" className="text-sm">Opted into email</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="opted_into_sms" checked={watch('opted_into_sms')} onCheckedChange={(c) => setValue('opted_into_sms', !!c)} />
            <Label htmlFor="opted_into_sms" className="text-sm">Opted into SMS</Label>
          </div>
        </div>
      </div>

      {/* Section 4: Relationship */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Relationship</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Status *</Label>
            <Select value={watch('status')} onValueChange={(v) => setValue('status', v as CustomerStatus)}>
              <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {CUSTOMER_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Source</Label>
            <Select value={watch('source') || ''} onValueChange={(v) => setValue('source', v as CustomerSource)}>
              <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {CUSTOMER_SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Section 5: Address */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Address</h3>
          {addressLocked && (
            <span className="text-xs text-muted-foreground">
              Read-only — ask an admin to change the address
            </span>
          )}
        </div>
        <div>
          <Label htmlFor="address_line1">Street Address *</Label>
          <Input id="address_line1" {...register('address_line1')} readOnly={addressLocked} />
          {errors.address_line1 && <p className="text-sm text-destructive mt-1">{errors.address_line1.message}</p>}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="city">City *</Label>
            <Input id="city" {...register('city')} readOnly={addressLocked} />
            {errors.city && <p className="text-sm text-destructive mt-1">{errors.city.message}</p>}
          </div>
          <div>
            <Label htmlFor="state">State *</Label>
            <Input id="state" {...register('state')} placeholder="CO" maxLength={2} readOnly={addressLocked} />
            {errors.state && <p className="text-sm text-destructive mt-1">{errors.state.message}</p>}
          </div>
          <div>
            <Label htmlFor="zip">ZIP *</Label>
            <Input id="zip" {...register('zip')} readOnly={addressLocked} />
            {errors.zip && <p className="text-sm text-destructive mt-1">{errors.zip.message}</p>}
          </div>
        </div>
      </div>

      {/* Section 6: Lead Source */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lead Source</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="lead_source">How did they find us?</Label>
            <Input
              id="lead_source"
              {...register('lead_source')}
              placeholder="Google, Nextdoor, referral from John Smith, repeat customer, walk-in, ..."
            />
            <p className="text-xs text-muted-foreground mt-1">
              Free text — specific is better. This is what drives the Lead Sources chart on the dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Section 7: Notes & Follow-up */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes & Follow-up</h3>
        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} {...register('notes')} placeholder="Add any notes about this contact..." />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="next_followup_date">Next Follow-up Date</Label>
            <Input id="next_followup_date" type="date" {...register('next_followup_date')} />
          </div>
          <div>
            <Label htmlFor="next_followup_note">Follow-up Note</Label>
            <Input id="next_followup_note" {...register('next_followup_note')} placeholder="e.g., Call to discuss estimate" />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
