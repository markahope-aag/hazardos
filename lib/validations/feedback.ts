import { z } from 'zod'

// Feedback survey list query
export const feedbackListQuerySchema = z.object({
  status: z.string().optional(),
  job_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
}).passthrough()

// Create feedback survey
export const createFeedbackSurveySchema = z.object({
  job_id: z.string().uuid('Invalid job ID'),
  send_immediately: z.boolean().optional(),
  recipient_email: z.string().email().optional(),
})

// Submit feedback response (public)
export const submitFeedbackSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  rating: z.number().int().min(1).max(5),
  comments: z.string().max(2000).optional(),
  would_recommend: z.boolean().optional(),
  allow_testimonial: z.boolean().optional(),
})

// Approve testimonial
export const approveTestimonialSchema = z.object({
  approved: z.boolean(),
})

// Send feedback request
export const sendFeedbackSchema = z.object({
  recipient_email: z.string().email().optional(),
  custom_message: z.string().max(1000).optional(),
})

// Export types
export type CreateFeedbackSurveyInput = z.infer<typeof createFeedbackSurveySchema>
export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>
