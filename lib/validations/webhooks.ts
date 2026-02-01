import { z } from 'zod'

// Webhook event type
export const webhookEventTypeSchema = z.enum([
  'job.created',
  'job.updated',
  'job.completed',
  'job.cancelled',
  'invoice.created',
  'invoice.sent',
  'invoice.paid',
  'invoice.overdue',
  'proposal.created',
  'proposal.sent',
  'proposal.signed',
  'customer.created',
  'customer.updated',
  'feedback.received',
])

// Create webhook
export const createWebhookSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  url: z.string().url('Invalid URL'),
  events: z.array(webhookEventTypeSchema).min(1, 'At least one event is required'),
  secret: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
})

// Update webhook
export const updateWebhookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().optional(),
  events: z.array(webhookEventTypeSchema).optional(),
  secret: z.string().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  is_active: z.boolean().optional(),
})

// Export types
export type CreateWebhookInput = z.infer<typeof createWebhookSchema>
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>
export type WebhookEventType = z.infer<typeof webhookEventTypeSchema>
