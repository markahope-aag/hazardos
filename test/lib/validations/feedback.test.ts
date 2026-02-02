import { describe, it, expect } from 'vitest'
import {
  feedbackListQuerySchema,
  createFeedbackSurveySchema,
  submitFeedbackSchema,
  approveTestimonialSchema,
  sendFeedbackSchema,
} from '@/lib/validations/feedback'

describe('feedbackListQuerySchema', () => {
  it('accepts valid query', () => {
    const result = feedbackListQuerySchema.safeParse({
      status: 'pending',
      job_id: '550e8400-e29b-41d4-a716-446655440000',
      limit: '10',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = feedbackListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('transforms string to number', () => {
    const result = feedbackListQuerySchema.safeParse({
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

describe('createFeedbackSurveySchema', () => {
  it('accepts valid feedback survey', () => {
    const result = createFeedbackSurveySchema.safeParse({
      job_id: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(result.success).toBe(true)
  })

  it('requires job_id', () => {
    const result = createFeedbackSurveySchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('requires valid UUID for job_id', () => {
    const result = createFeedbackSurveySchema.safeParse({
      job_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts optional fields', () => {
    const result = createFeedbackSurveySchema.safeParse({
      job_id: '550e8400-e29b-41d4-a716-446655440000',
      send_immediately: true,
      recipient_email: 'customer@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('validates recipient_email format', () => {
    const result = createFeedbackSurveySchema.safeParse({
      job_id: '550e8400-e29b-41d4-a716-446655440000',
      recipient_email: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('submitFeedbackSchema', () => {
  it('accepts valid feedback', () => {
    const result = submitFeedbackSchema.safeParse({
      rating_overall: 5,
      rating_quality: 4,
      would_recommend: true,
      feedback_text: 'Great job!',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = submitFeedbackSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('validates rating_overall range (1-5)', () => {
    const valid = submitFeedbackSchema.safeParse({ rating_overall: 3 })
    expect(valid.success).toBe(true)

    const tooLow = submitFeedbackSchema.safeParse({ rating_overall: 0 })
    expect(tooLow.success).toBe(false)

    const tooHigh = submitFeedbackSchema.safeParse({ rating_overall: 6 })
    expect(tooHigh.success).toBe(false)
  })

  it('validates rating_quality range (1-5)', () => {
    const valid = submitFeedbackSchema.safeParse({ rating_quality: 3 })
    expect(valid.success).toBe(true)

    const tooLow = submitFeedbackSchema.safeParse({ rating_quality: 0 })
    expect(tooLow.success).toBe(false)
  })

  it('validates rating_communication range (1-5)', () => {
    const valid = submitFeedbackSchema.safeParse({ rating_communication: 5 })
    expect(valid.success).toBe(true)
  })

  it('validates rating_timeliness range (1-5)', () => {
    const valid = submitFeedbackSchema.safeParse({ rating_timeliness: 4 })
    expect(valid.success).toBe(true)
  })

  it('validates rating_value range (1-5)', () => {
    const valid = submitFeedbackSchema.safeParse({ rating_value: 5 })
    expect(valid.success).toBe(true)
  })

  it('validates likelihood_to_recommend range (0-10)', () => {
    const valid = submitFeedbackSchema.safeParse({ likelihood_to_recommend: 10 })
    expect(valid.success).toBe(true)

    const tooLow = submitFeedbackSchema.safeParse({ likelihood_to_recommend: -1 })
    expect(tooLow.success).toBe(false)

    const tooHigh = submitFeedbackSchema.safeParse({ likelihood_to_recommend: 11 })
    expect(tooHigh.success).toBe(false)
  })

  it('rejects feedback_text exceeding max length', () => {
    const result = submitFeedbackSchema.safeParse({
      feedback_text: 'a'.repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects improvement_suggestions exceeding max length', () => {
    const result = submitFeedbackSchema.safeParse({
      improvement_suggestions: 'a'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('rejects testimonial_text exceeding max length', () => {
    const result = submitFeedbackSchema.safeParse({
      testimonial_text: 'a'.repeat(2001),
    })
    expect(result.success).toBe(false)
  })

  it('accepts testimonial_permission', () => {
    const result = submitFeedbackSchema.safeParse({
      testimonial_text: 'Great work!',
      testimonial_permission: true,
    })
    expect(result.success).toBe(true)
  })
})

describe('approveTestimonialSchema', () => {
  it('accepts approved true', () => {
    const result = approveTestimonialSchema.safeParse({
      approved: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts approved false', () => {
    const result = approveTestimonialSchema.safeParse({
      approved: false,
    })
    expect(result.success).toBe(true)
  })

  it('requires approved', () => {
    const result = approveTestimonialSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe('sendFeedbackSchema', () => {
  it('accepts valid send request', () => {
    const result = sendFeedbackSchema.safeParse({
      recipient_email: 'customer@example.com',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty object', () => {
    const result = sendFeedbackSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('validates recipient_email format', () => {
    const result = sendFeedbackSchema.safeParse({
      recipient_email: 'invalid',
    })
    expect(result.success).toBe(false)
  })

  it('accepts custom_message', () => {
    const result = sendFeedbackSchema.safeParse({
      custom_message: 'We would appreciate your feedback',
    })
    expect(result.success).toBe(true)
  })

  it('rejects custom_message exceeding max length', () => {
    const result = sendFeedbackSchema.safeParse({
      custom_message: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })
})
