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
  deleteJobNoteSchema as _deleteJobNoteSchema,
  addJobEquipmentSchema,
  updateJobEquipmentSchema as _updateJobEquipmentSchema,
  deleteJobEquipmentSchema as _deleteJobEquipmentSchema,
  addJobMaterialSchema,
  updateJobMaterialSchema as _updateJobMaterialSchema,
  deleteJobMaterialSchema as _deleteJobMaterialSchema,
  addJobDisposalSchema,
  updateJobDisposalSchema as _updateJobDisposalSchema,
  deleteJobDisposalSchema as _deleteJobDisposalSchema,
  jobListQuerySchema,
  calendarQuerySchema,
  availableCrewQuerySchema,
  createCompletionSchema,
  updateCompletionSchema as _updateCompletionSchema,
  approveCompletionSchema as _approveCompletionSchema,
  rejectCompletionSchema,
  createTimeEntrySchema,
  updateTimeEntrySchema as _updateTimeEntrySchema,
  updateChecklistItemSchema as _updateChecklistItemSchema,
  createPhotoSchema,
  updatePhotoSchema as _updatePhotoSchema,
  createMaterialUsageSchema,
  updateMaterialUsageSchema as _updateMaterialUsageSchema,
} from '@/lib/validations/jobs'

describe('jobStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'closed', 'cancelled']
    for (const status of statuses) {
      const result = jobStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = jobStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('createJobSchema', () => {
  const validJob = {
    customer_id: '550e8400-e29b-41d4-a716-446655440000',
    scheduled_start_date: '2024-01-15',
    job_address: '123 Main St',
  }

  it('accepts valid job', () => {
    const result = createJobSchema.safeParse(validJob)
    expect(result.success).toBe(true)
  })

  it('requires customer_id', () => {
    const result = createJobSchema.safeParse({
      scheduled_start_date: '2024-01-15',
      job_address: '123 Main St',
    })
    expect(result.success).toBe(false)
  })

  it('requires valid UUID for customer_id', () => {
    const result = createJobSchema.safeParse({
      ...validJob,
      customer_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('requires scheduled_start_date', () => {
    const result = createJobSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      job_address: '123 Main St',
    })
    expect(result.success).toBe(false)
  })

  it('validates date format', () => {
    const result = createJobSchema.safeParse({
      ...validJob,
      scheduled_start_date: '01-15-2024',
    })
    expect(result.success).toBe(false)
  })

  it('requires job_address', () => {
    const result = createJobSchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      scheduled_start_date: '2024-01-15',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty job_address', () => {
    const result = createJobSchema.safeParse({
      ...validJob,
      job_address: '',
    })
    expect(result.success).toBe(false)
  })

  it('validates time format', () => {
    const result = createJobSchema.safeParse({
      ...validJob,
      scheduled_start_time: '14:30',
    })
    expect(result.success).toBe(true)

    const invalid = createJobSchema.safeParse({
      ...validJob,
      scheduled_start_time: '2:30 PM',
    })
    expect(invalid.success).toBe(false)
  })

  it('accepts hazard_types array', () => {
    const result = createJobSchema.safeParse({
      ...validJob,
      hazard_types: ['asbestos', 'lead'],
    })
    expect(result.success).toBe(true)
  })
})

describe('updateJobSchema', () => {
  it('accepts partial update', () => {
    const result = updateJobSchema.safeParse({
      name: 'Updated Job',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateJobSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts status update', () => {
    const result = updateJobSchema.safeParse({
      status: 'completed',
    })
    expect(result.success).toBe(true)
  })
})

describe('createJobFromProposalSchema', () => {
  it('accepts valid input', () => {
    const result = createJobFromProposalSchema.safeParse({
      proposal_id: '550e8400-e29b-41d4-a716-446655440000',
      scheduled_start_date: '2024-01-15',
    })
    expect(result.success).toBe(true)
  })

  it('requires proposal_id', () => {
    const result = createJobFromProposalSchema.safeParse({
      scheduled_start_date: '2024-01-15',
    })
    expect(result.success).toBe(false)
  })

  it('requires scheduled_start_date', () => {
    const result = createJobFromProposalSchema.safeParse({
      proposal_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(false)
  })
})

describe('updateJobStatusSchema', () => {
  it('accepts valid status', () => {
    const result = updateJobStatusSchema.safeParse({
      status: 'completed',
    })
    expect(result.success).toBe(true)
  })

  it('requires status', () => {
    const result = updateJobStatusSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('crewRoleSchema', () => {
  it('accepts valid roles', () => {
    const roles = ['lead', 'crew', 'supervisor', 'trainee']
    for (const role of roles) {
      const result = crewRoleSchema.safeParse(role)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid role', () => {
    const result = crewRoleSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('assignCrewSchema', () => {
  it('accepts valid assignment', () => {
    const result = assignCrewSchema.safeParse({
      profile_id: '550e8400-e29b-41d4-a716-446655440000',
      role: 'lead',
    })
    expect(result.success).toBe(true)
  })

  it('requires profile_id', () => {
    const result = assignCrewSchema.safeParse({
      role: 'lead',
    })
    expect(result.success).toBe(false)
  })
})

describe('removeCrewSchema', () => {
  it('accepts valid removal', () => {
    const result = removeCrewSchema.safeParse({
      profile_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('requires profile_id', () => {
    const result = removeCrewSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('addChangeOrderSchema', () => {
  it('accepts valid change order', () => {
    const result = addChangeOrderSchema.safeParse({
      description: 'Additional work required',
      amount: 500,
    })
    expect(result.success).toBe(true)
  })

  it('requires description', () => {
    const result = addChangeOrderSchema.safeParse({
      amount: 500,
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = addChangeOrderSchema.safeParse({
      description: '',
      amount: 500,
    })
    expect(result.success).toBe(false)
  })

  it('requires amount', () => {
    const result = addChangeOrderSchema.safeParse({
      description: 'Change',
    })
    expect(result.success).toBe(false)
  })

  it('accepts negative amount', () => {
    const result = addChangeOrderSchema.safeParse({
      description: 'Credit',
      amount: -100,
    })
    expect(result.success).toBe(true)
  })
})

describe('changeOrderActionSchema', () => {
  it('accepts approve action', () => {
    const result = changeOrderActionSchema.safeParse({
      change_order_id: '550e8400-e29b-41d4-a716-446655440000',
      action: 'approve',
    })
    expect(result.success).toBe(true)
  })

  it('accepts reject action', () => {
    const result = changeOrderActionSchema.safeParse({
      change_order_id: '550e8400-e29b-41d4-a716-446655440000',
      action: 'reject',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid action', () => {
    const result = changeOrderActionSchema.safeParse({
      change_order_id: '550e8400-e29b-41d4-a716-446655440000',
      action: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('jobNoteTypeSchema', () => {
  it('accepts valid types', () => {
    const types = ['general', 'issue', 'customer_communication', 'inspection', 'safety', 'photo']
    for (const type of types) {
      const result = jobNoteTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    const result = jobNoteTypeSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('addJobNoteSchema', () => {
  it('accepts valid note', () => {
    const result = addJobNoteSchema.safeParse({
      content: 'Test note',
    })
    expect(result.success).toBe(true)
  })

  it('requires content', () => {
    const result = addJobNoteSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty content', () => {
    const result = addJobNoteSchema.safeParse({
      content: '',
    })
    expect(result.success).toBe(false)
  })

  it('defaults note_type to general', () => {
    const result = addJobNoteSchema.safeParse({
      content: 'Test',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.note_type).toBe('general')
    }
  })

  it('defaults is_internal to true', () => {
    const result = addJobNoteSchema.safeParse({
      content: 'Test',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_internal).toBe(true)
    }
  })
})

describe('addJobEquipmentSchema', () => {
  it('accepts valid equipment', () => {
    const result = addJobEquipmentSchema.safeParse({
      equipment_name: 'HEPA Vacuum',
    })
    expect(result.success).toBe(true)
  })

  it('requires equipment_name', () => {
    const result = addJobEquipmentSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('defaults quantity to 1', () => {
    const result = addJobEquipmentSchema.safeParse({
      equipment_name: 'Vacuum',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.quantity).toBe(1)
    }
  })

  it('defaults is_rental to false', () => {
    const result = addJobEquipmentSchema.safeParse({
      equipment_name: 'Vacuum',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.is_rental).toBe(false)
    }
  })
})

describe('addJobMaterialSchema', () => {
  it('accepts valid material', () => {
    const result = addJobMaterialSchema.safeParse({
      material_name: 'Plastic Sheeting',
    })
    expect(result.success).toBe(true)
  })

  it('requires material_name', () => {
    const result = addJobMaterialSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('addJobDisposalSchema', () => {
  it('accepts valid disposal', () => {
    const result = addJobDisposalSchema.safeParse({
      hazard_type: 'asbestos',
      quantity: 10,
      unit: 'cubic yards',
    })
    expect(result.success).toBe(true)
  })

  it('requires hazard_type', () => {
    const result = addJobDisposalSchema.safeParse({
      quantity: 10,
      unit: 'cubic yards',
    })
    expect(result.success).toBe(false)
  })

  it('requires positive quantity', () => {
    const result = addJobDisposalSchema.safeParse({
      hazard_type: 'asbestos',
      quantity: 0,
      unit: 'cubic yards',
    })
    expect(result.success).toBe(false)
  })

  it('requires unit', () => {
    const result = addJobDisposalSchema.safeParse({
      hazard_type: 'asbestos',
      quantity: 10,
    })
    expect(result.success).toBe(false)
  })
})

describe('jobListQuerySchema', () => {
  it('accepts valid query', () => {
    const result = jobListQuerySchema.safeParse({
      status: 'scheduled',
      limit: '10',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = jobListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('transforms string to number', () => {
    const result = jobListQuerySchema.safeParse({
      limit: '25',
      offset: '10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
      expect(result.data.offset).toBe(10)
    }
  })
})

describe('calendarQuerySchema', () => {
  it('accepts valid date range', () => {
    const result = calendarQuerySchema.safeParse({
      start: '2024-01-01',
      end: '2024-01-31',
    })
    expect(result.success).toBe(true)
  })

  it('requires start date', () => {
    const result = calendarQuerySchema.safeParse({
      end: '2024-01-31',
    })
    expect(result.success).toBe(false)
  })

  it('requires end date', () => {
    const result = calendarQuerySchema.safeParse({
      start: '2024-01-01',
    })
    expect(result.success).toBe(false)
  })

  it('validates date format', () => {
    const result = calendarQuerySchema.safeParse({
      start: '01-01-2024',
      end: '2024-01-31',
    })
    expect(result.success).toBe(false)
  })
})

describe('availableCrewQuerySchema', () => {
  it('accepts valid date', () => {
    const result = availableCrewQuerySchema.safeParse({
      date: '2024-01-15',
    })
    expect(result.success).toBe(true)
  })

  it('requires date', () => {
    const result = availableCrewQuerySchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('createCompletionSchema', () => {
  it('accepts valid completion', () => {
    const result = createCompletionSchema.safeParse({
      estimated_hours: 40,
      field_notes: 'Work completed successfully',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = createCompletionSchema.safeParse({})
    expect(result.success).toBe(true)
  })
})

describe('rejectCompletionSchema', () => {
  it('accepts valid rejection', () => {
    const result = rejectCompletionSchema.safeParse({
      rejection_reason: 'Work incomplete',
    })
    expect(result.success).toBe(true)
  })

  it('requires rejection_reason', () => {
    const result = rejectCompletionSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects empty rejection_reason', () => {
    const result = rejectCompletionSchema.safeParse({
      rejection_reason: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('createTimeEntrySchema', () => {
  it('accepts valid time entry', () => {
    const result = createTimeEntrySchema.safeParse({
      work_date: '2024-01-15',
      hours: 8,
    })
    expect(result.success).toBe(true)
  })

  it('requires work_date', () => {
    const result = createTimeEntrySchema.safeParse({
      hours: 8,
    })
    expect(result.success).toBe(false)
  })

  it('requires positive hours', () => {
    const result = createTimeEntrySchema.safeParse({
      work_date: '2024-01-15',
      hours: 0,
    })
    expect(result.success).toBe(false)
  })

  it('accepts work_type', () => {
    const types = ['regular', 'overtime', 'travel', 'setup', 'cleanup', 'supervision'] as const
    for (const work_type of types) {
      const result = createTimeEntrySchema.safeParse({
        work_date: '2024-01-15',
        hours: 8,
        work_type,
      })
      expect(result.success).toBe(true)
    }
  })

  it('defaults billable to true', () => {
    const result = createTimeEntrySchema.safeParse({
      work_date: '2024-01-15',
      hours: 8,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.billable).toBe(true)
    }
  })
})

describe('createPhotoSchema', () => {
  it('accepts valid photo', () => {
    const result = createPhotoSchema.safeParse({
      photo_url: 'https://example.com/photo.jpg',
      storage_path: '/photos/photo.jpg',
    })
    expect(result.success).toBe(true)
  })

  it('requires valid URL', () => {
    const result = createPhotoSchema.safeParse({
      photo_url: 'not-a-url',
      storage_path: '/photos/photo.jpg',
    })
    expect(result.success).toBe(false)
  })

  it('requires storage_path', () => {
    const result = createPhotoSchema.safeParse({
      photo_url: 'https://example.com/photo.jpg',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid photo_type', () => {
    const types = ['before', 'during', 'after', 'issue', 'documentation'] as const
    for (const photo_type of types) {
      const result = createPhotoSchema.safeParse({
        photo_url: 'https://example.com/photo.jpg',
        storage_path: '/photos/photo.jpg',
        photo_type,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('createMaterialUsageSchema', () => {
  it('accepts valid material usage', () => {
    const result = createMaterialUsageSchema.safeParse({
      material_name: 'Plastic Sheeting',
      quantity_used: 100,
    })
    expect(result.success).toBe(true)
  })

  it('requires material_name', () => {
    const result = createMaterialUsageSchema.safeParse({
      quantity_used: 100,
    })
    expect(result.success).toBe(false)
  })

  it('requires positive quantity_used', () => {
    const result = createMaterialUsageSchema.safeParse({
      material_name: 'Plastic Sheeting',
      quantity_used: 0,
    })
    expect(result.success).toBe(false)
  })
})
