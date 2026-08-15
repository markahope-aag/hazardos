import { z } from 'zod'

/**
 * Validation for tenant-authored SMS templates. Mirrors
 * lib/validations/email-templates.ts; `message_type` additionally has to
 * match the sms_message_type Postgres enum (baseline migration, 00000000000000).
 * `incoming_message` is excluded — that value tags inbound messages, not
 * something a tenant would ever compose a template for.
 */

export const SMS_TEMPLATE_MESSAGE_TYPES = [
  'appointment_reminder',
  'job_status',
  'lead_notification',
  'payment_reminder',
  'estimate_follow_up',
  'general',
  'marketing',
] as const

export const createSmsTemplateSchema = z.object({
  name: z.string().min(1, 'Give the template a name').max(100),
  message_type: z.enum(SMS_TEMPLATE_MESSAGE_TYPES),
  // SMS providers split anything past 160 chars (GSM-7) into extra billed
  // segments. Generous enough for a few segments without inviting an essay.
  body: z.string().min(1, 'Write the message').max(1000),
  is_active: z.boolean().optional(),
})

export const updateSmsTemplateSchema = createSmsTemplateSchema.partial()

export type CreateSmsTemplateInput = z.infer<typeof createSmsTemplateSchema>
export type UpdateSmsTemplateInput = z.infer<typeof updateSmsTemplateSchema>
