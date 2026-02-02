import { describe, it, expect } from 'vitest'
import {
  jobStatusSchema,
  createJobSchema,
  updateJobSchema,
  createJobFromProposalSchema,
  updateJobStatusSchema,
  crewRoleSchema,
  assignCrewSchema,
  removeCrewSchema,
  addChangeOrderSchema,
  changeOrderActionSchema,
  jobNoteTypeSchema,
  addJobNoteSchema,
  deleteJobNoteSchema,
  addJobEquipmentSchema,
  updateJobEquipmentSchema,
  deleteJobEquipmentSchema as _deleteJobEquipmentSchema,
  addJobMaterialSchema,
  updateJobMaterialSchema,
  deleteJobMaterialSchema as _deleteJobMaterialSchema,
  addJobDisposalSchema,
  updateJobDisposalSchema as _updateJobDisposalSchema,
  deleteJobDisposalSchema as _deleteJobDisposalSchema,
  jobListQuerySchema,
  calendarQuerySchema,
  availableCrewQuerySchema
} from '@/lib/validations/jobs'

describe('Job Validation Schemas', () => {
  describe('jobStatusSchema', () => {
    it('should accept all valid status values', () => {
      const validStatuses = ['scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'closed', 'cancelled']
      validStatuses.forEach(status => {
        expect(jobStatusSchema.safeParse(status).success).toBe(true)
      })
    })

    it('should reject invalid status', () => {
      expect(jobStatusSchema.safeParse('invalid').success).toBe(false)
      expect(jobStatusSchema.safeParse('').success).toBe(false)
    })
  })

  describe('crewRoleSchema', () => {
    it('should accept all valid roles', () => {
      const validRoles = ['lead', 'crew', 'supervisor', 'trainee']
      validRoles.forEach(role => {
        expect(crewRoleSchema.safeParse(role).success).toBe(true)
      })
    })

    it('should reject invalid role', () => {
      expect(crewRoleSchema.safeParse('manager').success).toBe(false)
    })
  })

  describe('jobNoteTypeSchema', () => {
    it('should accept all valid note types', () => {
      const validTypes = ['general', 'issue', 'customer_communication', 'inspection', 'safety', 'photo']
      validTypes.forEach(type => {
        expect(jobNoteTypeSchema.safeParse(type).success).toBe(true)
      })
    })

    it('should reject invalid note type', () => {
      expect(jobNoteTypeSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('createJobSchema', () => {
    const validJob = {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      scheduled_start_date: '2026-02-15',
      job_address: '123 Main Street'
    }

    it('should accept valid minimal job', () => {
      const result = createJobSchema.safeParse(validJob)
      expect(result.success).toBe(true)
    })

    it('should accept full job with all fields', () => {
      const result = createJobSchema.safeParse({
        ...validJob,
        proposal_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Commercial Asbestos Removal',
        scheduled_start_time: '08:00',
        scheduled_end_date: '2026-02-20',
        estimated_duration_hours: 40,
        job_city: 'Springfield',
        job_state: 'IL',
        job_zip: '62701',
        access_notes: 'Use side entrance',
        special_instructions: 'Building is occupied during work',
        hazard_types: ['asbestos', 'lead']
      })
      expect(result.success).toBe(true)
    })

    it('should require customer_id', () => {
      const { customer_id: _customer_id, ...withoutCustomer } = validJob
      const result = createJobSchema.safeParse(withoutCustomer)
      expect(result.success).toBe(false)
    })

    it('should require scheduled_start_date', () => {
      const { scheduled_start_date: _scheduled_start_date, ...withoutDate } = validJob
      const result = createJobSchema.safeParse(withoutDate)
      expect(result.success).toBe(false)
    })

    it('should require job_address', () => {
      const { job_address: _job_address, ...withoutAddress } = validJob
      const result = createJobSchema.safeParse(withoutAddress)
      expect(result.success).toBe(false)
    })

    it('should reject empty job_address', () => {
      const result = createJobSchema.safeParse({
        ...validJob,
        job_address: ''
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid date format', () => {
      const result = createJobSchema.safeParse({
        ...validJob,
        scheduled_start_date: '02-15-2026'
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid time format', () => {
      const result = createJobSchema.safeParse({
        ...validJob,
        scheduled_start_time: '8:00'
      })
      expect(result.success).toBe(false)
    })

    it('should accept hazard_types array', () => {
      const result = createJobSchema.safeParse({
        ...validJob,
        hazard_types: ['asbestos', 'mold', 'lead']
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateJobSchema', () => {
    it('should accept empty update', () => {
      const result = updateJobSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept status update', () => {
      const result = updateJobSchema.safeParse({
        status: 'in_progress'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = updateJobSchema.safeParse({
        status: 'invalid'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createJobFromProposalSchema', () => {
    it('should accept valid proposal with start date', () => {
      const result = createJobFromProposalSchema.safeParse({
        proposal_id: '550e8400-e29b-41d4-a716-446655440000',
        scheduled_start_date: '2026-02-15'
      })
      expect(result.success).toBe(true)
    })

    it('should require proposal_id', () => {
      const result = createJobFromProposalSchema.safeParse({
        scheduled_start_date: '2026-02-15'
      })
      expect(result.success).toBe(false)
    })

    it('should require scheduled_start_date', () => {
      const result = createJobFromProposalSchema.safeParse({
        proposal_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateJobStatusSchema', () => {
    it('should accept valid status', () => {
      const result = updateJobStatusSchema.safeParse({
        status: 'completed'
      })
      expect(result.success).toBe(true)
    })

    it('should require status', () => {
      const result = updateJobStatusSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('assignCrewSchema', () => {
    it('should accept valid profile_id', () => {
      const result = assignCrewSchema.safeParse({
        profile_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should accept with role', () => {
      const result = assignCrewSchema.safeParse({
        profile_id: '550e8400-e29b-41d4-a716-446655440000',
        role: 'lead'
      })
      expect(result.success).toBe(true)
    })

    it('should require profile_id', () => {
      const result = assignCrewSchema.safeParse({
        role: 'crew'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('removeCrewSchema', () => {
    it('should accept valid UUID', () => {
      const result = removeCrewSchema.safeParse({
        profile_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const result = removeCrewSchema.safeParse({
        profile_id: 'not-a-uuid'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('addChangeOrderSchema', () => {
    it('should accept valid change order', () => {
      const result = addChangeOrderSchema.safeParse({
        description: 'Additional asbestos found in basement',
        amount: 2500
      })
      expect(result.success).toBe(true)
    })

    it('should accept negative amount', () => {
      const result = addChangeOrderSchema.safeParse({
        description: 'Scope reduction',
        amount: -500
      })
      expect(result.success).toBe(true)
    })

    it('should require description', () => {
      const result = addChangeOrderSchema.safeParse({
        amount: 1000
      })
      expect(result.success).toBe(false)
    })

    it('should reject empty description', () => {
      const result = addChangeOrderSchema.safeParse({
        description: '',
        amount: 1000
      })
      expect(result.success).toBe(false)
    })
  })

  describe('changeOrderActionSchema', () => {
    it('should accept approve action', () => {
      const result = changeOrderActionSchema.safeParse({
        change_order_id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'approve'
      })
      expect(result.success).toBe(true)
    })

    it('should accept reject action', () => {
      const result = changeOrderActionSchema.safeParse({
        change_order_id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'reject'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid action', () => {
      const result = changeOrderActionSchema.safeParse({
        change_order_id: '550e8400-e29b-41d4-a716-446655440000',
        action: 'pending'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('addJobNoteSchema', () => {
    it('should accept valid note', () => {
      const result = addJobNoteSchema.safeParse({
        content: 'Customer requested schedule change'
      })
      expect(result.success).toBe(true)
    })

    it('should default note_type to general', () => {
      const result = addJobNoteSchema.safeParse({
        content: 'Test note'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.note_type).toBe('general')
      }
    })

    it('should default is_internal to true', () => {
      const result = addJobNoteSchema.safeParse({
        content: 'Internal note'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_internal).toBe(true)
      }
    })

    it('should reject empty content', () => {
      const result = addJobNoteSchema.safeParse({
        content: ''
      })
      expect(result.success).toBe(false)
    })

    it('should reject content exceeding 5000 characters', () => {
      const result = addJobNoteSchema.safeParse({
        content: 'x'.repeat(5001)
      })
      expect(result.success).toBe(false)
    })
  })

  describe('deleteJobNoteSchema', () => {
    it('should accept valid note_id', () => {
      const result = deleteJobNoteSchema.safeParse({
        note_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID', () => {
      const result = deleteJobNoteSchema.safeParse({
        note_id: 'not-a-uuid'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('addJobEquipmentSchema', () => {
    it('should accept valid equipment', () => {
      const result = addJobEquipmentSchema.safeParse({
        equipment_name: 'HEPA Vacuum'
      })
      expect(result.success).toBe(true)
    })

    it('should default quantity to 1', () => {
      const result = addJobEquipmentSchema.safeParse({
        equipment_name: 'Air Scrubber'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quantity).toBe(1)
      }
    })

    it('should default is_rental to false', () => {
      const result = addJobEquipmentSchema.safeParse({
        equipment_name: 'Air Scrubber'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_rental).toBe(false)
      }
    })

    it('should accept rental fields', () => {
      const result = addJobEquipmentSchema.safeParse({
        equipment_name: 'Negative Air Machine',
        is_rental: true,
        rental_rate_daily: 150,
        rental_start_date: '2026-02-15',
        rental_end_date: '2026-02-20'
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty equipment_name', () => {
      const result = addJobEquipmentSchema.safeParse({
        equipment_name: ''
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateJobEquipmentSchema', () => {
    it('should require equipment_id and status', () => {
      const result = updateJobEquipmentSchema.safeParse({
        equipment_id: '550e8400-e29b-41d4-a716-446655440000',
        status: 'returned'
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty status', () => {
      const result = updateJobEquipmentSchema.safeParse({
        equipment_id: '550e8400-e29b-41d4-a716-446655440000',
        status: ''
      })
      expect(result.success).toBe(false)
    })
  })

  describe('addJobMaterialSchema', () => {
    it('should accept valid material', () => {
      const result = addJobMaterialSchema.safeParse({
        material_name: 'Poly Sheeting'
      })
      expect(result.success).toBe(true)
    })

    it('should accept material with all fields', () => {
      const result = addJobMaterialSchema.safeParse({
        material_name: 'Disposal Bags',
        material_type: 'Consumable',
        quantity_estimated: 50,
        unit: 'bags',
        unit_cost: 5.00,
        notes: '6 mil bags required'
      })
      expect(result.success).toBe(true)
    })

    it('should reject empty material_name', () => {
      const result = addJobMaterialSchema.safeParse({
        material_name: ''
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateJobMaterialSchema', () => {
    it('should accept valid update', () => {
      const result = updateJobMaterialSchema.safeParse({
        material_id: '550e8400-e29b-41d4-a716-446655440000',
        quantity_used: 45
      })
      expect(result.success).toBe(true)
    })

    it('should accept zero quantity_used', () => {
      const result = updateJobMaterialSchema.safeParse({
        material_id: '550e8400-e29b-41d4-a716-446655440000',
        quantity_used: 0
      })
      expect(result.success).toBe(true)
    })

    it('should reject negative quantity_used', () => {
      const result = updateJobMaterialSchema.safeParse({
        material_id: '550e8400-e29b-41d4-a716-446655440000',
        quantity_used: -5
      })
      expect(result.success).toBe(false)
    })
  })

  describe('addJobDisposalSchema', () => {
    const validDisposal = {
      hazard_type: 'asbestos',
      quantity: 500,
      unit: 'lbs'
    }

    it('should accept valid disposal', () => {
      const result = addJobDisposalSchema.safeParse(validDisposal)
      expect(result.success).toBe(true)
    })

    it('should accept disposal with all fields', () => {
      const result = addJobDisposalSchema.safeParse({
        ...validDisposal,
        disposal_type: 'Landfill',
        manifest_number: 'MAN-2026-001',
        manifest_date: '2026-02-15',
        disposal_facility_name: 'Approved Waste Facility',
        disposal_facility_address: '456 Industrial Way',
        disposal_cost: 450
      })
      expect(result.success).toBe(true)
    })

    it('should require hazard_type', () => {
      const { hazard_type: _hazard_type, ...withoutType } = validDisposal
      const result = addJobDisposalSchema.safeParse(withoutType)
      expect(result.success).toBe(false)
    })

    it('should require positive quantity', () => {
      const result = addJobDisposalSchema.safeParse({
        ...validDisposal,
        quantity: 0
      })
      expect(result.success).toBe(false)
    })

    it('should require unit', () => {
      const { unit: _unit, ...withoutUnit } = validDisposal
      const result = addJobDisposalSchema.safeParse(withoutUnit)
      expect(result.success).toBe(false)
    })
  })

  describe('calendarQuerySchema', () => {
    it('should accept valid date range', () => {
      const result = calendarQuerySchema.safeParse({
        start: '2026-02-01',
        end: '2026-02-28'
      })
      expect(result.success).toBe(true)
    })

    it('should require start date', () => {
      const result = calendarQuerySchema.safeParse({
        end: '2026-02-28'
      })
      expect(result.success).toBe(false)
    })

    it('should require end date', () => {
      const result = calendarQuerySchema.safeParse({
        start: '2026-02-01'
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid date format', () => {
      const result = calendarQuerySchema.safeParse({
        start: '02-01-2026',
        end: '2026-02-28'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('availableCrewQuerySchema', () => {
    it('should accept valid date', () => {
      const result = availableCrewQuerySchema.safeParse({
        date: '2026-02-15'
      })
      expect(result.success).toBe(true)
    })

    it('should require date', () => {
      const result = availableCrewQuerySchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject invalid date format', () => {
      const result = availableCrewQuerySchema.safeParse({
        date: '02-15-2026'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('jobListQuerySchema', () => {
    it('should accept empty query', () => {
      const result = jobListQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept all filter options', () => {
      const result = jobListQuerySchema.safeParse({
        status: 'scheduled',
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        from_date: '2026-02-01',
        to_date: '2026-02-28',
        crew_member_id: '550e8400-e29b-41d4-a716-446655440001'
      })
      expect(result.success).toBe(true)
    })
  })
})
