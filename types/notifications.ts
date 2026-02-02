import { ProfileRelation } from './jobs'

// Notification types
export type NotificationType =
  | 'job_assigned'
  | 'job_completed'
  | 'job_completion_review'
  | 'proposal_signed'
  | 'proposal_viewed'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'invoice_viewed'
  | 'payment_failed'
  | 'feedback_received'
  | 'testimonial_pending'
  | 'system'
  | 'reminder'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export type NotificationChannel = 'in_app' | 'email' | 'push'

// ============================================
// Notifications
// ============================================
export interface Notification {
  id: string
  organization_id: string
  user_id: string
  type: NotificationType
  title: string
  message: string | null
  entity_type: string | null
  entity_id: string | null
  action_url: string | null
  action_label: string | null
  is_read: boolean
  read_at: string | null
  priority: NotificationPriority
  email_sent: boolean
  email_sent_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  expires_at: string | null
}

export interface CreateNotificationInput {
  user_id: string
  type: NotificationType
  title: string
  message?: string
  entity_type?: string
  entity_id?: string
  action_url?: string
  action_label?: string
  priority?: NotificationPriority
  metadata?: Record<string, unknown>
  expires_at?: string
}

export interface CreateNotificationForRoleInput {
  role: string
  type: NotificationType
  title: string
  message?: string
  entity_type?: string
  entity_id?: string
  action_url?: string
  priority?: NotificationPriority
}

// ============================================
// Notification Preferences
// ============================================
export interface NotificationPreference {
  id: string
  user_id: string
  organization_id: string
  notification_type: NotificationType
  in_app: boolean
  email: boolean
  push: boolean
  created_at: string
  updated_at: string
}

export interface UpdatePreferenceInput {
  notification_type: NotificationType
  in_app?: boolean
  email?: boolean
  push?: boolean
}

// ============================================
// Push Subscriptions
// ============================================
export interface PushSubscription {
  id: string
  user_id: string
  organization_id: string
  endpoint: string
  p256dh_key: string
  auth_key: string
  device_name: string | null
  user_agent: string | null
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export interface CreatePushSubscriptionInput {
  endpoint: string
  p256dh_key: string
  auth_key: string
  device_name?: string
}

// ============================================
// UI Configuration
// ============================================
export const notificationTypeConfig: Record<NotificationType, {
  label: string
  description: string
  icon: string
  color: string
  bgColor: string
}> = {
  job_assigned: {
    label: 'Job Assigned',
    description: 'When you are assigned to a job',
    icon: 'Briefcase',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  job_completed: {
    label: 'Job Completed',
    description: 'When a job is marked as completed',
    icon: 'CheckCircle',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  job_completion_review: {
    label: 'Completion Review',
    description: 'When a job completion needs review',
    icon: 'ClipboardCheck',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  proposal_signed: {
    label: 'Proposal Signed',
    description: 'When a customer signs a proposal',
    icon: 'FileCheck',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  proposal_viewed: {
    label: 'Proposal Viewed',
    description: 'When a customer views a proposal',
    icon: 'Eye',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  invoice_paid: {
    label: 'Invoice Paid',
    description: 'When an invoice is paid',
    icon: 'DollarSign',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
  invoice_overdue: {
    label: 'Invoice Overdue',
    description: 'When an invoice becomes overdue',
    icon: 'AlertCircle',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  invoice_viewed: {
    label: 'Invoice Viewed',
    description: 'When a customer views an invoice',
    icon: 'Eye',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  payment_failed: {
    label: 'Payment Failed',
    description: 'When a payment attempt fails',
    icon: 'AlertCircle',
    color: 'text-red-700',
    bgColor: 'bg-red-100',
  },
  feedback_received: {
    label: 'Feedback Received',
    description: 'When customer feedback is submitted',
    icon: 'MessageSquare',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  testimonial_pending: {
    label: 'Testimonial Pending',
    description: 'When a testimonial needs approval',
    icon: 'Quote',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
  },
  system: {
    label: 'System',
    description: 'System announcements and updates',
    icon: 'Info',
    color: 'text-gray-700',
    bgColor: 'bg-gray-100',
  },
  reminder: {
    label: 'Reminder',
    description: 'Scheduled reminders',
    icon: 'Bell',
    color: 'text-orange-700',
    bgColor: 'bg-orange-100',
  },
}

export const priorityConfig: Record<NotificationPriority, {
  label: string
  color: string
  bgColor: string
}> = {
  low: { label: 'Low', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  normal: { label: 'Normal', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  high: { label: 'High', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  urgent: { label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-100' },
}

// Default notification preferences
export const defaultNotificationPreferences: Record<NotificationType, {
  in_app: boolean
  email: boolean
  push: boolean
}> = {
  job_assigned: { in_app: true, email: true, push: true },
  job_completed: { in_app: true, email: true, push: false },
  job_completion_review: { in_app: true, email: true, push: true },
  proposal_signed: { in_app: true, email: true, push: true },
  proposal_viewed: { in_app: true, email: false, push: false },
  invoice_paid: { in_app: true, email: true, push: true },
  invoice_overdue: { in_app: true, email: true, push: false },
  invoice_viewed: { in_app: true, email: false, push: false },
  payment_failed: { in_app: true, email: true, push: true },
  feedback_received: { in_app: true, email: true, push: false },
  testimonial_pending: { in_app: true, email: true, push: false },
  system: { in_app: true, email: true, push: false },
  reminder: { in_app: true, email: true, push: false },
}
