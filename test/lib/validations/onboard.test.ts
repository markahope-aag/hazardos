import { describe, it, expect } from 'vitest'
import { 
  organizationDataSchema,
  billingCycleSchema,
  completeOnboardSchema
} from '@/lib/validations/onboard'

describe('onboard validations', () => {
  describe('organizationDataSchema', () => {
    it('should validate minimal organization data', () => {
      const validData = {
        name: 'Test Organization'
      }
      
      const result = organizationDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Test Organization')
      }
    })

    it('should validate complete organization data', () => {
      const validData = {
        name: 'Complete Organization',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        phone: '(555) 123-4567',
        email: 'contact@example.com',
        licenseNumber: 'LIC123456'
      }
      
      const result = organizationDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Complete Organization')
        expect(result.data.address).toBe('123 Main St')
        expect(result.data.city).toBe('Anytown')
        expect(result.data.state).toBe('CA')
        expect(result.data.zip).toBe('12345')
        expect(result.data.phone).toBe('(555) 123-4567')
        expect(result.data.email).toBe('contact@example.com')
        expect(result.data.licenseNumber).toBe('LIC123456')
      }
    })

    it('should reject empty name', () => {
      const invalidData = {
        name: ''
      }
      
      const result = organizationDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Organization name is required')
      }
    })

    it('should reject name too long', () => {
      const invalidData = {
        name: 'a'.repeat(256)
      }
      
      const result = organizationDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid email', () => {
      const invalidData = {
        name: 'Test Org',
        email: 'invalid-email'
      }
      
      const result = organizationDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate valid email', () => {
      const validData = {
        name: 'Test Org',
        email: 'valid@example.com'
      }
      
      const result = organizationDataSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject address too long', () => {
      const invalidData = {
        name: 'Test Org',
        address: 'a'.repeat(501)
      }
      
      const result = organizationDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject city too long', () => {
      const invalidData = {
        name: 'Test Org',
        city: 'a'.repeat(101)
      }
      
      const result = organizationDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject state too long', () => {
      const invalidData = {
        name: 'Test Org',
        state: 'a'.repeat(101)
      }
      
      const result = organizationDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject zip too long', () => {
      const invalidData = {
        name: 'Test Org',
        zip: 'a'.repeat(21)
      }
      
      const result = organizationDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject phone too long', () => {
      const invalidData = {
        name: 'Test Org',
        phone: 'a'.repeat(51)
      }
      
      const result = organizationDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject license number too long', () => {
      const invalidData = {
        name: 'Test Org',
        licenseNumber: 'a'.repeat(101)
      }
      
      const result = organizationDataSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('billingCycleSchema', () => {
    it('should validate monthly billing cycle', () => {
      const result = billingCycleSchema.safeParse('monthly')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('monthly')
      }
    })

    it('should validate yearly billing cycle', () => {
      const result = billingCycleSchema.safeParse('yearly')
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('yearly')
      }
    })

    it('should reject invalid billing cycle', () => {
      const result = billingCycleSchema.safeParse('quarterly')
      expect(result.success).toBe(false)
    })
  })

  describe('completeOnboardSchema', () => {
    it('should validate complete onboarding data', () => {
      const validData = {
        organization: {
          name: 'Test Organization',
          email: 'test@example.com'
        },
        plan_id: '123e4567-e89b-12d3-a456-426614174000',
        billing_cycle: 'monthly',
        start_trial: true
      }
      
      const result = completeOnboardSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.organization.name).toBe('Test Organization')
        expect(result.data.plan_id).toBe('123e4567-e89b-12d3-a456-426614174000')
        expect(result.data.billing_cycle).toBe('monthly')
        expect(result.data.start_trial).toBe(true)
      }
    })

    it('should default start_trial to true', () => {
      const validData = {
        organization: {
          name: 'Test Organization'
        },
        plan_id: '123e4567-e89b-12d3-a456-426614174000',
        billing_cycle: 'yearly'
      }
      
      const result = completeOnboardSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.start_trial).toBe(true)
      }
    })

    it('should validate with start_trial false', () => {
      const validData = {
        organization: {
          name: 'Test Organization'
        },
        plan_id: '123e4567-e89b-12d3-a456-426614174000',
        billing_cycle: 'monthly',
        start_trial: false
      }
      
      const result = completeOnboardSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.start_trial).toBe(false)
      }
    })

    it('should reject invalid plan_id UUID', () => {
      const invalidData = {
        organization: {
          name: 'Test Organization'
        },
        plan_id: 'not-a-uuid',
        billing_cycle: 'monthly'
      }
      
      const result = completeOnboardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid plan ID')
      }
    })

    it('should reject invalid billing cycle', () => {
      const invalidData = {
        organization: {
          name: 'Test Organization'
        },
        plan_id: '123e4567-e89b-12d3-a456-426614174000',
        billing_cycle: 'quarterly'
      }
      
      const result = completeOnboardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid organization data', () => {
      const invalidData = {
        organization: {
          name: '' // Empty name
        },
        plan_id: '123e4567-e89b-12d3-a456-426614174000',
        billing_cycle: 'monthly'
      }
      
      const result = completeOnboardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate with complete organization data', () => {
      const validData = {
        organization: {
          name: 'Complete Organization',
          address: '123 Business Ave',
          city: 'Business City',
          state: 'BC',
          zip: '12345-6789',
          phone: '+1 (555) 123-4567',
          email: 'business@example.com',
          licenseNumber: 'BUS-LIC-123456'
        },
        plan_id: '456e7890-e12b-34c5-d678-901234567890',
        billing_cycle: 'yearly',
        start_trial: false
      }
      
      const result = completeOnboardSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.organization.address).toBe('123 Business Ave')
        expect(result.data.organization.city).toBe('Business City')
        expect(result.data.organization.state).toBe('BC')
        expect(result.data.organization.zip).toBe('12345-6789')
        expect(result.data.organization.phone).toBe('+1 (555) 123-4567')
        expect(result.data.organization.email).toBe('business@example.com')
        expect(result.data.organization.licenseNumber).toBe('BUS-LIC-123456')
        expect(result.data.billing_cycle).toBe('yearly')
        expect(result.data.start_trial).toBe(false)
      }
    })

    it('should require all required fields', () => {
      const invalidData = {
        organization: {
          name: 'Test Organization'
        }
        // Missing plan_id and billing_cycle
      }
      
      const result = completeOnboardSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})