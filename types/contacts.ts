// Customer Contacts Types
// Phase 3: Multiple contacts per customer

export type ContactRole = 'primary' | 'billing' | 'site' | 'scheduling' | 'general'
export type ContactMethod = 'email' | 'phone' | 'mobile' | 'any'

export interface CustomerContact {
  id: string
  organization_id: string
  customer_id: string
  name: string
  title?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  role: ContactRole
  is_primary: boolean
  preferred_contact_method?: ContactMethod | null
  notes?: string | null
  created_at: string
  updated_at: string
}

export interface CreateContactInput {
  customer_id: string
  name: string
  title?: string
  email?: string
  phone?: string
  mobile?: string
  role?: ContactRole
  is_primary?: boolean
  preferred_contact_method?: ContactMethod
  notes?: string
}

export interface UpdateContactInput {
  name?: string
  title?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  role?: ContactRole
  is_primary?: boolean
  preferred_contact_method?: ContactMethod | null
  notes?: string | null
}

// Role display configuration
export const contactRoleConfig: Record<ContactRole, { label: string; description: string }> = {
  primary: {
    label: 'Primary',
    description: 'Main point of contact',
  },
  billing: {
    label: 'Billing',
    description: 'Invoices and payments',
  },
  site: {
    label: 'Site',
    description: 'On-site contact for jobs',
  },
  scheduling: {
    label: 'Scheduling',
    description: 'Scheduling and appointments',
  },
  general: {
    label: 'General',
    description: 'General contact',
  },
}

export const contactMethodConfig: Record<ContactMethod, { label: string }> = {
  email: { label: 'Email' },
  phone: { label: 'Phone' },
  mobile: { label: 'Mobile' },
  any: { label: 'Any' },
}
