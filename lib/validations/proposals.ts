import { z } from 'zod'

// Proposal status
export const proposalStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'signed',
  'rejected',
  'expired',
  'converted',
])

// Create proposal
export const createProposalSchema = z.object({
  estimate_id: z.string().uuid('Invalid estimate ID'),
  cover_letter: z.string().max(5000).optional(),
  terms_and_conditions: z.string().max(10000).optional(),
  payment_terms: z.string().max(2000).optional(),
  exclusions: z.string().max(5000).optional(),
  inclusions: z.string().max(5000).optional(),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

// Update proposal
export const updateProposalSchema = z.object({
  cover_letter: z.string().max(5000).optional(),
  terms_and_conditions: z.string().max(10000).optional(),
  payment_terms: z.string().max(2000).optional(),
  exclusions: z.string().max(5000).optional(),
  inclusions: z.string().max(5000).optional(),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: proposalStatusSchema.optional(),
})

// Send proposal
export const sendProposalSchema = z.object({
  recipient_email: z.string().email('Invalid email address'),
  recipient_name: z.string().max(255).optional(),
  custom_message: z.string().max(2000).optional(),
})

// Sign proposal (public endpoint)
export const signProposalSchema = z.object({
  access_token: z.string().min(1, 'Access token is required'),
  signer_name: z.string().min(1, 'Signer name is required').max(255),
  signer_email: z.string().email('Invalid email address'),
  signature_data: z.string().min(1, 'Signature is required'),
})

// Record verbal approval (admin-only)
// Captures the customer's verbal approval when they call in instead of
// signing via the portal link. `approved_at` is optional so admins can
// backdate if the approval happened before they got to the computer.
export const recordVerbalApprovalSchema = z.object({
  signer_name: z.string().min(1, 'Signer name is required').max(255),
  note: z
    .string()
    .min(1, 'A note is required (e.g. who called and when)')
    .max(2000),
  approved_at: z.string().datetime().optional(),
})

// Generate proposal
export const generateProposalSchema = z.object({
  estimate_id: z.string().uuid('Invalid estimate ID'),
  template: z.string().max(100).optional(),
})

// Proposal list query
export const proposalListQuerySchema = z.object({
  status: z.string().optional(),
  customer_id: z.string().uuid().optional(),
  estimate_id: z.string().uuid().optional(),
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

// Export types
export type CreateProposalInput = z.infer<typeof createProposalSchema>
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>
export type SendProposalInput = z.infer<typeof sendProposalSchema>
export type SignProposalInput = z.infer<typeof signProposalSchema>
export type ProposalStatus = z.infer<typeof proposalStatusSchema>
