import { describe, it, expect } from 'vitest'
import {
  proposalStatusSchema,
  createProposalSchema,
  updateProposalSchema,
  sendProposalSchema,
  signProposalSchema,
  generateProposalSchema,
  proposalListQuerySchema
} from '@/lib/validations/proposals'

describe('Proposal Validation Schemas', () => {
  describe('proposalStatusSchema', () => {
    it('should accept all valid status values', () => {
      const validStatuses = ['draft', 'sent', 'viewed', 'signed', 'rejected', 'expired', 'converted']
      validStatuses.forEach(status => {
        expect(proposalStatusSchema.safeParse(status).success).toBe(true)
      })
    })

    it('should reject invalid status', () => {
      expect(proposalStatusSchema.safeParse('invalid').success).toBe(false)
      expect(proposalStatusSchema.safeParse('').success).toBe(false)
      expect(proposalStatusSchema.safeParse('DRAFT').success).toBe(false)
    })
  })

  describe('createProposalSchema', () => {
    it('should accept valid minimal proposal', () => {
      const result = createProposalSchema.safeParse({
        estimate_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should accept full proposal with all fields', () => {
      const result = createProposalSchema.safeParse({
        estimate_id: '550e8400-e29b-41d4-a716-446655440000',
        cover_letter: 'Thank you for the opportunity to provide this proposal.',
        terms_and_conditions: 'Standard terms and conditions apply.',
        payment_terms: 'Net 30 from completion date',
        exclusions: 'Does not include structural repairs',
        inclusions: 'All disposal fees included',
        valid_until: '2026-03-01'
      })
      expect(result.success).toBe(true)
    })

    it('should require estimate_id', () => {
      const result = createProposalSchema.safeParse({
        cover_letter: 'Some cover letter'
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid UUID for estimate_id', () => {
      const result = createProposalSchema.safeParse({
        estimate_id: 'not-a-uuid'
      })
      expect(result.success).toBe(false)
    })

    it('should reject cover_letter exceeding 5000 characters', () => {
      const result = createProposalSchema.safeParse({
        estimate_id: '550e8400-e29b-41d4-a716-446655440000',
        cover_letter: 'x'.repeat(5001)
      })
      expect(result.success).toBe(false)
    })

    it('should reject terms_and_conditions exceeding 10000 characters', () => {
      const result = createProposalSchema.safeParse({
        estimate_id: '550e8400-e29b-41d4-a716-446655440000',
        terms_and_conditions: 'x'.repeat(10001)
      })
      expect(result.success).toBe(false)
    })

    it('should reject payment_terms exceeding 2000 characters', () => {
      const result = createProposalSchema.safeParse({
        estimate_id: '550e8400-e29b-41d4-a716-446655440000',
        payment_terms: 'x'.repeat(2001)
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid valid_until date format', () => {
      const result = createProposalSchema.safeParse({
        estimate_id: '550e8400-e29b-41d4-a716-446655440000',
        valid_until: '03-01-2026'
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateProposalSchema', () => {
    it('should accept empty update', () => {
      const result = updateProposalSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept partial update', () => {
      const result = updateProposalSchema.safeParse({
        cover_letter: 'Updated cover letter'
      })
      expect(result.success).toBe(true)
    })

    it('should accept status update', () => {
      const result = updateProposalSchema.safeParse({
        status: 'sent'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = updateProposalSchema.safeParse({
        status: 'invalid'
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid_until date update', () => {
      const result = updateProposalSchema.safeParse({
        valid_until: '2026-04-01'
      })
      expect(result.success).toBe(true)
    })
  })

  describe('sendProposalSchema', () => {
    it('should require recipient_email', () => {
      const result = sendProposalSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should accept valid recipient_email', () => {
      const result = sendProposalSchema.safeParse({
        recipient_email: 'customer@example.com'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid recipient_email', () => {
      const result = sendProposalSchema.safeParse({
        recipient_email: 'not-an-email'
      })
      expect(result.success).toBe(false)
    })

    it('should accept recipient_email with custom_message', () => {
      const result = sendProposalSchema.safeParse({
        recipient_email: 'customer@example.com',
        custom_message: 'Please review the attached proposal.'
      })
      expect(result.success).toBe(true)
    })

    it('should reject custom_message exceeding 2000 characters', () => {
      const result = sendProposalSchema.safeParse({
        recipient_email: 'customer@example.com',
        custom_message: 'x'.repeat(2001)
      })
      expect(result.success).toBe(false)
    })

    it('should accept recipient_name', () => {
      const result = sendProposalSchema.safeParse({
        recipient_email: 'customer@example.com',
        recipient_name: 'John Doe'
      })
      expect(result.success).toBe(true)
    })

    it('should reject recipient_name exceeding 255 characters', () => {
      const result = sendProposalSchema.safeParse({
        recipient_email: 'customer@example.com',
        recipient_name: 'x'.repeat(256)
      })
      expect(result.success).toBe(false)
    })
  })

  describe('signProposalSchema', () => {
    const validSignature = {
      access_token: 'abc123token',
      signer_name: 'John Doe',
      signer_email: 'john@example.com',
      signature_data: 'data:image/png;base64,iVBORw0KGgoAAAANS...'
    }

    it('should accept valid signature', () => {
      const result = signProposalSchema.safeParse(validSignature)
      expect(result.success).toBe(true)
    })

    it('should require access_token', () => {
      const { access_token, ...withoutToken } = validSignature
      const result = signProposalSchema.safeParse(withoutToken)
      expect(result.success).toBe(false)
    })

    it('should reject empty access_token', () => {
      const result = signProposalSchema.safeParse({
        ...validSignature,
        access_token: ''
      })
      expect(result.success).toBe(false)
    })

    it('should require signer_name', () => {
      const { signer_name, ...withoutName } = validSignature
      const result = signProposalSchema.safeParse(withoutName)
      expect(result.success).toBe(false)
    })

    it('should reject empty signer_name', () => {
      const result = signProposalSchema.safeParse({
        ...validSignature,
        signer_name: ''
      })
      expect(result.success).toBe(false)
    })

    it('should require valid signer_email', () => {
      const result = signProposalSchema.safeParse({
        ...validSignature,
        signer_email: 'not-an-email'
      })
      expect(result.success).toBe(false)
    })

    it('should require signature_data', () => {
      const { signature_data, ...withoutSig } = validSignature
      const result = signProposalSchema.safeParse(withoutSig)
      expect(result.success).toBe(false)
    })

    it('should reject empty signature_data', () => {
      const result = signProposalSchema.safeParse({
        ...validSignature,
        signature_data: ''
      })
      expect(result.success).toBe(false)
    })

    it('should reject signer_name exceeding 255 characters', () => {
      const result = signProposalSchema.safeParse({
        ...validSignature,
        signer_name: 'x'.repeat(256)
      })
      expect(result.success).toBe(false)
    })
  })

  describe('generateProposalSchema', () => {
    it('should accept valid estimate_id', () => {
      const result = generateProposalSchema.safeParse({
        estimate_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should require estimate_id', () => {
      const result = generateProposalSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should accept template option', () => {
      const result = generateProposalSchema.safeParse({
        estimate_id: '550e8400-e29b-41d4-a716-446655440000',
        template: 'commercial'
      })
      expect(result.success).toBe(true)
    })

    it('should reject template exceeding 100 characters', () => {
      const result = generateProposalSchema.safeParse({
        estimate_id: '550e8400-e29b-41d4-a716-446655440000',
        template: 'x'.repeat(101)
      })
      expect(result.success).toBe(false)
    })
  })

  describe('proposalListQuerySchema', () => {
    it('should accept empty query', () => {
      const result = proposalListQuerySchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept status filter', () => {
      const result = proposalListQuerySchema.safeParse({
        status: 'sent'
      })
      expect(result.success).toBe(true)
    })

    it('should accept customer_id filter', () => {
      const result = proposalListQuerySchema.safeParse({
        customer_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid customer_id UUID', () => {
      const result = proposalListQuerySchema.safeParse({
        customer_id: 'not-a-uuid'
      })
      expect(result.success).toBe(false)
    })

    it('should accept estimate_id filter', () => {
      const result = proposalListQuerySchema.safeParse({
        estimate_id: '550e8400-e29b-41d4-a716-446655440000'
      })
      expect(result.success).toBe(true)
    })

    it('should accept date range filters', () => {
      const result = proposalListQuerySchema.safeParse({
        from_date: '2026-01-01',
        to_date: '2026-12-31'
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid date format', () => {
      const result = proposalListQuerySchema.safeParse({
        from_date: '01-01-2026'
      })
      expect(result.success).toBe(false)
    })

    it('should transform pagination strings to numbers', () => {
      const result = proposalListQuerySchema.safeParse({
        limit: '25',
        offset: '50'
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(25)
        expect(result.data.offset).toBe(50)
      }
    })

    it('should accept combined filters', () => {
      const result = proposalListQuerySchema.safeParse({
        status: 'signed',
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        from_date: '2026-01-01',
        to_date: '2026-06-30',
        limit: '20',
        offset: '0'
      })
      expect(result.success).toBe(true)
    })
  })
})
