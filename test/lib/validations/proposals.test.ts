import { describe, it, expect } from 'vitest'
import {
  proposalStatusSchema,
  createProposalSchema,
  updateProposalSchema,
  sendProposalSchema,
  signProposalSchema,
  generateProposalSchema,
  proposalListQuerySchema,
} from '@/lib/validations/proposals'

describe('proposalStatusSchema', () => {
  it('accepts valid statuses', () => {
    const statuses = ['draft', 'sent', 'viewed', 'signed', 'rejected', 'expired', 'converted']
    for (const status of statuses) {
      const result = proposalStatusSchema.safeParse(status)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    const result = proposalStatusSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('createProposalSchema', () => {
  const validProposal = {
    estimate_id: '550e8400-e29b-41d4-a716-446655440000',
  }

  it('accepts valid proposal', () => {
    const result = createProposalSchema.safeParse(validProposal)
    expect(result.success).toBe(true)
  })

  it('requires estimate_id', () => {
    const result = createProposalSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('requires valid UUID for estimate_id', () => {
    const result = createProposalSchema.safeParse({
      estimate_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts all optional fields', () => {
    const result = createProposalSchema.safeParse({
      ...validProposal,
      cover_letter: 'Dear Customer...',
      terms_and_conditions: 'Terms apply...',
      payment_terms: 'Net 30',
      exclusions: 'Does not include...',
      inclusions: 'Includes...',
      valid_until: '2024-02-15',
    })
    expect(result.success).toBe(true)
  })

  it('validates date format for valid_until', () => {
    const result = createProposalSchema.safeParse({
      ...validProposal,
      valid_until: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('rejects cover_letter exceeding max length', () => {
    const result = createProposalSchema.safeParse({
      ...validProposal,
      cover_letter: 'a'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects terms_and_conditions exceeding max length', () => {
    const result = createProposalSchema.safeParse({
      ...validProposal,
      terms_and_conditions: 'a'.repeat(10001),
    })
    expect(result.success).toBe(false)
  })
})

describe('updateProposalSchema', () => {
  it('accepts partial update', () => {
    const result = updateProposalSchema.safeParse({
      cover_letter: 'Updated letter',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = updateProposalSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('accepts status update', () => {
    const result = updateProposalSchema.safeParse({
      status: 'sent',
    })
    expect(result.success).toBe(true)
  })

  it('validates fields when provided', () => {
    const result = updateProposalSchema.safeParse({
      valid_until: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('sendProposalSchema', () => {
  it('accepts valid send request', () => {
    const result = sendProposalSchema.safeParse({
      recipient_email: 'customer@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('requires recipient_email', () => {
    const result = sendProposalSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('validates email format', () => {
    const result = sendProposalSchema.safeParse({
      recipient_email: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = sendProposalSchema.safeParse({
      recipient_email: 'customer@example.com',
      recipient_name: 'John Doe',
      custom_message: 'Please review the attached proposal',
    })
    expect(result.success).toBe(true)
  })

  it('rejects custom_message exceeding max length', () => {
    const result = sendProposalSchema.safeParse({
      recipient_email: 'customer@example.com',
      custom_message: 'a'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })
})

describe('signProposalSchema', () => {
  const validSignature = {
    access_token: 'abc123',
    signer_name: 'John Doe',
    signer_email: 'john@example.com',
    signature_data: 'base64signaturedata',
  }

  it('accepts valid signature', () => {
    const result = signProposalSchema.safeParse(validSignature)
    expect(result.success).toBe(true)
  })

  it('requires access_token', () => {
    const result = signProposalSchema.safeParse({
      signer_name: 'John Doe',
      signer_email: 'john@example.com',
      signature_data: 'base64signaturedata',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty access_token', () => {
    const result = signProposalSchema.safeParse({
      ...validSignature,
      access_token: '',
    })
    expect(result.success).toBe(false)
  })

  it('requires signer_name', () => {
    const result = signProposalSchema.safeParse({
      access_token: 'abc123',
      signer_email: 'john@example.com',
      signature_data: 'base64signaturedata',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty signer_name', () => {
    const result = signProposalSchema.safeParse({
      ...validSignature,
      signer_name: '',
    })
    expect(result.success).toBe(false)
  })

  it('requires valid email for signer_email', () => {
    const result = signProposalSchema.safeParse({
      ...validSignature,
      signer_email: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('requires signature_data', () => {
    const result = signProposalSchema.safeParse({
      access_token: 'abc123',
      signer_name: 'John Doe',
      signer_email: 'john@example.com',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty signature_data', () => {
    const result = signProposalSchema.safeParse({
      ...validSignature,
      signature_data: '',
    })
    expect(result.success).toBe(false)
  })
})

describe('generateProposalSchema', () => {
  it('accepts valid generate request', () => {
    const result = generateProposalSchema.safeParse({
      estimate_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('requires estimate_id', () => {
    const result = generateProposalSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('requires valid UUID', () => {
    const result = generateProposalSchema.safeParse({
      estimate_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional template', () => {
    const result = generateProposalSchema.safeParse({
      estimate_id: '550e8400-e29b-41d4-a716-446655440000',
      template: 'professional',
    })
    expect(result.success).toBe(true)
  })
})

describe('proposalListQuerySchema', () => {
  it('accepts valid query', () => {
    const result = proposalListQuerySchema.safeParse({
      status: 'sent',
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      limit: '10',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = proposalListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('transforms string numbers', () => {
    const result = proposalListQuerySchema.safeParse({
      limit: '25',
      offset: '10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
      expect(result.data.offset).toBe(10)
    }
  })

  it('validates date format', () => {
    const result = proposalListQuerySchema.safeParse({
      from_date: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts valid UUID for customer_id', () => {
    const result = proposalListQuerySchema.safeParse({
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid UUID for estimate_id', () => {
    const result = proposalListQuerySchema.safeParse({
      estimate_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })
})
