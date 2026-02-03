import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock notification service functionality
interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  read: boolean
  created_at: string
  data?: Record<string, any>
}

interface NotificationTemplate {
  id: string
  name: string
  title: string
  message: string
  type: Notification['type']
  variables: string[]
}

class NotificationServiceMock {
  private notifications: Map<string, Notification> = new Map()
  private templates: Map<string, NotificationTemplate> = new Map()
  private userPreferences: Map<string, { email: boolean; push: boolean; sms: boolean }> = new Map()

  constructor() {
    // Add default templates
    this.templates.set('job-completed', {
      id: 'job-completed',
      name: 'Job Completed',
      title: 'Job {{job_title}} completed',
      message: 'Your job "{{job_title}}" has been completed successfully.',
      type: 'success',
      variables: ['job_title']
    })

    this.templates.set('invoice-overdue', {
      id: 'invoice-overdue',
      name: 'Invoice Overdue',
      title: 'Invoice {{invoice_number}} is overdue',
      message: 'Invoice {{invoice_number}} for {{amount}} is now overdue.',
      type: 'warning',
      variables: ['invoice_number', 'amount']
    })
  }

  async create(
    userId: string,
    title: string,
    message: string,
    type: Notification['type'] = 'info',
    data?: Record<string, any>
  ): Promise<Notification> {
    const notification: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      user_id: userId,
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString(),
      data
    }

