import { describe, it, expect, expectTypeOf } from 'vitest'
import type { 
  Customer, 
  CustomerInsert, 
  CustomerUpdate,
  SiteSurvey,
  SiteSurveyInsert,
  CustomerStatus,
  CustomerSource,
  HazardType,
  SiteSurveyStatus,
  AppointmentStatus
} from '@/types/database'
import { createMockCustomer, createMockSiteSurvey } from '@/test/helpers/mock-data'

describe('Database Types', () => {
  describe('Customer Types', () => {
    it('should have correct Customer type structure', () => {
      const mockCustomer = createMockCustomer({
        id: '550e8400-e29b-41d4-a716-446655440000',
        organization_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '(555) 123-4567',
        address_line1: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        status: 'prospect',
        source: 'website',
        notes: 'Test notes',
        marketing_consent: true
      })

      expectTypeOf(mockCustomer).toEqualTypeOf<Customer>()
      expect(mockCustomer.id).toBeDefined()
      expect(mockCustomer.organization_id).toBeDefined()
      expect(mockCustomer.name).toBeDefined()
    })

    it('should allow CustomerInsert without id and timestamps', () => {
      const mockInsert: CustomerInsert = {
        organization_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Jane Smith',
        email: 'jane@example.com',
        status: 'lead'
      }

      expectTypeOf(mockInsert).toEqualTypeOf<CustomerInsert>()
      expect(mockInsert.name).toBeDefined()
      expect(mockInsert.organization_id).toBeDefined()
    })

    it('should allow partial CustomerUpdate', () => {
      const mockUpdate: CustomerUpdate = {
        name: 'Updated Name',
        status: 'customer'
      }

      expectTypeOf(mockUpdate).toEqualTypeOf<CustomerUpdate>()
    })
  })

  describe('Site Survey Types', () => {
    it('should have correct SiteSurvey type structure', () => {
      const mockSurvey = createMockSiteSurvey({
        id: '550e8400-e29b-41d4-a716-446655440002',
        organization_id: '550e8400-e29b-41d4-a716-446655440001',
        estimator_id: '550e8400-e29b-41d4-a716-446655440003',
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        job_name: 'Test Survey',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '(555) 123-4567',
        site_address: '123 Test St',
        site_city: 'Test City',
        site_state: 'CA',
        site_zip: '12345',
        hazard_type: 'asbestos',
        containment_level: 2,
        area_sqft: 1000,
        occupied: false,
        clearance_required: true,
        status: 'draft'
      })

      expectTypeOf(mockSurvey).toEqualTypeOf<SiteSurvey>()
      expect(mockSurvey.id).toBeDefined()
      expect(mockSurvey.job_name).toBeDefined()
    })

    it('should allow SiteSurveyInsert without id and timestamps', () => {
      const mockInsert: SiteSurveyInsert = {
        organization_id: '550e8400-e29b-41d4-a716-446655440001',
        estimator_id: '550e8400-e29b-41d4-a716-446655440003',
        job_name: 'New Survey',
        customer_name: 'Test Customer',
        site_address: '123 Test St',
        site_city: 'Test City',
        site_state: 'CA',
        site_zip: '12345',
        hazard_type: 'mold'
      }

      expectTypeOf(mockInsert).toEqualTypeOf<SiteSurveyInsert>()
    })
  })

  describe('Enum Types', () => {
    it('should validate CustomerStatus enum values', () => {
      const validStatuses: CustomerStatus[] = ['lead', 'prospect', 'customer', 'inactive']
      
      validStatuses.forEach(status => {
        expectTypeOf(status).toEqualTypeOf<CustomerStatus>()
      })
    })

    it('should validate CustomerSource enum values', () => {
      const validSources: CustomerSource[] = ['phone', 'website', 'mail', 'referral', 'other']
      
      validSources.forEach(source => {
        expectTypeOf(source).toEqualTypeOf<CustomerSource>()
      })
    })

    it('should validate HazardType enum values', () => {
      const validTypes: HazardType[] = ['asbestos', 'mold', 'lead', 'vermiculite', 'other']
      
      validTypes.forEach(type => {
        expectTypeOf(type).toEqualTypeOf<HazardType>()
      })
    })

    it('should validate SiteSurveyStatus enum values', () => {
      const validStatuses: SiteSurveyStatus[] = ['draft', 'submitted', 'estimated', 'quoted', 'scheduled', 'completed']
      
      validStatuses.forEach(status => {
        expectTypeOf(status).toEqualTypeOf<SiteSurveyStatus>()
      })
    })

    it('should validate AppointmentStatus enum values', () => {
      const validStatuses: AppointmentStatus[] = ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']
      
      validStatuses.forEach(status => {
        expectTypeOf(status).toEqualTypeOf<AppointmentStatus>()
      })
    })
  })

  describe('Type Relationships', () => {
    it('should ensure Customer and SiteSurvey can be linked', () => {
      const customer = createMockCustomer({
        id: '550e8400-e29b-41d4-a716-446655440000',
        organization_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'John Doe',
        status: 'prospect'
      })

      const survey = createMockSiteSurvey({
        id: '550e8400-e29b-41d4-a716-446655440002',
        organization_id: customer.organization_id,
        estimator_id: '550e8400-e29b-41d4-a716-446655440003',
        customer_id: customer.id,
        job_name: 'Survey for ' + customer.name,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        hazard_type: 'asbestos',
        status: 'draft'
      })

      expect(survey.customer_id).toBe(customer.id)
      expect(survey.organization_id).toBe(customer.organization_id)
    })
  })
})