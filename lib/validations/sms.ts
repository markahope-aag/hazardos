import { z } from 'zod'

// SMS message types (matches database enum sms_message_type)
export const smsMessageTypeSchema = z.enum([
  'appointment_reminder',
  'job_status',
  'lead_notification',
  'payment_reminder',
  'estimate_follow_up',
  'general',
])

// SMS status
export const smsStatusSchema = z.enum([
  'queued',
  'sending',
  'sent',
  'delivered',
  'failed',
  'undelivered',
])

// Create SMS template
export const createSmsTemplateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  message_type: smsMessageTypeSchema,
  body: z.string().min(1, 'Body is required').max(1600), // SMS character limit
})

// Update SMS template
export const updateSmsTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  message_type: smsMessageTypeSchema.optional(),
  body: z.string().min(1).max(1600).optional(),
  is_active: z.boolean().optional(),
})

// SMS messages query
export const smsMessagesQuerySchema = z.object({
  customer_id: z.string().uuid().optional(),
  status: smsStatusSchema.optional(),
  message_type: smsMessageTypeSchema.optional(),
  limit: z.string().transform(Number).optional(),
}).passthrough()

// Send SMS
export const sendSmsSchema = z.object({
  to: z.string().min(10, 'Valid phone number required').max(20),
  body: z.string().min(1, 'Message body is required').max(1600),
  message_type: smsMessageTypeSchema,
  customer_id: z.string().uuid().optional(),
  related_entity_type: z.string().max(50).optional(),
  related_entity_id: z.string().uuid().optional(),
})

// SMS settings
export const updateSmsSettingsSchema = z.object({
  sms_enabled: z.boolean().optional(),
  appointment_reminders_enabled: z.boolean().optional(),
  appointment_reminder_hours: z.number().int().min(1).max(168).optional(),
  job_status_updates_enabled: z.boolean().optional(),
  lead_notifications_enabled: z.boolean().optional(),
  payment_reminders_enabled: z.boolean().optional(),
  quiet_hours_enabled: z.boolean().optional(),
  quiet_hours_start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quiet_hours_end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().max(50).optional(),
  use_platform_twilio: z.boolean().optional(),
  twilio_account_sid: z.string().max(100).optional(),
  twilio_auth_token: z.string().max(100).optional(),
  twilio_phone_number: z.string().max(20).optional(),
})

// Export types
export type CreateSmsTemplateInput = z.infer<typeof createSmsTemplateSchema>
export type UpdateSmsTemplateInput = z.infer<typeof updateSmsTemplateSchema>
export type SendSmsInput = z.infer<typeof sendSmsSchema>
export type UpdateSmsSettingsInput = z.infer<typeof updateSmsSettingsSchema>
