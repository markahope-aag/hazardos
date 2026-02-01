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

// Submit feedback response (public - via token)
export const submitFeedbackSchema = z.object({
  rating_overall: z.number().int().min(1).max(5).optional(),
  rating_quality: z.number().int().min(1).max(5).optional(),
  rating_communication: z.number().int().min(1).max(5).optional(),
  rating_timeliness: z.number().int().min(1).max(5).optional(),
  rating_value: z.number().int().min(1).max(5).optional(),
  would_recommend: z.boolean().optional(),
  likelihood_to_recommend: z.number().int().min(0).max(10).optional(),
  feedback_text: z.string().max(5000).optional(),
  improvement_suggestions: z.string().max(2000).optional(),
  testimonial_text: z.string().max(2000).optional(),
  testimonial_permission: z.boolean().optional(),
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
