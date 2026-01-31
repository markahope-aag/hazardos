import { z } from 'zod'
import type { CustomerStatus, CustomerSource } from '@/types/database'

// Customer form validation schema
export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
  company_name: z.string().max(255, 'Company name is too long').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number is too long').optional().or(z.literal('')),
  address_line1: z.string().max(255, 'Address is too long').optional().or(z.literal('')),
  address_line2: z.string().max(255, 'Address is too long').optional().or(z.literal('')),
  city: z.string().max(100, 'City is too long').optional().or(z.literal('')),
  state: z.string().max(50, 'State is too long').optional().or(z.literal('')),
  zip: z.string().max(10, 'ZIP code is too long').optional().or(z.literal('')),
  status: z.enum(['lead', 'prospect', 'customer', 'inactive']),
  source: z.enum(['phone', 'website', 'mail', 'referral', 'other']).optional(),
  marketing_consent: z.boolean(),
  notes: z.string().max(2000, 'Notes are too long').optional().or(z.literal('')),
})

export type CustomerFormData = z.infer<typeof customerSchema>

// Default values for new customer form
export const defaultCustomerValues: Partial<CustomerFormData> = {
  status: 'lead',
  marketing_consent: false,
}

// US States for dropdown
export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

// Customer status options for dropdowns
export const CUSTOMER_STATUS_OPTIONS = [
  { value: 'lead' as CustomerStatus, label: 'Lead', description: 'Initial contact' },
  { value: 'prospect' as CustomerStatus, label: 'Prospect', description: 'Survey scheduled/completed' },
  { value: 'customer' as CustomerStatus, label: 'Customer', description: 'Job completed' },
  { value: 'inactive' as CustomerStatus, label: 'Inactive', description: 'No recent activity' },
]

// Customer source options for dropdowns
export const CUSTOMER_SOURCE_OPTIONS = [
  { value: 'phone' as CustomerSource, label: 'Phone Call' },
  { value: 'website' as CustomerSource, label: 'Website' },
  { value: 'mail' as CustomerSource, label: 'Direct Mail' },
  { value: 'referral' as CustomerSource, label: 'Referral' },
  { value: 'other' as CustomerSource, label: 'Other' },
]