import { z } from 'zod'

// Notification type (matches NotificationType from types/notifications.ts)
export const notificationTypeSchema = z.enum([
  'job_assigned',
  'job_completed',
  'job_completion_review',
  'proposal_signed',
  'proposal_viewed',
  'invoice_paid',
  'invoice_overdue',
  'invoice_viewed',
  'payment_failed',
  'feedback_received',
  'testimonial_pending',
  'sms_received',
  'system',
  'reminder',
])

// Notification priority
export const notificationPrioritySchema = z.enum(['low', 'normal', 'high', 'urgent'])

// Create notification
export const createNotificationSchema = z.object({
  user_id: z.string().uuid('Invalid user ID'),
  type: notificationTypeSchema,
  title: z.string().min(1, 'Title is required').max(255),
  message: z.string().max(1000).optional(),
  entity_type: z.string().max(50).optional(),
  entity_id: z.string().uuid().optional(),
  action_url: z.string().max(500).optional(),
  action_label: z.string().max(100).optional(),
  priority: notificationPrioritySchema.optional().default('normal'),
  metadata: z.record(z.string(), z.unknown()).optional(),
  expires_at: z.string().datetime().optional(),
})

// Notification list query
export const notificationListQuerySchema = z.object({
  limit: z.string().transform(Number).optional(),
  offset: z.string().transform(Number).optional(),
  unread: z.string().optional(),
}).passthrough()

// Update notification preference. user_id is optional — when provided
// the API treats it as "configure this OTHER user's preferences" and
// requires the caller to have admin role; when omitted, it edits the
// caller's own preferences.
export const updateNotificationPreferenceSchema = z.object({
  notification_type: notificationTypeSchema,
  user_id: z.string().uuid().optional(),
  in_app: z.boolean().optional(),
  email: z.boolean().optional(),
  push: z.boolean().optional(),
})

// Query for GET /api/notifications/preferences — admin can pass a
// user_id to inspect a teammate's preferences.
export const notificationPreferencesQuerySchema = z.object({
  user_id: z.string().uuid().optional(),
}).passthrough()

// Export types
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>
export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>
export type NotificationType = z.infer<typeof notificationTypeSchema>
export type NotificationPriority = z.infer<typeof notificationPrioritySchema>
