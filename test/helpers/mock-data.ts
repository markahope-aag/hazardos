import type { Customer, CustomerInsert, CustomerUpdate, SiteSurvey } from '@/types/database'

export const createMockCustomer = (overrides: Partial<Customer> = {}): Customer => ({
  id: 'customer-1',
  organization_id: 'test-org-id',
  name: 'John Doe',
  company_name: null,
  email: 'john@example.com',
  phone: '(555) 123-4567',
  address_line1: '123 Main St',
  address_line2: null,
  city: 'Anytown',
  state: 'CA',
  zip: '12345',
  status: 'prospect',
  source: 'website',
  communication_preferences: { email: true, sms: false, mail: false },
  marketing_consent: false,
  marketing_consent_date: null,
  notes: null,
  created_at: '2026-01-31T10:00:00Z',
  updated_at: '2026-01-31T10:00:00Z',
  created_by: null,
  ...overrides
})

export const createMockCustomerInsert = (overrides: Partial<CustomerInsert> = {}): CustomerInsert => ({
  organization_id: 'test-org-id',
  name: 'New Customer',
  company_name: null,
  email: 'new@example.com',
  phone: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  zip: null,
  status: 'lead',
  source: null,
  communication_preferences: null,
  marketing_consent: false,
  marketing_consent_date: null,
  notes: null,
  created_by: null,
  ...overrides
})

export const createMockCustomerUpdate = (overrides: Partial<CustomerUpdate> = {}): CustomerUpdate => ({
  name: 'Updated Customer',
  ...overrides
})

export const createMockSiteSurvey = (overrides: Partial<SiteSurvey> = {}): SiteSurvey => {
  const base = {
  id: 'survey-1',
  organization_id: 'test-org-id',
  estimator_id: null,
  customer_id: null,
  created_at: '2026-01-31T10:00:00Z',
  updated_at: '2026-01-31T10:00:00Z',
  job_name: 'Test Survey',
  customer_name: 'Test Customer',
  customer_email: null,
  customer_phone: null,
  site_address: '123 Test St',
  site_city: 'Test City',
  site_state: 'CA',
  site_zip: '12345',
  site_location: null,
  hazard_type: 'asbestos',
  hazard_subtype: null,
  containment_level: null,
  area_sqft: null,
  linear_ft: null,
  volume_cuft: null,
  material_type: null,
  occupied: false,
  access_issues: null,
  special_conditions: null,
  clearance_required: false,
  clearance_lab: null,
  regulatory_notifications_needed: false,
  notes: null,
  status: 'draft',
  scheduled_date: null,
  scheduled_time_start: null,
  scheduled_time_end: null,
  assigned_to: null,
  appointment_status: null,
  building_type: null,
  year_built: null,
  submitted_at: null
  }
  
  return {
    ...base,
    ...overrides
  } as SiteSurvey
}

export const createMockCustomerArray = (count: number = 2): Customer[] => {
  return Array.from({ length: count }, (_, i) => createMockCustomer({
    id: `customer-${i + 1}`,
    name: `Customer ${i + 1}`,
    email: `customer${i + 1}@example.com`
  }))
}