import { z } from 'zod'
import type { CustomerStatus, CustomerSource, ContactType, ContactRole } from '@/types/database'

// Contact type options
export const CONTACT_TYPE_OPTIONS = [
  { value: 'residential' as ContactType, label: 'Residential', description: 'Individual / homeowner' },
  { value: 'commercial' as ContactType, label: 'Commercial', description: 'Business / organization' },
]

// Contact role options
export const CONTACT_ROLE_OPTIONS = [
  { value: 'decision_maker' as ContactRole, label: 'Decision Maker' },
  { value: 'influencer' as ContactRole, label: 'Influencer' },
  { value: 'billing' as ContactRole, label: 'Billing' },
  { value: 'property_manager' as ContactRole, label: 'Property Manager' },
  { value: 'site_contact' as ContactRole, label: 'Site Contact' },
  { value: 'other' as ContactRole, label: 'Other' },
]

// Customer form validation schema
export const customerSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100),
  last_name: z.string().max(100).optional().or(z.literal('')),
  name: z.string().optional(), // computed from first + last
  title: z.string().max(100).optional().or(z.literal('')),
  contact_type: z.enum(['residential', 'commercial']),
  contact_role: z.enum(['decision_maker', 'influencer', 'billing', 'property_manager', 'site_contact', 'other']).optional(),
  company_name: z.string().max(255, 'Company name is too long').optional().or(z.literal('')),
  company_id: z.string().uuid().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  mobile_phone: z.string().max(20).optional().or(z.literal('')),
  office_phone: z.string().max(20).optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone number is too long').optional().or(z.literal('')),
  preferred_contact_method: z.enum(['email', 'phone', 'text', 'mail']).optional(),
  address_line1: z.string().min(1, 'Street address is required').max(255, 'Address is too long'),
  address_line2: z.string().max(255, 'Address is too long').optional().or(z.literal('')),
  city: z.string().min(1, 'City is required').max(100, 'City is too long'),
  state: z.string().min(1, 'State is required').max(50, 'State is too long'),
  zip: z.string().min(1, 'ZIP code is required').max(10, 'ZIP code is too long'),
  status: z.enum(['lead', 'prospect', 'customer', 'inactive']),
  source: z.enum(['phone', 'website', 'mail', 'referral', 'other']).optional(),
  marketing_consent: z.boolean(),
  opted_into_email: z.boolean().optional(),
  opted_into_sms: z.boolean().optional(),
  lead_source: z.string().max(100).optional().or(z.literal('')),
  lead_source_detail: z.string().max(255).optional().or(z.literal('')),
  referred_by_contact_id: z.string().uuid().optional().or(z.literal('')),
  account_owner_id: z.string().uuid().optional().or(z.literal('')),
  referral_source: z.string().max(255).optional().or(z.literal('')),
  insurance_carrier: z.string().max(255).optional().or(z.literal('')),
  insurance_policy_number: z.string().max(100).optional().or(z.literal('')),
  notes: z.string().max(2000, 'Notes are too long').optional().or(z.literal('')),
  next_followup_date: z.string().optional().or(z.literal('')),
  next_followup_note: z.string().max(500).optional().or(z.literal('')),
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