import { describe, it, expect } from 'vitest'
import { siteSurveySchema } from '@/lib/validations/site-survey'

describe('Site Survey Validation Schema', () => {
  describe('siteSurveySchema', () => {
    it('should validate a complete valid site survey', () => {
      const validSurvey = {
        job_name: 'Asbestos Inspection - Main Building',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        customer_phone: '(555) 123-4567',
        site_address: '123 Industrial Ave',
        site_city: 'Manufacturing City',
        site_state: 'CA',
        site_zip: '90210',
        hazard_type: 'asbestos' as const,
        hazard_subtype: 'Floor tiles',
        containment_level: 3,
        area_sqft: 1500.5,
        linear_ft: 200.25,
        volume_cuft: 4500.75,
        occupied: true,
        clearance_required: true,
        regulatory_notifications_needed: false,
        access_issues: ['Limited parking', 'Security clearance needed'],
        special_conditions: 'Work must be done on weekends only',
        notes: 'Customer prefers morning appointments'
      }

      const result = siteSurveySchema.safeParse(validSurvey)
      expect(result.success).toBe(true)
    })

    it('should validate minimal site survey with required fields only', () => {
      const minimalSurvey = {
        job_name: 'Basic Survey',
        customer_name: 'Jane Smith',
        site_address: '456 Main St',
        site_city: 'Anytown',
        site_state: 'NY',
        site_zip: '12345',
        hazard_type: 'mold' as const
      }

      const result = siteSurveySchema.safeParse(minimalSurvey)
      expect(result.success).toBe(true)
    })

    it('should reject survey without required job_name', () => {
      const invalidSurvey = {
        customer_name: 'John Doe',
        site_address: '123 Main St',
        site_city: 'City',
        site_state: 'CA',
        site_zip: '12345',
        hazard_type: 'asbestos' as const
      }

      const result = siteSurveySchema.safeParse(invalidSurvey)
      expect(result.success).toBe(false)
    })

    it('should reject survey without required customer_name', () => {
      const invalidSurvey = {
        job_name: 'Test Survey',
        site_address: '123 Main St',
        site_city: 'City',
        site_state: 'CA',
        site_zip: '12345',
        hazard_type: 'asbestos' as const
      }

      const result = siteSurveySchema.safeParse(invalidSurvey)
      expect(result.success).toBe(false)
    })

    it('should validate all hazard types', () => {
      const hazardTypes = ['asbestos', 'mold', 'lead', 'vermiculite', 'other'] as const

      hazardTypes.forEach(hazardType => {
        const survey = {
          job_name: 'Test Survey',
          customer_name: 'Test Customer',
          site_address: '123 Test St',
          site_city: 'Test City',
          site_state: 'CA',
          site_zip: '12345',
          hazard_type: hazardType
        }

        const result = siteSurveySchema.safeParse(survey)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid hazard type', () => {
      const survey = {
        job_name: 'Test Survey',
        customer_name: 'Test Customer',
        site_address: '123 Test St',
        site_city: 'Test City',
        site_state: 'CA',
        site_zip: '12345',
        hazard_type: 'invalid-hazard'
      }

      const result = siteSurveySchema.safeParse(survey)
      expect(result.success).toBe(false)
    })

    it('should validate containment levels 1-4', () => {
      const validLevels = [1, 2, 3, 4]

      validLevels.forEach(level => {
        const survey = {
          job_name: 'Test Survey',
          customer_name: 'Test Customer',
          site_address: '123 Test St',
          site_city: 'Test City',
          site_state: 'CA',
          site_zip: '12345',
          hazard_type: 'asbestos' as const,
          containment_level: level
        }

        const result = siteSurveySchema.safeParse(survey)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid containment levels', () => {
      const invalidLevels = [0, 5, -1, 10]

      invalidLevels.forEach(level => {
        const survey = {
          job_name: 'Test Survey',
          customer_name: 'Test Customer',
          site_address: '123 Test St',
          site_city: 'Test City',
          site_state: 'CA',
          site_zip: '12345',
          hazard_type: 'asbestos' as const,
          containment_level: level
        }

        const result = siteSurveySchema.safeParse(survey)
        expect(result.success).toBe(false)
      })
    })

    it('should validate positive numeric measurements', () => {
      const survey = {
        job_name: 'Test Survey',
        customer_name: 'Test Customer',
        site_address: '123 Test St',
        site_city: 'Test City',
        site_state: 'CA',
        site_zip: '12345',
        hazard_type: 'asbestos' as const,
        area_sqft: 1000.5,
        linear_ft: 50.25,
        volume_cuft: 3000.75
      }

      const result = siteSurveySchema.safeParse(survey)
      expect(result.success).toBe(true)
    })

    it('should reject negative measurements', () => {
      const survey = {
        job_name: 'Test Survey',
        customer_name: 'Test Customer',
        site_address: '123 Test St',
        site_city: 'Test City',
        site_state: 'CA',
        site_zip: '12345',
        hazard_type: 'asbestos' as const,
        area_sqft: -100
      }

      const result = siteSurveySchema.safeParse(survey)
      expect(result.success).toBe(false)
    })

    it('should validate boolean fields', () => {
      const survey = {
        job_name: 'Test Survey',
        customer_name: 'Test Customer',
        site_address: '123 Test St',
        site_city: 'Test City',
        site_state: 'CA',
        site_zip: '12345',
        hazard_type: 'asbestos' as const,
        occupied: true,
        clearance_required: false,
        regulatory_notifications_needed: true
      }

      const result = siteSurveySchema.safeParse(survey)
      expect(result.success).toBe(true)
    })

    it('should validate access issues array', () => {
      const survey = {
        job_name: 'Test Survey',
        customer_name: 'Test Customer',
        site_address: '123 Test St',
        site_city: 'Test City',
        site_state: 'CA',
        site_zip: '12345',
        hazard_type: 'asbestos' as const,
        access_issues: ['Limited parking', 'Narrow access', 'Elevator required']
      }

      const result = siteSurveySchema.safeParse(survey)
      expect(result.success).toBe(true)
    })

    it('should validate empty access issues array', () => {
      const survey = {
        job_name: 'Test Survey',
        customer_name: 'Test Customer',
        site_address: '123 Test St',
        site_city: 'Test City',
        site_state: 'CA',
        site_zip: '12345',
        hazard_type: 'asbestos' as const,
        access_issues: []
      }

      const result = siteSurveySchema.safeParse(survey)
      expect(result.success).toBe(true)
    })

    it('should validate email format in customer_email', () => {
      const validEmails = ['test@example.com', 'user.name@domain.co.uk', 'user+tag@example.org']

      validEmails.forEach(email => {
        const survey = {
          job_name: 'Test Survey',
          customer_name: 'Test Customer',
          customer_email: email,
          site_address: '123 Test St',
          site_city: 'Test City',
          site_state: 'CA',
          site_zip: '12345',
          hazard_type: 'asbestos' as const
        }

        const result = siteSurveySchema.safeParse(survey)
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = ['invalid-email', '@example.com', 'user@', 'user@.com']

      invalidEmails.forEach(email => {
        const survey = {
          job_name: 'Test Survey',
          customer_name: 'Test Customer',
          customer_email: email,
          site_address: '123 Test St',
          site_city: 'Test City',
          site_state: 'CA',
          site_zip: '12345',
          hazard_type: 'asbestos' as const
        }

        const result = siteSurveySchema.safeParse(survey)
        expect(result.success).toBe(false)
      })
    })
  })
})