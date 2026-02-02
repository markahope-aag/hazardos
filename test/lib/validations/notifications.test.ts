import { describe, it, expect } from 'vitest'
import {
  notificationTypeSchema,
  notificationPrioritySchema,
  createNotificationSchema,
  notificationListQuerySchema,
  updateNotificationPreferenceSchema,
} from '@/lib/validations/notifications'

describe('notificationTypeSchema', () => {
  it('accepts valid notification types', () => {
    const types = [
      'job_assigned',
      'job_completed',
      'job_completion_review',
      'proposal_signed',
      'proposal_viewed',
      'invoice_paid',
      'invoice_overdue',
      'invoice_viewed',
      'feedback_received',
      'testimonial_pending',
      'system',
      'reminder',
    ]
    for (const type of types) {
      const result = notificationTypeSchema.safeParse(type)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid notification type', () => {
    const result = notificationTypeSchema.safeParse('invalid')
    expect(result.success).toBe(false)
  })
})

describe('notificationPrioritySchema', () => {
  it('accepts valid priorities', () => {
    const priorities = ['low', 'normal', 'high', 'urgent']
    for (const priority of priorities) {
      const result = notificationPrioritySchema.safeParse(priority)
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid priority', () => {
    const result = notificationPrioritySchema.safeParse('critical')
    expect(result.success).toBe(false)
  })
})

describe('createNotificationSchema', () => {
  const validNotification = {
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    type: 'job_assigned' as const,
    title: 'New Job Assignment',
  }

  it('accepts valid notification', () => {
    const result = createNotificationSchema.safeParse(validNotification)
    expect(result.success).toBe(true)
  })

  it('requires user_id', () => {
    const result = createNotificationSchema.safeParse({
      type: 'job_assigned',
      title: 'New Job',
    })
    expect(result.success).toBe(false)
  })

  it('requires valid UUID for user_id', () => {
    const result = createNotificationSchema.safeParse({
      user_id: 'not-a-uuid',
      type: 'job_assigned',
      title: 'New Job',
    })
    expect(result.success).toBe(false)
  })

  it('requires type', () => {
    const result = createNotificationSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'New Job',
    })
    expect(result.success).toBe(false)
  })

  it('requires title', () => {
    const result = createNotificationSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'job_assigned',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty title', () => {
    const result = createNotificationSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
      type: 'job_assigned',
      title: '',
    })
    expect(result.success).toBe(false)
  })

  it('defaults priority to normal', () => {
    const result = createNotificationSchema.safeParse(validNotification)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.priority).toBe('normal')
    }
  })

  it('accepts all optional fields', () => {
    const result = createNotificationSchema.safeParse({
      ...validNotification,
      message: 'You have been assigned to a new job',
      entity_type: 'job',
      entity_id: '550e8400-e29b-41d4-a716-446655440001',
      action_url: '/jobs/123',
      action_label: 'View Job',
      priority: 'high',
      metadata: { key: 'value' },
      expires_at: '2024-02-01T00:00:00Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects title exceeding max length', () => {
    const result = createNotificationSchema.safeParse({
      ...validNotification,
      title: 'a'.repeat(256),
    })
    expect(result.success).toBe(false)
  })

  it('rejects message exceeding max length', () => {
    const result = createNotificationSchema.safeParse({
      ...validNotification,
      message: 'a'.repeat(1001),
    })
    expect(result.success).toBe(false)
  })

  it('validates expires_at datetime format', () => {
    const result = createNotificationSchema.safeParse({
      ...validNotification,
      expires_at: 'invalid',
    })
    expect(result.success).toBe(false)
  })
})

describe('notificationListQuerySchema', () => {
  it('accepts valid query', () => {
    const result = notificationListQuerySchema.safeParse({
      limit: '10',
      offset: '0',
      unread: 'true',
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty query', () => {
    const result = notificationListQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('transforms string to number', () => {
    const result = notificationListQuerySchema.safeParse({
      limit: '25',
      offset: '10',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.limit).toBe(25)
      expect(result.data.offset).toBe(10)
    }
  })

  it('allows passthrough of additional fields', () => {
    const result = notificationListQuerySchema.safeParse({
      custom_field: 'value',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.custom_field).toBe('value')
    }
  })
})

describe('updateNotificationPreferenceSchema', () => {
  it('accepts valid preference update', () => {
    const result = updateNotificationPreferenceSchema.safeParse({
      notification_type: 'job_assigned',
      in_app: true,
      email: false,
    })
    expect(result.success).toBe(true)
  })

  it('requires notification_type', () => {
    const result = updateNotificationPreferenceSchema.safeParse({
      in_app: true,
    })
    expect(result.success).toBe(false)
  })

  it('accepts in_app preference', () => {
    const result = updateNotificationPreferenceSchema.safeParse({
      notification_type: 'invoice_paid',
      in_app: false,
    })
    expect(result.success).toBe(true)
  })

  it('accepts email preference', () => {
    const result = updateNotificationPreferenceSchema.safeParse({
      notification_type: 'invoice_paid',
      email: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts push preference', () => {
    const result = updateNotificationPreferenceSchema.safeParse({
      notification_type: 'invoice_paid',
      push: true,
    })
    expect(result.success).toBe(true)
  })

  it('accepts all preferences', () => {
    const result = updateNotificationPreferenceSchema.safeParse({
      notification_type: 'feedback_received',
      in_app: true,
      email: true,
      push: false,
    })
    expect(result.success).toBe(true)
  })
})
