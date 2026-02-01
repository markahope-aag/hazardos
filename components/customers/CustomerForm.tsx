import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
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
import { Checkbox } from '@/components/ui/checkbox'
import { customerSchema, US_STATES, CUSTOMER_STATUS_OPTIONS, CUSTOMER_SOURCE_OPTIONS } from '@/lib/validations/customer'
import type { CustomerFormData } from '@/lib/validations/customer'
import type { Customer, CustomerStatus, CustomerSource } from '@/types/database'

interface CustomerFormProps {
  customer?: Customer // For edit mode
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
  submitLabel = 'Save Customer'
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ? {
      name: customer.name,
      company_name: customer.company_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address_line1: customer.address_line1 || '',
      address_line2: customer.address_line2 || '',
      city: customer.city || '',
      state: customer.state || '',
      zip: customer.zip || '',
      status: customer.status,
      source: customer.source || undefined,
      marketing_consent: customer.marketing_consent,
      notes: customer.notes || '',
    } : {
      name: '',
      status: 'lead' as const,
      marketing_consent: false,
    }
  })

  const watchedStatus = watch('status')
  const watchedSource = watch('source')
  const watchedMarketingConsent = watch('marketing_consent')

  const handleFormSubmit = handleSubmit(async (data: CustomerFormData) => {
    try {
      await onSubmit(data)
    } catch {
      // Error handling is done in the mutation hooks
    }
  })

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name')}
              className={errors.name ? 'border-red-500' : ''}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-red-600 mt-1" role="alert">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              {...register('company_name')}
              className={errors.company_name ? 'border-red-500' : ''}
            />
            {errors.company_name && (
              <p className="text-sm text-red-600 mt-1">{errors.company_name.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-red-600 mt-1" role="alert">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              className={errors.phone ? 'border-red-500' : ''}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
            />
            {errors.phone && (
              <p id="phone-error" className="text-sm text-red-600 mt-1" role="alert">{errors.phone.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Address</h3>
        
        <div>
          <Label htmlFor="address_line1">Address Line 1</Label>
          <Input
            id="address_line1"
            {...register('address_line1')}
            className={errors.address_line1 ? 'border-red-500' : ''}
          />
          {errors.address_line1 && (
            <p className="text-sm text-red-600 mt-1">{errors.address_line1.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="address_line2">Address Line 2</Label>
          <Input
            id="address_line2"
            {...register('address_line2')}
            className={errors.address_line2 ? 'border-red-500' : ''}
          />
          {errors.address_line2 && (
            <p className="text-sm text-red-600 mt-1">{errors.address_line2.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              {...register('city')}
              className={errors.city ? 'border-red-500' : ''}
            />
            {errors.city && (
              <p className="text-sm text-red-600 mt-1">{errors.city.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="state">State</Label>
            <Select value={watch('state') || ''} onValueChange={(value: string) => setValue('state', value)}>
              <SelectTrigger className={errors.state ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {US_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.state && (
              <p className="text-sm text-red-600 mt-1">{errors.state.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="zip">ZIP Code</Label>
            <Input
              id="zip"
              {...register('zip')}
              className={errors.zip ? 'border-red-500' : ''}
            />
            {errors.zip && (
              <p className="text-sm text-red-600 mt-1">{errors.zip.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Status & Source */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Customer Details</h3>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="status">Status *</Label>
            <Select value={watchedStatus} onValueChange={(value: string) => setValue('status', value as CustomerStatus)}>
              <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-red-600 mt-1">{errors.status.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="source">Source</Label>
            <Select value={watchedSource || ''} onValueChange={(value: string) => setValue('source', value as CustomerSource)}>
              <SelectTrigger className={errors.source ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {CUSTOMER_SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.source && (
              <p className="text-sm text-red-600 mt-1">{errors.source.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={4}
          placeholder="Add any additional notes about this customer..."
          {...register('notes')}
          className={errors.notes ? 'border-red-500' : ''}
        />
        {errors.notes && (
          <p className="text-sm text-red-600 mt-1">{errors.notes.message}</p>
        )}
      </div>

      {/* Marketing Consent */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="marketing_consent"
          checked={watchedMarketingConsent}
          onCheckedChange={(checked) => setValue('marketing_consent', !!checked)}
        />
        <Label htmlFor="marketing_consent" className="text-sm">
          Customer consents to marketing communications
        </Label>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}