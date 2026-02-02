import { describe, it, expect } from 'vitest'
import { siteSurveySchema, defaultSiteSurveyValues } from '@/lib/validations/site-survey'

describe('Site Survey Validation Schema', () => {
  const validSurveyData = {
    job_name: 'Test Job',
    customer_name: 'John Doe',
    customer_email: 'john@example.com',
    customer_phone: '555-123-4567',
    site_address: '123 Main St',
    site_city: 'Springfield',
    site_state: 'IL',
    site_zip: '62701',
    hazard_type: 'asbestos' as const,
    containment_level: 2,
    area_sqft: 500,
    occupied: false,
    clearance_required: true,
    regulatory_notifications_needed: true
  }

  describe('Required Fields', () => {
    it('should validate job_name is required', () => {
      const { job_name: _job_name, ...data } = validSurveyData
      const result = siteSurveySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate customer_name is required', () => {
      const { customer_name: _customer_name, ...data } = validSurveyData
      const result = siteSurveySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate site_address is required', () => {
      const { site_address: _site_address, ...data } = validSurveyData
      const result = siteSurveySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate site_city is required', () => {
      const { site_city: _site_city, ...data } = validSurveyData
      const result = siteSurveySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate site_state is required', () => {
      const { site_state: _site_state, ...data } = validSurveyData
      const result = siteSurveySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate site_zip is required', () => {
      const { site_zip: _site_zip, ...data } = validSurveyData
      const result = siteSurveySchema.safeParse(data)
      expect(result.success).toBe(false)
    })

    it('should validate hazard_type is required', () => {
      const { hazard_type: _hazard_type, ...data } = validSurveyData
      const result = siteSurveySchema.safeParse(data)
      expect(result.success).toBe(false)
    })
  })

  describe('Field Length Validation', () => {
    it('should reject job_name exceeding max length', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        job_name: 'x'.repeat(101)
      })
      expect(result.success).toBe(false)
    })

    it('should reject customer_name exceeding max length', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        customer_name: 'x'.repeat(101)
      })
      expect(result.success).toBe(false)
    })

    it('should reject site_state less than 2 chars', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        site_state: 'I'
      })
      expect(result.success).toBe(false)
    })

    it('should reject site_state more than 2 chars', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        site_state: 'ILL'
      })
      expect(result.success).toBe(false)
    })

    it('should reject site_zip less than 5 chars', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        site_zip: '1234'
      })
      expect(result.success).toBe(false)
    })

    it('should reject site_zip more than 10 chars', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        site_zip: '12345-67890'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('Email Validation', () => {
    it('should accept valid email', () => {
      const result = siteSurveySchema.safeParse(validSurveyData)
      expect(result.success).toBe(true)
    })

    it('should accept empty email', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        customer_email: ''
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid email format', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        customer_email: 'invalid-email'
      })
      expect(result.success).toBe(false)
    })

    it('should accept undefined email', () => {
      const { customer_email: _customer_email, ...data } = validSurveyData
      const result = siteSurveySchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Hazard Type Validation', () => {
    const validHazardTypes = ['asbestos', 'mold', 'lead', 'vermiculite', 'other']

    validHazardTypes.forEach(type => {
      it(`should accept hazard_type: ${type}`, () => {
        const result = siteSurveySchema.safeParse({
          ...validSurveyData,
          hazard_type: type
        })
        expect(result.success).toBe(true)
      })
    })

    it('should reject invalid hazard_type', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        hazard_type: 'invalid'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('Containment Level Validation', () => {
    it('should accept containment_level 1', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        containment_level: 1
      })
      expect(result.success).toBe(true)
    })

    it('should accept containment_level 4', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        containment_level: 4
      })
      expect(result.success).toBe(true)
    })

    it('should reject containment_level 0', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        containment_level: 0
      })
      expect(result.success).toBe(false)
    })

    it('should reject containment_level 5', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        containment_level: 5
      })
      expect(result.success).toBe(false)
    })

    it('should accept undefined containment_level', () => {
      const { containment_level: _containment_level, ...data } = validSurveyData
      const result = siteSurveySchema.safeParse(data)
      expect(result.success).toBe(true)
    })
  })

  describe('Measurement Validation', () => {
    it('should accept positive area_sqft', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        area_sqft: 1000
      })
      expect(result.success).toBe(true)
    })

    it('should accept zero area_sqft', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        area_sqft: 0
      })
      expect(result.success).toBe(true)
    })

    it('should reject negative area_sqft', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        area_sqft: -100
      })
      expect(result.success).toBe(false)
    })

    it('should accept positive linear_ft', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        linear_ft: 50
      })
      expect(result.success).toBe(true)
    })

    it('should reject negative linear_ft', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        linear_ft: -50
      })
      expect(result.success).toBe(false)
    })

    it('should accept positive volume_cuft', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        volume_cuft: 800
      })
      expect(result.success).toBe(true)
    })

    it('should reject negative volume_cuft', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        volume_cuft: -800
      })
      expect(result.success).toBe(false)
    })
  })

  describe('Boolean Fields', () => {
    it('should default occupied to false', () => {
      const { occupied: _occupied, ...data } = validSurveyData
      const result = siteSurveySchema.parse(data)
      expect(result.occupied).toBe(false)
    })

    it('should default clearance_required to false', () => {
      const { clearance_required: _clearance_required, ...data } = validSurveyData
      const result = siteSurveySchema.parse(data)
      expect(result.clearance_required).toBe(false)
    })

    it('should default regulatory_notifications_needed to false', () => {
      const { regulatory_notifications_needed: _regulatory_notifications_needed, ...data } = validSurveyData
      const result = siteSurveySchema.parse(data)
      expect(result.regulatory_notifications_needed).toBe(false)
    })
  })

  describe('Default Values', () => {
    it('should have correct default hazard_type', () => {
      expect(defaultSiteSurveyValues.hazard_type).toBe('asbestos')
    })

    it('should have correct default containment_level', () => {
      expect(defaultSiteSurveyValues.containment_level).toBe(1)
    })

    it('should have correct default occupied', () => {
      expect(defaultSiteSurveyValues.occupied).toBe(false)
    })

    it('should have correct default clearance_required', () => {
      expect(defaultSiteSurveyValues.clearance_required).toBe(false)
    })

    it('should have correct default regulatory_notifications_needed', () => {
      expect(defaultSiteSurveyValues.regulatory_notifications_needed).toBe(false)
    })

    it('should have empty default access_issues', () => {
      expect(defaultSiteSurveyValues.access_issues).toEqual([])
    })
  })

  describe('Optional Fields', () => {
    it('should accept access_issues as array', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        access_issues: ['stairs', 'narrow_doors']
      })
      expect(result.success).toBe(true)
    })

    it('should accept special_conditions string', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        special_conditions: 'Building under renovation'
      })
      expect(result.success).toBe(true)
    })

    it('should accept notes string', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        notes: 'Additional notes here'
      })
      expect(result.success).toBe(true)
    })

    it('should accept clearance_lab string', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        clearance_lab: 'ABC Testing Labs'
      })
      expect(result.success).toBe(true)
    })

    it('should accept material_type string', () => {
      const result = siteSurveySchema.safeParse({
        ...validSurveyData,
        material_type: 'Pipe insulation'
      })
      expect(result.success).toBe(true)
    })
  })

  describe('Valid Complete Survey', () => {
    it('should accept complete valid survey data', () => {
      const result = siteSurveySchema.safeParse(validSurveyData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.job_name).toBe('Test Job')
        expect(result.data.hazard_type).toBe('asbestos')
        expect(result.data.site_state).toBe('IL')
      }
    })
  })
})
