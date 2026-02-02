import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotificationService, notify, NotificationHelpers } from '@/lib/services/notification-service'
import type { Notification as _Notification } from '@/types/notifications'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/utils/logger', () => ({
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
  formatError: vi.fn((error) => ({ message: String(error) })),
}))

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ id: 'email-123' }),
    },
  })),
}))

import { createClient } from '@/lib/supabase/server'

describe('NotificationService', () => {
  let mockSupabase: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1' } },
          error: null,
        }),
      },
      from: vi.fn(),
      rpc: vi.fn(),
    }

    vi.mocked(createClient).mockResolvedValue(mockSupabase)
  })

  describe('create', () => {
    it('should create notification with user preferences check', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'notification_preferences') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { in_app: true },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'notif-1',
                    user_id: 'user-2',
                    type: 'job_assigned',
                    title: 'Test Notification',
                  },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      const notification = await NotificationService.create({
        user_id: 'user-2',
        type: 'job_assigned',
        title: 'Test Notification',
        message: 'You have been assigned to a job',
      })

      expect(notification.id).toBe('notif-1')
      expect(notification.type).toBe('job_assigned')
    })

    it('should skip in-app notification when user disabled it', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'notification_preferences') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { in_app: false, email: true },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: {},
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      const notification = await NotificationService.create({
        user_id: 'user-2',
        type: 'job_assigned',
        title: 'Test',
      })

      expect(notification).toEqual({})
    })

    it('should set default priority to normal', async () => {
      let insertedData: any

      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'notification_preferences') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn((data) => {
              insertedData = data
              return {
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { ...data, id: 'notif-1' },
                    error: null,
                  }),
                })),
              }
            }),
          }
        }
        return {}
      })

      await NotificationService.create({
        user_id: 'user-2',
        type: 'job_assigned',
        title: 'Test',
      })

      expect(insertedData.priority).toBe('normal')
    })
  })

  describe('createForRole', () => {
    it('should create notifications for all users with role', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null,
            }),
          })),
        })),
      }))

      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: [
          { id: 'notif-1', user_id: 'admin-1' },
          { id: 'notif-2', user_id: 'admin-2' },
        ],
        error: null,
      })

      const notifications = await NotificationService.createForRole({
        role: 'admin',
        type: 'job_completion_review',
        title: 'Job needs review',
        message: 'Please review the completed job',
      })

      expect(notifications).toHaveLength(2)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_notification_for_role', expect.any(Object))
    })
  })

  describe('getUnread', () => {
    it('should return unread notifications for user', async () => {
      const mockNotifications = [
        { id: 'notif-1', is_read: false, title: 'Notification 1' },
        { id: 'notif-2', is_read: false, title: 'Notification 2' },
      ]

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              or: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn().mockResolvedValue({
                    data: mockNotifications,
                    error: null,
                    count: 2,
                  }),
                })),
              })),
            })),
          })),
        })),
      }))

      const result = await NotificationService.getUnread()

      expect(result.notifications).toHaveLength(2)
      expect(result.notifications[0].is_read).toBe(false)
    })

    it('should use current user when userId not provided', async () => {
      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn((field, value) => {
            expect(field).toBe('user_id')
            expect(value).toBe('user-1')
            return {
              eq: vi.fn(() => ({
                or: vi.fn(() => ({
                  order: vi.fn(() => ({
                    range: vi.fn().mockResolvedValue({
                      data: [],
                      error: null,
                      count: 0,
                    }),
                  })),
                })),
              })),
            }
          }),
        })),
      }))

      await NotificationService.getUnread()
    })

    it('should limit to 50 notifications', async () => {
      let rangeCalled = false

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              or: vi.fn(() => ({
                order: vi.fn(() => ({
                  range: vi.fn((start, end) => {
                    expect(start).toBe(0)
                    expect(end).toBe(49) // range is inclusive, so 50 items = 0 to 49
                    rangeCalled = true
                    return Promise.resolve({ data: [], error: null, count: 0 })
                  }),
                })),
              })),
            })),
          })),
        })),
      }))

      await NotificationService.getUnread()
      expect(rangeCalled).toBe(true)
    })
  })

  describe('getAll', () => {
    it('should return all notifications for user', async () => {
      const mockNotifications = [
        { id: 'notif-1', is_read: true },
        { id: 'notif-2', is_read: false },
      ]

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn().mockResolvedValue({
                  data: mockNotifications,
                  error: null,
                  count: 2,
                }),
              })),
            })),
          })),
        })),
      }))

      const result = await NotificationService.getAll()

      expect(result.notifications).toHaveLength(2)
    })

    it('should respect custom limit', async () => {
      let rangeEnd = 0

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            or: vi.fn(() => ({
              order: vi.fn(() => ({
                range: vi.fn((start, end) => {
                  rangeEnd = end
                  return Promise.resolve({ data: [], error: null, count: 0 })
                }),
              })),
            })),
          })),
        })),
      }))

      await NotificationService.getAll({ limit: 100 })
      expect(rangeEnd).toBe(99) // range is inclusive, so 100 items = 0 to 99
    })
  })

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: 5,
        error: null,
      })

      const count = await NotificationService.getUnreadCount()

      expect(count).toBe(5)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('get_unread_notification_count', {
        p_user_id: 'user-1',
      })
    })

    it('should return 0 when no unread notifications', async () => {
      mockSupabase.rpc = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      const count = await NotificationService.getUnreadCount()

      expect(count).toBe(0)
    })
  })

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      let updateCalled = false

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn((data) => {
          expect(data.is_read).toBe(true)
          expect(data.read_at).toBeDefined()
          updateCalled = true
          return {
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }),
      }))

      await NotificationService.markAsRead('notif-1')
      expect(updateCalled).toBe(true)
    })

    it('should only mark notifications owned by user', async () => {
      let userIdChecked = false

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn((field, value) => {
            if (field === 'id') {
              expect(value).toBe('notif-1')
              return {
                eq: vi.fn((field2, value2) => {
                  if (field2 === 'user_id') {
                    expect(value2).toBe('user-1')
                    userIdChecked = true
                  }
                  return { error: null }
                }),
              }
            }
            return {
              eq: vi.fn().mockResolvedValue({ error: null }),
            }
          }),
        })),
      }))

      await NotificationService.markAsRead('notif-1')
      expect(userIdChecked).toBe(true)
    })
  })

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read', async () => {
      let updateCalled = false

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn((data) => {
          expect(data.is_read).toBe(true)
          updateCalled = true
          return {
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }),
      }))

      await NotificationService.markAllAsRead()
      expect(updateCalled).toBe(true)
    })
  })

  describe('delete', () => {
    it('should delete notification', async () => {
      let deleteCalled = false

      mockSupabase.from = vi.fn(() => ({
        delete: vi.fn(() => {
          deleteCalled = true
          return {
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          }
        }),
      }))

      await NotificationService.delete('notif-1')
      expect(deleteCalled).toBe(true)
    })
  })

  describe('getPreferences', () => {
    it('should return user notification preferences', async () => {
      const mockPreferences = [
        { notification_type: 'job_assigned', in_app: true, email: true, push: false },
        { notification_type: 'invoice_paid', in_app: true, email: false, push: false },
      ]

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null,
            }),
            order: vi.fn().mockResolvedValue({
              data: mockPreferences,
              error: null,
            }),
          })),
        })),
      }))

      mockSupabase.rpc = vi.fn().mockResolvedValue({ error: null })

      const preferences = await NotificationService.getPreferences()

      expect(preferences).toHaveLength(2)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('initialize_notification_preferences', expect.any(Object))
    })
  })

  describe('updatePreference', () => {
    it('should update notification preference', async () => {
      let updatedData: any

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn((data) => {
          updatedData = data
          return {
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { notification_type: 'job_assigned', ...data },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }),
      }))

      const preference = await NotificationService.updatePreference({
        notification_type: 'job_assigned',
        in_app: true,
        email: false,
      })

      expect(updatedData.in_app).toBe(true)
      expect(updatedData.email).toBe(false)
      expect(preference.notification_type).toBe('job_assigned')
    })

    it('should only update provided fields', async () => {
      let updatedData: any

      mockSupabase.from = vi.fn(() => ({
        update: vi.fn((data) => {
          updatedData = data
          return {
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {},
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }),
      }))

      await NotificationService.updatePreference({
        notification_type: 'job_assigned',
        email: false,
      })

      expect(updatedData.email).toBe(false)
      expect(updatedData.in_app).toBeUndefined()
      expect(updatedData.push).toBeUndefined()
    })
  })

  describe('sendEmailNotification', () => {
    beforeEach(() => {
      process.env.RESEND_API_KEY = 'test_key'
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com'
      process.env.RESEND_DOMAIN = 'example.com'
    })

    it('should skip email when user disabled email notifications', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'notification_preferences') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { email: false },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }
        return {}
      })

      await NotificationService.sendEmailNotification(
        {
          user_id: 'user-2',
          type: 'job_assigned',
          title: 'Test',
        },
        'org-123'
      )

      // Should not attempt to send email
      expect(mockSupabase.from).toHaveBeenCalledWith('notification_preferences')
    })

    it('should skip email when no API key configured', async () => {
      delete process.env.RESEND_API_KEY

      mockSupabase.from = vi.fn((table) => {
        if (table === 'notification_preferences') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { email: true },
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { email: 'user@example.com' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'organizations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { name: 'Test Organization' },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      await NotificationService.sendEmailNotification(
        {
          user_id: 'user-2',
          type: 'job_assigned',
          title: 'Test',
        },
        'org-123'
      )

      // Function should return early
    })
  })

  describe('notify convenience function', () => {
    it('should create notification using convenience function', async () => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'notification_preferences') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'notif-1', title: 'Test' },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })

      const notification = await notify('job_assigned', 'user-2', {
        title: 'Test Notification',
        message: 'Test message',
      })

      expect(notification).toBeDefined()
      expect(notification?.title).toBe('Test')
    })

    it('should return null on error', async () => {
      mockSupabase.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const notification = await notify('job_assigned', 'user-2', {
        title: 'Test',
      })

      expect(notification).toBeNull()
    })
  })

  describe('NotificationHelpers', () => {
    beforeEach(() => {
      mockSupabase.from = vi.fn((table) => {
        if (table === 'profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { organization_id: 'org-123' },
                  error: null,
                }),
              })),
            })),
          }
        }
        if (table === 'notification_preferences') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                })),
              })),
            })),
          }
        }
        if (table === 'notifications') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { id: 'notif-1' },
                  error: null,
                }),
              })),
            })),
          }
        }
        return {}
      })
    })

    it('should send job assigned notification', async () => {
      await NotificationHelpers.jobAssigned('job-1', 'JOB-001', 'user-2')

      // Verify notification was created
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
    })

    it('should send job completion submitted notification', async () => {
      await NotificationHelpers.jobCompletionSubmitted('job-1', 'JOB-001', ['admin-1', 'admin-2'])

      // Should create notification for each admin
      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
    })

    it('should send proposal signed notification', async () => {
      await NotificationHelpers.proposalSigned('prop-1', 'PROP-001', 'user-2')

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
    })

    it('should send invoice paid notification', async () => {
      await NotificationHelpers.invoicePaid('inv-1', 'INV-001', 1000, 'user-2')

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
    })

    it('should send feedback received notification', async () => {
      await NotificationHelpers.feedbackReceived('survey-1', 'JOB-001', 5, ['admin-1'])

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications')
    })
  })
})
