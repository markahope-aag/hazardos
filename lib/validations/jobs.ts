import { z } from 'zod'

// Job status enum
export const jobStatusSchema = z.enum([
  'scheduled',
  'in_progress',
  'completed',
  'invoiced',
  'paid',
  'closed',
  'cancelled',
])

// Create job input - matches CreateJobInput interface
export const createJobSchema = z.object({
  customer_id: z.string().uuid('Invalid customer ID'),
  proposal_id: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  scheduled_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  scheduled_start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)').optional(),
  scheduled_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimated_duration_hours: z.number().positive().optional(),
  job_address: z.string().min(1, 'Job address is required').max(255),
  job_city: z.string().max(100).optional(),
  job_state: z.string().max(50).optional(),
  job_zip: z.string().max(10).optional(),
  access_notes: z.string().max(1000).optional(),
  special_instructions: z.string().max(2000).optional(),
  hazard_types: z.array(z.string()).optional(),
})

// Update job input
export const updateJobSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  scheduled_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  scheduled_start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  scheduled_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimated_duration_hours: z.number().positive().optional(),
  job_address: z.string().max(255).optional(),
  job_city: z.string().max(100).optional(),
  job_state: z.string().max(50).optional(),
  job_zip: z.string().max(10).optional(),
  access_notes: z.string().max(1000).optional(),
  special_instructions: z.string().max(2000).optional(),
  hazard_types: z.array(z.string()).optional(),
  status: jobStatusSchema.optional(),
})

// Create job from proposal
export const createJobFromProposalSchema = z.object({
  proposal_id: z.string().uuid('Invalid proposal ID'),
  scheduled_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  scheduled_start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  estimated_duration_hours: z.number().positive().optional(),
})

// Job status update
export const updateJobStatusSchema = z.object({
  status: jobStatusSchema,
})

// Crew role enum
export const crewRoleSchema = z.enum(['lead', 'crew', 'supervisor', 'trainee'])

// Assign crew
export const assignCrewSchema = z.object({
  profile_id: z.string().uuid('Invalid profile ID'),
  role: crewRoleSchema.optional(),
  is_lead: z.boolean().optional(),
  scheduled_start: z.string().optional(),
  scheduled_end: z.string().optional(),
})

// Remove crew
export const removeCrewSchema = z.object({
  profile_id: z.string().uuid('Invalid profile ID'),
})

// Add change order
export const addChangeOrderSchema = z.object({
  description: z.string().min(1, 'Description is required').max(1000),
  reason: z.string().max(500).optional(),
  amount: z.number(),
})

// Change order action
export const changeOrderActionSchema = z.object({
  change_order_id: z.string().uuid('Invalid change order ID'),
  action: z.enum(['approve', 'reject']),
})

// Job note types
export const jobNoteTypeSchema = z.enum([
  'general',
  'issue',
  'customer_communication',
  'inspection',
  'safety',
  'photo',
])

// Job note attachment schema
export const jobNoteAttachmentSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  type: z.string(),
})

// Add job note
export const addJobNoteSchema = z.object({
  note_type: jobNoteTypeSchema.optional().default('general'),
  content: z.string().min(1, 'Content is required').max(5000),
  attachments: z.array(jobNoteAttachmentSchema).optional(),
  is_internal: z.boolean().optional().default(true),
})

// Delete note
export const deleteJobNoteSchema = z.object({
  note_id: z.string().uuid('Invalid note ID'),
})

// Add equipment
export const addJobEquipmentSchema = z.object({
  equipment_name: z.string().min(1, 'Equipment name is required').max(255),
  equipment_type: z.string().max(100).optional(),
  quantity: z.number().int().positive().optional().default(1),
  is_rental: z.boolean().optional().default(false),
  rental_rate_daily: z.number().positive().optional(),
  rental_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  rental_end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: z.string().max(500).optional(),
})

// Update equipment
export const updateJobEquipmentSchema = z.object({
  equipment_id: z.string().uuid('Invalid equipment ID'),
  status: z.string().min(1, 'Status is required'),
})

// Delete equipment
export const deleteJobEquipmentSchema = z.object({
  equipment_id: z.string().uuid('Invalid equipment ID'),
})

// Add material
export const addJobMaterialSchema = z.object({
  material_name: z.string().min(1, 'Material name is required').max(255),
  material_type: z.string().max(100).optional(),
  quantity_estimated: z.number().positive().optional(),
  unit: z.string().max(20).optional(),
  unit_cost: z.number().positive().optional(),
  notes: z.string().max(500).optional(),
})

// Update material usage
export const updateJobMaterialSchema = z.object({
  material_id: z.string().uuid('Invalid material ID'),
  quantity_used: z.number().min(0, 'Quantity must be non-negative'),
})

// Delete material
export const deleteJobMaterialSchema = z.object({
  material_id: z.string().uuid('Invalid material ID'),
})

// Add disposal
export const addJobDisposalSchema = z.object({
  hazard_type: z.string().min(1, 'Hazard type is required').max(100),
  disposal_type: z.string().max(100).optional(),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(20),
  manifest_number: z.string().max(100).optional(),
  manifest_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  disposal_facility_name: z.string().max(255).optional(),
  disposal_facility_address: z.string().max(500).optional(),
  disposal_cost: z.number().positive().optional(),
})