    this.notifications.set(notification.id, notification)
    return notification
  }

  async createFromTemplate(
    templateId: string,
    userId: string,
    variables: Record<string, string>,
    data?: Record<string, any>
  ): Promise<Notification> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template '${templateId}' not found`)
    }

    // Validate required variables
    const missingVars = template.variables.filter(varName => !(varName in variables))
    if (missingVars.length > 0) {
      throw new Error(`Missing template variables: ${missingVars.join(', ')}`)
    }

    // Replace variables in title and message
    let title = template.title
    let message = template.message

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      title = title.replace(new RegExp(placeholder, 'g'), value)
      message = message.replace(new RegExp(placeholder, 'g'), value)
    }

    return this.create(userId, title, message, template.type, data)
  }

  async getById(id: string): Promise<Notification | null> {
    return this.notifications.get(id) || null
  }

  async getByUserId(userId: string, options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: Notification['type']
  } = {}): Promise<{ notifications: Notification[]; total: number }> {
    const { limit = 50, offset = 0, unreadOnly = false, type } = options

    let filtered = Array.from(this.notifications.values())
      .filter(n => n.user_id === userId)

    if (unreadOnly) {
      filtered = filtered.filter(n => !n.read)
    }

    if (type) {
      filtered = filtered.filter(n => n.type === type)
    }

    // Sort by created_at desc
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    const total = filtered.length
    const notifications = filtered.slice(offset, offset + limit)

    return { notifications, total }
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    const notification = this.notifications.get(id)
    if (!notification || notification.user_id !== userId) {
      return false
    }

    notification.read = true
    this.notifications.set(id, notification)
    return true
  }

  async markAllAsRead(userId: string): Promise<number> {
    let count = 0
    for (const [id, notification] of this.notifications.entries()) {
      if (notification.user_id === userId && !notification.read) {
        notification.read = true
        this.notifications.set(id, notification)
        count++
      }
    }
    return count
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const notification = this.notifications.get(id)
    if (!notification || notification.user_id !== userId) {
      return false
    }

    return this.notifications.delete(id)
  }

  async deleteAll(userId: string, olderThanDays?: number): Promise<number> {
    let count = 0
    const cutoffDate = olderThanDays 
      ? new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
      : null

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.user_id === userId) {
        if (!cutoffDate || new Date(notification.created_at) < cutoffDate) {
          this.notifications.delete(id)
          count++
        }
      }
    }

    return count
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(n => n.user_id === userId && !n.read)
      .length
  }

  async getStats(userId: string): Promise<{
    total: number
    unread: number
    byType: Record<Notification['type'], number>
    recent: number
  }> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.user_id === userId)

    const total = userNotifications.length
    const unread = userNotifications.filter(n => !n.read).length

    const byType: Record<Notification['type'], number> = {
      info: 0,
      success: 0,
      warning: 0,
      error: 0
    }

    userNotifications.forEach(n => {
      byType[n.type]++
    })

    // Recent = last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recent = userNotifications.filter(n => new Date(n.created_at) > oneDayAgo).length

    return { total, unread, byType, recent }
  }

  // Preference management
  async setPreferences(
    userId: string,
    preferences: { email: boolean; push: boolean; sms: boolean }
  ): Promise<void> {
    this.userPreferences.set(userId, preferences)
  }

  async getPreferences(userId: string): Promise<{ email: boolean; push: boolean; sms: boolean }> {
    return this.userPreferences.get(userId) || { email: true, push: true, sms: false }
  }

  // Template management
  getTemplate(id: string): NotificationTemplate | undefined {
    return this.templates.get(id)
  }

  getAllTemplates(): NotificationTemplate[] {
    return Array.from(this.templates.values())
  }

  createTemplate(template: Omit<NotificationTemplate, 'id'>): NotificationTemplate {
    const id = template.name.toLowerCase().replace(/\s+/g, '-')
    const newTemplate: NotificationTemplate = { ...template, id }
    this.templates.set(id, newTemplate)
    return newTemplate
  }

  // Bulk operations
  async createBulk(notifications: Array<{
    userId: string
    title: string
    message: string
    type?: Notification['type']
    data?: Record<string, any>
  }>): Promise<Notification[]> {
    const results: Notification[] = []

    for (const notif of notifications) {
      const created = await this.create(
        notif.userId,
        notif.title,
        notif.message,
        notif.type,
        notif.data
      )
      results.push(created)
    }

    return results
  }

  async broadcast(
    userIds: string[],
    title: string,
    message: string,
    type: Notification['type'] = 'info',
    data?: Record<string, any>
  ): Promise<Notification[]> {
    const notifications = userIds.map(userId => ({
      userId,
      title,
      message,
      type,
      data
    }))

    return this.createBulk(notifications)
  }
}

describe('NotificationServiceMock', () => {
  let service: NotificationServiceMock
  const userId = 'user-123'

  beforeEach(() => {
    service = new NotificationServiceMock()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('create', () => {
    it('should create notification with required fields', async () => {
      const notification = await service.create(
        userId,
        'Test Title',
        'Test Message'
      )

      expect(notification.user_id).toBe(userId)
      expect(notification.title).toBe('Test Title')
      expect(notification.message).toBe('Test Message')
      expect(notification.type).toBe('info') // default
      expect(notification.read).toBe(false)
      expect(notification.id).toMatch(/^notif-\d+-[a-z0-9]+$/)
      expect(notification.created_at).toBeDefined()
    })

    it('should create notification with custom type and data', async () => {
      const data = { jobId: 'job-123', amount: 1000 }
      const notification = await service.create(
        userId,
        'Job Complete',
        'Your job is done',
        'success',
        data
      )

      expect(notification.type).toBe('success')
      expect(notification.data).toEqual(data)
    })
  })

  describe('createFromTemplate', () => {
    it('should create notification from job-completed template', async () => {
      const notification = await service.createFromTemplate(
        'job-completed',
        userId,
        { job_title: 'Asbestos Removal' }
      )

      expect(notification.title).toBe('Job Asbestos Removal completed')
      expect(notification.message).toBe('Your job "Asbestos Removal" has been completed successfully.')
      expect(notification.type).toBe('success')
    })

    it('should create notification from invoice-overdue template', async () => {
      const notification = await service.createFromTemplate(
        'invoice-overdue',
        userId,
        { 
          invoice_number: 'INV-001',
          amount: '$1,234.56'
        }
      )

      expect(notification.title).toBe('Invoice INV-001 is overdue')
      expect(notification.message).toBe('Invoice INV-001 for $1,234.56 is now overdue.')
      expect(notification.type).toBe('warning')
    })

    it('should throw error for missing template', async () => {
      await expect(
        service.createFromTemplate('nonexistent', userId, {})
      ).rejects.toThrow("Template 'nonexistent' not found")
    })

    it('should throw error for missing variables', async () => {
      await expect(
        service.createFromTemplate('job-completed', userId, {})
      ).rejects.toThrow('Missing template variables: job_title')
    })
  })

  describe('getById and getByUserId', () => {
    beforeEach(async () => {
      await service.create(userId, 'Title 1', 'Message 1', 'info')
      await service.create(userId, 'Title 2', 'Message 2', 'success')
      await service.create('other-user', 'Title 3', 'Message 3', 'error')
    })

    it('should get notification by id', async () => {
      const notifications = await service.getByUserId(userId)
      const firstNotif = notifications.notifications[0]

      const retrieved = await service.getById(firstNotif.id)
      expect(retrieved).toEqual(firstNotif)
    })

    it('should return null for non-existent notification', async () => {
      const notification = await service.getById('nonexistent')
      expect(notification).toBeNull()
    })

    it('should get notifications for user', async () => {
      const result = await service.getByUserId(userId)

      expect(result.notifications).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.notifications.every(n => n.user_id === userId)).toBe(true)
    })

    it('should filter by type', async () => {
      const result = await service.getByUserId(userId, { type: 'success' })

      expect(result.notifications).toHaveLength(1)
      expect(result.notifications[0].type).toBe('success')
    })

    it('should filter unread only', async () => {
      const notifications = await service.getByUserId(userId)
      await service.markAsRead(notifications.notifications[0].id, userId)

      const unreadResult = await service.getByUserId(userId, { unreadOnly: true })

      expect(unreadResult.notifications).toHaveLength(1)
      expect(unreadResult.notifications[0].read).toBe(false)
    })

    it('should handle pagination', async () => {
      // Create more notifications
      for (let i = 0; i < 10; i++) {
        await service.create(userId, `Title ${i}`, `Message ${i}`)
      }

      const page1 = await service.getByUserId(userId, { limit: 5, offset: 0 })
      const page2 = await service.getByUserId(userId, { limit: 5, offset: 5 })

      expect(page1.notifications).toHaveLength(5)
      expect(page2.notifications).toHaveLength(5)
      expect(page1.total).toBe(12) // 2 from beforeEach + 10 new
      expect(page2.total).toBe(12)
    })
  })

  describe('markAsRead and markAllAsRead', () => {
    it('should mark notification as read', async () => {
      const notification = await service.create(userId, 'Title', 'Message')
      
      const marked = await service.markAsRead(notification.id, userId)
      expect(marked).toBe(true)

      const retrieved = await service.getById(notification.id)
      expect(retrieved?.read).toBe(true)
    })

    it('should not mark other users notification as read', async () => {
      const notification = await service.create(userId, 'Title', 'Message')
      
      const marked = await service.markAsRead(notification.id, 'other-user')
      expect(marked).toBe(false)

      const retrieved = await service.getById(notification.id)
      expect(retrieved?.read).toBe(false)
    })

    it('should mark all notifications as read', async () => {
      await service.create(userId, 'Title 1', 'Message 1')
      await service.create(userId, 'Title 2', 'Message 2')
      await service.create('other-user', 'Title 3', 'Message 3')

      const count = await service.markAllAsRead(userId)
      expect(count).toBe(2)

      const userNotifications = await service.getByUserId(userId)
      expect(userNotifications.notifications.every(n => n.read)).toBe(true)
    })
  })

  describe('delete and deleteAll', () => {
    it('should delete own notification', async () => {
      const notification = await service.create(userId, 'Title', 'Message')
      
      const deleted = await service.delete(notification.id, userId)
      expect(deleted).toBe(true)

      const retrieved = await service.getById(notification.id)
      expect(retrieved).toBeNull()
    })

    it('should not delete other users notification', async () => {
      const notification = await service.create(userId, 'Title', 'Message')
      
      const deleted = await service.delete(notification.id, 'other-user')
      expect(deleted).toBe(false)

      const retrieved = await service.getById(notification.id)
      expect(retrieved).not.toBeNull()
    })

    it('should delete all user notifications', async () => {
      await service.create(userId, 'Title 1', 'Message 1')
      await service.create(userId, 'Title 2', 'Message 2')
      await service.create('other-user', 'Title 3', 'Message 3')

      const count = await service.deleteAll(userId)
      expect(count).toBe(2)

      const userNotifications = await service.getByUserId(userId)
      expect(userNotifications.notifications).toHaveLength(0)
    })

    it('should delete old notifications only', async () => {
      const oldNotif = await service.create(userId, 'Old', 'Old message')
      const newNotif = await service.create(userId, 'New', 'New message')

      // Make first notification old
      const oldDate = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) // 40 days ago
      service['notifications'].set(oldNotif.id, { ...oldNotif, created_at: oldDate.toISOString() })

      const count = await service.deleteAll(userId, 30) // Delete older than 30 days
      expect(count).toBe(1)

      expect(await service.getById(oldNotif.id)).toBeNull()
      expect(await service.getById(newNotif.id)).not.toBeNull()
    })
  })

  describe('getUnreadCount and getStats', () => {
    beforeEach(async () => {
      await service.create(userId, 'Info', 'Info message', 'info')
      await service.create(userId, 'Success', 'Success message', 'success')
      await service.create(userId, 'Warning', 'Warning message', 'warning')
      
      const notifications = await service.getByUserId(userId)
      await service.markAsRead(notifications.notifications[0].id, userId) // Mark first as read
    })

    it('should get unread count', async () => {
      const count = await service.getUnreadCount(userId)
      expect(count).toBe(2) // 2 out of 3 are unread
    })

    it('should get comprehensive stats', async () => {
      const stats = await service.getStats(userId)

      expect(stats.total).toBe(3)
      expect(stats.unread).toBe(2)
      expect(stats.byType.info).toBe(1)
      expect(stats.byType.success).toBe(1)
      expect(stats.byType.warning).toBe(1)
      expect(stats.byType.error).toBe(0)
      expect(stats.recent).toBe(3) // All created recently
    })
  })

  describe('preferences', () => {
    it('should set and get user preferences', async () => {
      const preferences = { email: false, push: true, sms: true }
      
      await service.setPreferences(userId, preferences)
      const retrieved = await service.getPreferences(userId)

      expect(retrieved).toEqual(preferences)
    })

    it('should return default preferences for new user', async () => {
      const preferences = await service.getPreferences('new-user')
      
      expect(preferences).toEqual({ email: true, push: true, sms: false })
    })
  })

  describe('template management', () => {
    it('should create custom template', () => {
      const template = service.createTemplate({
        name: 'Payment Received',
        title: 'Payment of {{amount}} received',
        message: 'We have received your payment of {{amount}} for invoice {{invoice_number}}.',
        type: 'success',
        variables: ['amount', 'invoice_number']
      })

      expect(template.id).toBe('payment-received')
      expect(service.getTemplate('payment-received')).toEqual(template)
    })

    it('should get all templates', () => {
      const templates = service.getAllTemplates()
      
      expect(templates).toHaveLength(2) // job-completed and invoice-overdue
      expect(templates.map(t => t.id)).toContain('job-completed')
      expect(templates.map(t => t.id)).toContain('invoice-overdue')
    })
  })

  describe('bulk operations', () => {
    it('should create bulk notifications', async () => {
      const notifications = [
        { userId: 'user1', title: 'Title 1', message: 'Message 1' },
        { userId: 'user2', title: 'Title 2', message: 'Message 2', type: 'success' as const },
        { userId: 'user3', title: 'Title 3', message: 'Message 3', type: 'error' as const }
      ]

      const results = await service.createBulk(notifications)

      expect(results).toHaveLength(3)
      expect(results[0].user_id).toBe('user1')
      expect(results[1].type).toBe('success')
      expect(results[2].type).toBe('error')
    })

    it('should broadcast to multiple users', async () => {
      const userIds = ['user1', 'user2', 'user3']
      
      const results = await service.broadcast(
        userIds,
        'System Maintenance',
        'System will be down for maintenance',
        'warning'
      )

      expect(results).toHaveLength(3)
      expect(results.every(r => r.title === 'System Maintenance')).toBe(true)
      expect(results.every(r => r.type === 'warning')).toBe(true)
      expect(results.map(r => r.user_id)).toEqual(userIds)
    })
  })

  describe('integration tests', () => {
    it('should handle complete notification workflow', async () => {
      // Create template
      service.createTemplate({
        name: 'Job Started',
        title: 'Job {{job_title}} has started',
        message: 'Your job "{{job_title}}" is now in progress.',
        type: 'info',
        variables: ['job_title']
      })

      // Create notification from template
      const notification = await service.createFromTemplate(
        'job-started',
        userId,
        { job_title: 'Kitchen Renovation' }
      )

      expect(notification.title).toBe('Job Kitchen Renovation has started')

      // Check stats
      let stats = await service.getStats(userId)
      expect(stats.total).toBe(1)
      expect(stats.unread).toBe(1)

      // Mark as read
      await service.markAsRead(notification.id, userId)

      // Check stats again
      stats = await service.getStats(userId)
      expect(stats.unread).toBe(0)

      // Set preferences
      await service.setPreferences(userId, { email: false, push: true, sms: false })
      const preferences = await service.getPreferences(userId)
      expect(preferences.email).toBe(false)
    })

    it('should handle multi-user scenario', async () => {
      const users = ['user1', 'user2', 'user3']

      // Broadcast to all users
      await service.broadcast(users, 'Welcome', 'Welcome to the platform!')

      // Create individual notifications
      for (const user of users) {
        await service.create(user, `Personal for ${user}`, 'Personal message')
      }

      // Verify each user has 2 notifications
      for (const user of users) {
        const result = await service.getByUserId(user)
        expect(result.total).toBe(2)
      }

      // Mark all as read for user1
      await service.markAllAsRead('user1')
      
      const user1Stats = await service.getStats('user1')
      const user2Stats = await service.getStats('user2')
      
      expect(user1Stats.unread).toBe(0)
      expect(user2Stats.unread).toBe(2)
    })
  })
})