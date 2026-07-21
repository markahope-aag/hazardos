import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { FormField } from '@/components/ui/form-field'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { customerSchema, CUSTOMER_STATUS_OPTIONS, CUSTOMER_SOURCE_OPTIONS, CONTACT_TYPE_OPTIONS, CONTACT_ROLE_OPTIONS } from '@/lib/validations/customer-form'
import { useFormAnalytics } from '@/lib/hooks/use-analytics'
import { useSearchCompanies } from '@/lib/hooks/use-companies'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { logger, formatError } from '@/lib/utils/logger'
import type { CustomerFormData } from '@/lib/validations/customer-form'
import type { Customer, CustomerStatus, CustomerSource, ContactType, ContactRole } from '@/types/database'

interface CustomerFormProps {
  customer?: Customer
  onSubmit: (data: CustomerFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  submitLabel?: string
  /** Prefill a new contact as commercial for this company (deep link from a company page). */
  initialCompanyName?: string
}

export default function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save Contact',
  initialCompanyName,
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
      contact_type: (customer.contact_type as ContactType | null) || 'residential',
      contact_role: (customer.contact_role as ContactRole | null) || undefined,
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
      status: (customer.status as CustomerStatus | null) ?? 'inquiry',
      source: (customer.source as CustomerSource | null) || undefined,
      marketing_consent: customer.marketing_consent ?? false,
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
      // A deep link from a company page prefills the company and marks the
      // contact commercial; otherwise default to residential.
      contact_type: initialCompanyName ? ('commercial' as const) : ('residential' as const),
      company_name: initialCompanyName || '',
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
        <div className="flex gap-3" role="radiogroup" aria-label="Contact type">
          {CONTACT_TYPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={watchedContactType === option.value}
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
                  : 'border-input hover:border-gray-300'
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
          <FormField label="First Name" required error={errors.first_name?.message}>
            <Input id="first_name" {...register('first_name')} />
          </FormField>
          <FormField label="Last Name" error={errors.last_name?.message}>
            <Input id="last_name" {...register('last_name')} />
          </FormField>
        </div>
        {watchedContactType === 'commercial' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Title / Role" error={errors.title?.message}>
              <Input id="title" {...register('title')} placeholder="e.g., Facilities Manager" />
            </FormField>
            <FormField label="Contact Role" error={errors.contact_role?.message}>
              <Select value={watch('contact_role') || ''} onValueChange={(v) => setValue('contact_role', v as ContactRole)}>
                <SelectTrigger id="contact_role"><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {CONTACT_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        )}
        {watchedContactType === 'commercial' && (
          <FormField
            label="Company"
            required
            error={errors.company_name?.message}
            hint="Type to search existing or enter new"
          >
            <Input id="company_name" {...register('company_name')} placeholder="Search or enter company name" list="company-suggestions" />
          </FormField>
        )}
        {watchedContactType === 'commercial' && companyResults.length > 0 && watchedCompanyName && (
          <datalist id="company-suggestions">
            {companyResults.map((c) => (<option key={c.id} value={c.name} />))}
          </datalist>
        )}
      </div>

      {/* Section 3: Contact Methods */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Contact Methods</h3>
        <div className={`grid grid-cols-1 gap-4 ${watchedContactType === 'commercial' ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          <FormField label="Email" error={errors.email?.message}>
            <Input id="email" type="email" {...register('email')} />
          </FormField>
          <FormField
            label={watchedContactType === 'commercial' ? 'Mobile Phone' : 'Phone'}
            error={errors.mobile_phone?.message}
          >
            <Input id="mobile_phone" type="tel" {...register('mobile_phone')} />
          </FormField>
          {watchedContactType === 'commercial' && (
            <FormField label="Office Phone" error={errors.office_phone?.message}>
              <Input id="office_phone" type="tel" {...register('office_phone')} />
            </FormField>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Preferred Contact Method" error={errors.preferred_contact_method?.message}>
            <Select value={watch('preferred_contact_method') || ''} onValueChange={(v) => setValue('preferred_contact_method', v as 'email' | 'phone' | 'text' | 'mail')}>
              <SelectTrigger id="preferred_contact_method"><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="text">Text / SMS</SelectItem>
                <SelectItem value="mail">Mail</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
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
          <FormField label="Status" required error={errors.status?.message}>
            <Select value={watch('status')} onValueChange={(v) => setValue('status', v as CustomerStatus)}>
              <SelectTrigger id="status"><SelectValue placeholder="Select status" /></SelectTrigger>
              <SelectContent>
                {CUSTOMER_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Source" error={errors.source?.message}>
            <Select value={watch('source') || ''} onValueChange={(v) => setValue('source', v as CustomerSource)}>
              <SelectTrigger id="source"><SelectValue placeholder="Select source" /></SelectTrigger>
              <SelectContent>
                {CUSTOMER_SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
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
        <FormField label="Street Address" required error={errors.address_line1?.message}>
          <Input id="address_line1" {...register('address_line1')} readOnly={addressLocked} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="City" required error={errors.city?.message}>
            <Input id="city" {...register('city')} readOnly={addressLocked} />
          </FormField>
          <FormField label="State" required error={errors.state?.message}>
            <Input id="state" {...register('state')} placeholder="CO" maxLength={2} readOnly={addressLocked} />
          </FormField>
          <FormField label="ZIP" required error={errors.zip?.message}>
            <Input id="zip" {...register('zip')} readOnly={addressLocked} />
          </FormField>
        </div>
      </div>

      {/* Section 6: Lead Source */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Lead Source</h3>
        <FormField
          label="How did they find us?"
          error={errors.lead_source?.message}
          hint="Free text — specific is better. This is what drives the Lead Sources chart on the dashboard."
        >
          <Input
            id="lead_source"
            {...register('lead_source')}
            placeholder="Google, Nextdoor, referral from John Smith, repeat customer, walk-in, ..."
          />
        </FormField>
      </div>

      {/* Section 7: Notes & Follow-up */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes & Follow-up</h3>
        <FormField label="Notes" error={errors.notes?.message}>
          <Textarea id="notes" rows={3} {...register('notes')} placeholder="Add any notes about this contact..." />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Next Follow-up Date" error={errors.next_followup_date?.message}>
            <Input id="next_followup_date" type="date" {...register('next_followup_date')} />
          </FormField>
          <FormField label="Follow-up Note" error={errors.next_followup_note?.message}>
            <Input id="next_followup_note" {...register('next_followup_note')} placeholder="e.g., Call to discuss estimate" />
          </FormField>
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
