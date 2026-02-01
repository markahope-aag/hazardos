import { z } from 'zod'

// Notification type
export const notificationTypeSchema = z.enum([
  'info',
  'success',
  'warning',
  'error',
  'job_assigned',
  'job_updated',
  'job_completed',
  'approval_required',
  'approval_granted',
  'approval_rejected',
  'invoice_sent',
  'payment_received',
  'proposal_signed',
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
  metadata: z.record(z.unknown()).optional(),
  expires_at: z.string().datetime().optional(),
})

// Notification list query
export const notificationListQuerySchema = z.object({
  limit: z.string().transform(Number).optional(),
  unread: z.string().optional(),
}).passthrough()

// Export types
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>
export type NotificationType = z.infer<typeof notificationTypeSchema>
export type NotificationPriority = z.infer<typeof notificationPrioritySchema>