// Update disposal
export const updateJobDisposalSchema = z.object({
  disposal_id: z.string().uuid('Invalid disposal ID'),
  hazard_type: z.string().max(100).optional(),
  disposal_type: z.string().max(100).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().max(20).optional(),
  manifest_number: z.string().max(100).optional(),
  manifest_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  disposal_facility_name: z.string().max(255).optional(),
  disposal_facility_address: z.string().max(500).optional(),
  disposal_cost: z.number().positive().optional(),
})

// Delete disposal
export const deleteJobDisposalSchema = z.object({
  disposal_id: z.string().uuid('Invalid disposal ID'),
})

// Job list query - all fields come as strings from query params
export const jobListQuerySchema = z.object({
  status: z.string().optional(),
  customer_id: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  crew_member_id: z.string().optional(),
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
}).passthrough()

// Calendar query
export const calendarQuerySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// Available crew query
export const availableCrewQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

// Completion query
export const completionQuerySchema = z.object({
  summary: z.string().optional(),
}).passthrough()

// Create completion
export const createCompletionSchema = z.object({
  estimated_hours: z.number().optional(),
  estimated_material_cost: z.number().optional(),
  estimated_total: z.number().optional(),
  field_notes: z.string().max(5000).optional(),
  issues_encountered: z.string().max(5000).optional(),
  recommendations: z.string().max(5000).optional(),
  submit: z.boolean().optional(),
})

// Update completion
export const updateCompletionSchema = z.object({
  field_notes: z.string().max(5000).optional(),
  issues_encountered: z.string().max(5000).optional(),
  recommendations: z.string().max(5000).optional(),
  customer_signed: z.boolean().optional(),
  customer_signature_name: z.string().max(255).optional(),
  customer_signature_data: z.string().optional(),
})

// Approve completion
export const approveCompletionSchema = z.object({
  review_notes: z.string().max(2000).optional(),
})

// Reject completion
export const rejectCompletionSchema = z.object({
  rejection_reason: z.string().min(1, 'Rejection reason is required').max(2000),
  review_notes: z.string().max(2000).optional(),
})

// Time entry
export const createTimeEntrySchema = z.object({
  profile_id: z.string().uuid().optional(),
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  hours: z.number().positive('Hours must be positive'),
  work_type: z.enum(['regular', 'overtime', 'travel', 'setup', 'cleanup', 'supervision']).optional(),
  hourly_rate: z.number().positive().optional(),
  billable: z.boolean().optional().default(true),
  description: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
})

export const updateTimeEntrySchema = z.object({
  work_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hours: z.number().positive().optional(),
  work_type: z.enum(['regular', 'overtime', 'travel', 'setup', 'cleanup', 'supervision']).optional(),
  hourly_rate: z.number().positive().optional(),
  billable: z.boolean().optional(),
  description: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
})

// Checklist query
export const checklistQuerySchema = z.object({
  grouped: z.string().optional(),
}).passthrough()

// Checklist item update
export const updateChecklistItemSchema = z.object({
  is_completed: z.boolean().optional(),
  completion_notes: z.string().max(1000).optional(),
  evidence_photo_ids: z.array(z.string().uuid()).optional(),
})

// Photo
export const createPhotoSchema = z.object({
  photo_url: z.string().url('Invalid photo URL'),
  thumbnail_url: z.string().url().optional(),
  storage_path: z.string().min(1, 'Storage path is required'),
  photo_type: z.enum(['before', 'during', 'after', 'issue', 'documentation']).optional(),
  caption: z.string().max(500).optional(),
  taken_at: z.string().datetime().optional(),
  location_lat: z.number().optional(),
  location_lng: z.number().optional(),
  camera_make: z.string().max(100).optional(),
  camera_model: z.string().max(100).optional(),
  image_width: z.number().int().positive().optional(),
  image_height: z.number().int().positive().optional(),
  file_name: z.string().max(255).optional(),
  file_size: z.number().int().positive().optional(),
  mime_type: z.string().max(100).optional(),
})

export const updatePhotoSchema = z.object({
  caption: z.string().max(500).optional(),
  photo_type: z.enum(['before', 'during', 'after', 'issue', 'documentation']).optional(),
})

// Material usage
export const createMaterialUsageSchema = z.object({
  job_material_id: z.string().uuid().optional(),
  material_name: z.string().min(1, 'Material name is required').max(255),
  material_type: z.string().max(100).optional(),
  quantity_estimated: z.number().min(0).optional(),
  quantity_used: z.number().positive('Quantity must be positive'),
  unit: z.string().max(50).optional(),
  unit_cost: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
})

export const updateMaterialUsageSchema = z.object({
  material_name: z.string().max(255).optional(),
  material_type: z.string().max(100).optional(),
  quantity_estimated: z.number().min(0).optional(),
  quantity_used: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
  unit_cost: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
})

// Export types
export type CreateJobInput = z.infer<typeof createJobSchema>
export type UpdateJobInput = z.infer<typeof updateJobSchema>
export type JobStatus = z.infer<typeof jobStatusSchema>
export type JobNoteType = z.infer<typeof jobNoteTypeSchema>
