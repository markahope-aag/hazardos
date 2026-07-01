import { z } from 'zod'

// ---------------------------------------------------------------------------
// Shared vocab (mirrors the DB enums + job vocabulary)
// ---------------------------------------------------------------------------
export const credentialCategorySchema = z.enum([
  'worker_license',
  'rrp_certification',
  'respirator_fit_test',
  'medical_clearance',
  'equipment_calibration',
  'other',
])

export const credentialAppliesToSchema = z.enum(['worker', 'asset'])

export const credentialStatusSchema = z.enum([
  'valid',
  'expiring_soon',
  'expired',
  'no_expiry',
])

// Job containment levels (jobs.containment_level enum values).
export const containmentLevelSchema = z.enum(['type_i', 'type_ii', 'type_iii'])

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')

// ---------------------------------------------------------------------------
// credential_types
// ---------------------------------------------------------------------------
export const createCredentialTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  category: credentialCategorySchema.default('other'),
  applies_to: credentialAppliesToSchema.default('worker'),
  issuing_authority: z.string().max(255).optional().nullable(),
  default_valid_days: z.number().int().positive().max(36500).optional().nullable(),
  warning_lead_days: z.number().int().min(0).max(3650).default(30),
  required_for_containment_levels: z.array(containmentLevelSchema).optional().nullable(),
  required_for_hazard_types: z.array(z.string().min(1)).optional().nullable(),
  is_active: z.boolean().default(true),
})

export const updateCredentialTypeSchema = createCredentialTypeSchema.partial().strict()

// ---------------------------------------------------------------------------
// credentials (Phase 1: worker subject only; asset_id reserved)
// ---------------------------------------------------------------------------
export const createCredentialSchema = z.object({
  credential_type_id: z.string().uuid('Invalid credential type'),
  worker_id: z.string().uuid('A worker must be selected'),
  identifier: z.string().max(255).optional().nullable(),
  issued_date: isoDate.optional().nullable(),
  expiry_date: isoDate.optional().nullable(),
  document_path: z.string().max(1024).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
})

export const updateCredentialSchema = z
  .object({
    credential_type_id: z.string().uuid().optional(),
    identifier: z.string().max(255).optional().nullable(),
    issued_date: isoDate.optional().nullable(),
    expiry_date: isoDate.optional().nullable(),
    document_path: z.string().max(1024).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .strict()

// ---------------------------------------------------------------------------
// Query filters
// ---------------------------------------------------------------------------
export const listCredentialsQuerySchema = z.object({
  worker_id: z.string().uuid().optional(),
  credential_type_id: z.string().uuid().optional(),
  category: credentialCategorySchema.optional(),
  status: credentialStatusSchema.optional(),
  expiring_before: isoDate.optional(),
})

export const listCredentialTypesQuerySchema = z.object({
  active_only: z.coerce.boolean().optional(),
  applies_to: credentialAppliesToSchema.optional(),
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------
export type CredentialCategory = z.infer<typeof credentialCategorySchema>
export type CredentialAppliesTo = z.infer<typeof credentialAppliesToSchema>
export type CredentialStatus = z.infer<typeof credentialStatusSchema>
export type ContainmentLevel = z.infer<typeof containmentLevelSchema>
export type CreateCredentialTypeInput = z.infer<typeof createCredentialTypeSchema>
export type UpdateCredentialTypeInput = z.infer<typeof updateCredentialTypeSchema>
export type CreateCredentialInput = z.infer<typeof createCredentialSchema>
export type UpdateCredentialInput = z.infer<typeof updateCredentialSchema>
export type ListCredentialsQuery = z.infer<typeof listCredentialsQuerySchema>
export type ListCredentialTypesQuery = z.infer<typeof listCredentialTypesQuerySchema>
