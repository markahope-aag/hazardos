import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock email service functionality
interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
}

interface EmailMessage {
  id: string
  to: string
  from: string
  subject: string
  body: string
  status: 'pending' | 'sent' | 'failed'
  sent_at?: string
  error?: string
}

class EmailService {
  private templates: Map<string, EmailTemplate> = new Map()
  private messages: Map<string, EmailMessage> = new Map()
  private failureRate: number = 0

  constructor() {
    // Add default templates
    this.templates.set('welcome', {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to {{company_name}}!',
      body: 'Hello {{user_name}}, welcome to our platform!',
      variables: ['company_name', 'user_name']
    })

    this.templates.set('invoice', {
      id: 'invoice',
      name: 'Invoice Notification',
      subject: 'Invoice #{{invoice_number}} - {{amount}}',
      body: 'Your invoice #{{invoice_number}} for {{amount}} is ready.',
      variables: ['invoice_number', 'amount']
    })
  }

  setFailureRate(rate: number): void {
    this.failureRate = Math.max(0, Math.min(1, rate))
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    from: string = 'noreply@hazardos.com'
  ): Promise<EmailMessage> {
    const message: EmailMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      to,
      from,
      subject,
      body,
      status: 'pending'
    }

    this.messages.set(message.id, message)

    // Simulate sending delay
    await new Promise(resolve => setTimeout(resolve, 10))

    // Simulate failure rate
    if (Math.random() < this.failureRate) {
      message.status = 'failed'
      message.error = 'SMTP connection failed'
    } else {
      message.status = 'sent'
      message.sent_at = new Date().toISOString()
    }

    this.messages.set(message.id, message)
    return message
  }

  async sendTemplateEmail(
    templateId: string,
    to: string,
    variables: Record<string, string>,
    from?: string
  ): Promise<EmailMessage> {
    const template = this.templates.get(templateId)
    if (!template) {
      throw new Error(`Template '${templateId}' not found`)
    }

    // Validate required variables
    const missingVars = template.variables.filter(varName => !(varName in variables))
    if (missingVars.length > 0) {
      throw new Error(`Missing template variables: ${missingVars.join(', ')}`)
    }

    // Replace variables in subject and body
    let subject = template.subject
    let body = template.body

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`
      subject = subject.replace(new RegExp(placeholder, 'g'), value)
      body = body.replace(new RegExp(placeholder, 'g'), value)
    }

    return this.sendEmail(to, subject, body, from)
  }

  async sendBulkEmails(emails: Array<{
    to: string
    subject: string
    body: string
    from?: string
  }>): Promise<EmailMessage[]> {
    const results: EmailMessage[] = []

    for (const email of emails) {
      try {
        const message = await this.sendEmail(
          email.to,
          email.subject,
          email.body,
          email.from
        )
        results.push(message)
      } catch (error) {
        const failedMessage: EmailMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          to: email.to,
          from: email.from || 'noreply@hazardos.com',
          subject: email.subject,
          body: email.body,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
        results.push(failedMessage)
      }
    }

    return results
  }

  getTemplate(id: string): EmailTemplate | undefined {
    return this.templates.get(id)
  }

  getAllTemplates(): EmailTemplate[] {
    return Array.from(this.templates.values())
  }

  createTemplate(template: Omit<EmailTemplate, 'id'>): EmailTemplate {
    const id = template.name.toLowerCase().replace(/\s+/g, '-')
    const newTemplate: EmailTemplate = { ...template, id }
    this.templates.set(id, newTemplate)
    return newTemplate
  }

  updateTemplate(id: string, updates: Partial<Omit<EmailTemplate, 'id'>>): EmailTemplate {
    const template = this.templates.get(id)
    if (!template) {
      throw new Error(`Template '${id}' not found`)
    }

    const updatedTemplate = { ...template, ...updates }
    this.templates.set(id, updatedTemplate)
    return updatedTemplate
  }

  deleteTemplate(id: string): boolean {
    return this.templates.delete(id)
  }

  getMessage(id: string): EmailMessage | undefined {
    return this.messages.get(id)
  }

  getMessagesByStatus(status: EmailMessage['status']): EmailMessage[] {
    return Array.from(this.messages.values()).filter(msg => msg.status === status)
  }

  getMessagesByRecipient(to: string): EmailMessage[] {
    return Array.from(this.messages.values()).filter(msg => msg.to === to)
  }

  getStats(): {
    total: number
    sent: number
    failed: number
    pending: number
    successRate: number
  } {
    const messages = Array.from(this.messages.values())
    const total = messages.length
    const sent = messages.filter(m => m.status === 'sent').length
    const failed = messages.filter(m => m.status === 'failed').length
    const pending = messages.filter(m => m.status === 'pending').length

    return {
      total,
      sent,
      failed,
      pending,
      successRate: total > 0 ? sent / total : 0
    }
  }
}

describe('EmailService', () => {
  let emailService: EmailService

  beforeEach(() => {
    emailService = new EmailService()
    emailService.setFailureRate(0) // No failures by default
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const message = await emailService.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test Body'
      )

      expect(message.to).toBe('test@example.com')
      expect(message.subject).toBe('Test Subject')
      expect(message.body).toBe('Test Body')
      expect(message.status).toBe('sent')
      expect(message.sent_at).toBeDefined()
      expect(message.id).toMatch(/^msg-\d+-[a-z0-9]+$/)
    })

    it('should use default from address', async () => {
      const message = await emailService.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test Body'
      )

      expect(message.from).toBe('noreply@hazardos.com')
    })

    it('should use custom from address', async () => {
      const message = await emailService.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test Body',
        'custom@example.com'
      )

      expect(message.from).toBe('custom@example.com')
    })

    it('should handle failures', async () => {
      emailService.setFailureRate(1) // 100% failure rate

      const message = await emailService.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test Body'
      )

      expect(message.status).toBe('failed')
      expect(message.error).toBe('SMTP connection failed')
      expect(message.sent_at).toBeUndefined()
    })
  })

  describe('sendTemplateEmail', () => {
    it('should send welcome email with template', async () => {
      const message = await emailService.sendTemplateEmail(
        'welcome',
        'user@example.com',
        {
          company_name: 'HazardOS',
          user_name: 'John Doe'
        }
      )

      expect(message.subject).toBe('Welcome to HazardOS!')
      expect(message.body).toBe('Hello John Doe, welcome to our platform!')
      expect(message.status).toBe('sent')
    })

    it('should send invoice email with template', async () => {
      const message = await emailService.sendTemplateEmail(
        'invoice',
        'customer@example.com',
        {
          invoice_number: 'INV-001',
          amount: '$1,234.56'
        }
      )

      expect(message.subject).toBe('Invoice #INV-001 - $1,234.56')
      expect(message.body).toBe('Your invoice #INV-001 for $1,234.56 is ready.')
    })

    it('should throw error for missing template', async () => {
      await expect(
        emailService.sendTemplateEmail('nonexistent', 'test@example.com', {})
      ).rejects.toThrow("Template 'nonexistent' not found")
    })

    it('should throw error for missing variables', async () => {
      await expect(
        emailService.sendTemplateEmail('welcome', 'test@example.com', {
          company_name: 'HazardOS'
          // Missing user_name
        })
      ).rejects.toThrow('Missing template variables: user_name')
    })

    it('should handle multiple missing variables', async () => {
      await expect(
        emailService.sendTemplateEmail('welcome', 'test@example.com', {})
      ).rejects.toThrow('Missing template variables: company_name, user_name')
    })
  })

  describe('sendBulkEmails', () => {
    it('should send multiple emails', async () => {
      const emails = [
        { to: 'user1@example.com', subject: 'Subject 1', body: 'Body 1' },
        { to: 'user2@example.com', subject: 'Subject 2', body: 'Body 2' },
        { to: 'user3@example.com', subject: 'Subject 3', body: 'Body 3' }
      ]

      const results = await emailService.sendBulkEmails(emails)

      expect(results).toHaveLength(3)
      expect(results.every(r => r.status === 'sent')).toBe(true)
      expect(results[0].to).toBe('user1@example.com')
      expect(results[1].to).toBe('user2@example.com')
      expect(results[2].to).toBe('user3@example.com')
    })

    it('should handle partial failures', async () => {
      emailService.setFailureRate(0.5) // 50% failure rate

      const emails = Array.from({ length: 10 }, (_, i) => ({
        to: `user${i}@example.com`,
        subject: `Subject ${i}`,
        body: `Body ${i}`
      }))

      const results = await emailService.sendBulkEmails(emails)

      expect(results).toHaveLength(10)
      const sent = results.filter(r => r.status === 'sent')
      const failed = results.filter(r => r.status === 'failed')
      
      expect(sent.length + failed.length).toBe(10)
      // With 50% failure rate, we expect some of each (though random)
      expect(failed.length).toBeGreaterThan(0)
    })
  })

  describe('template management', () => {
    it('should get existing template', () => {
      const template = emailService.getTemplate('welcome')

      expect(template).toBeDefined()
      expect(template?.name).toBe('Welcome Email')
      expect(template?.variables).toContain('user_name')
    })

    it('should return undefined for non-existent template', () => {
      const template = emailService.getTemplate('nonexistent')
      expect(template).toBeUndefined()
    })

    it('should get all templates', () => {
      const templates = emailService.getAllTemplates()

      expect(templates).toHaveLength(2) // welcome and invoice
      expect(templates.map(t => t.id)).toContain('welcome')
      expect(templates.map(t => t.id)).toContain('invoice')
    })

    it('should create new template', () => {
      const template = emailService.createTemplate({
        name: 'Password Reset',
        subject: 'Reset your password',
        body: 'Click here to reset: {{reset_link}}',
        variables: ['reset_link']
      })

      expect(template.id).toBe('password-reset')
      expect(template.name).toBe('Password Reset')
      expect(emailService.getTemplate('password-reset')).toEqual(template)
    })

    it('should update existing template', () => {
      const updated = emailService.updateTemplate('welcome', {
        subject: 'Welcome aboard, {{user_name}}!'
      })

      expect(updated.subject).toBe('Welcome aboard, {{user_name}}!')
      expect(updated.body).toBe('Hello {{user_name}}, welcome to our platform!') // unchanged
    })

    it('should throw error when updating non-existent template', () => {
      expect(() => {
        emailService.updateTemplate('nonexistent', { subject: 'New Subject' })
      }).toThrow("Template 'nonexistent' not found")
    })

    it('should delete template', () => {
      const deleted = emailService.deleteTemplate('welcome')
      expect(deleted).toBe(true)
      expect(emailService.getTemplate('welcome')).toBeUndefined()
    })

    it('should return false when deleting non-existent template', () => {
      const deleted = emailService.deleteTemplate('nonexistent')
      expect(deleted).toBe(false)
    })
  })

  describe('message retrieval', () => {
    beforeEach(async () => {
      await emailService.sendEmail('user1@example.com', 'Subject 1', 'Body 1')
      await emailService.sendEmail('user2@example.com', 'Subject 2', 'Body 2')
      
      emailService.setFailureRate(1)
      await emailService.sendEmail('user3@example.com', 'Subject 3', 'Body 3')
    })

    it('should get message by id', async () => {
      const messages = Array.from(emailService['messages'].values())
      const firstMessage = messages[0]

      const retrieved = emailService.getMessage(firstMessage.id)
      expect(retrieved).toEqual(firstMessage)
    })

    it('should return undefined for non-existent message', () => {
      const message = emailService.getMessage('nonexistent')
      expect(message).toBeUndefined()
    })

    it('should get messages by status', () => {
      const sentMessages = emailService.getMessagesByStatus('sent')
      const failedMessages = emailService.getMessagesByStatus('failed')

      expect(sentMessages).toHaveLength(2)
      expect(failedMessages).toHaveLength(1)
      expect(sentMessages.every(m => m.status === 'sent')).toBe(true)
      expect(failedMessages.every(m => m.status === 'failed')).toBe(true)
    })

    it('should get messages by recipient', () => {
      const user1Messages = emailService.getMessagesByRecipient('user1@example.com')
      const user2Messages = emailService.getMessagesByRecipient('user2@example.com')

      expect(user1Messages).toHaveLength(1)
      expect(user2Messages).toHaveLength(1)
      expect(user1Messages[0].to).toBe('user1@example.com')
      expect(user2Messages[0].to).toBe('user2@example.com')
    })
  })

  describe('getStats', () => {
    it('should return correct stats', async () => {
      // Send some successful emails
      await emailService.sendEmail('user1@example.com', 'Subject 1', 'Body 1')
      await emailService.sendEmail('user2@example.com', 'Subject 2', 'Body 2')

      // Send some failed emails
      emailService.setFailureRate(1)
      await emailService.sendEmail('user3@example.com', 'Subject 3', 'Body 3')

      const stats = emailService.getStats()

      expect(stats.total).toBe(3)
      expect(stats.sent).toBe(2)
      expect(stats.failed).toBe(1)
      expect(stats.pending).toBe(0)
      expect(stats.successRate).toBeCloseTo(2/3, 2)
    })

    it('should handle empty stats', () => {
      const stats = emailService.getStats()

      expect(stats.total).toBe(0)
      expect(stats.sent).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.pending).toBe(0)
      expect(stats.successRate).toBe(0)
    })
  })

  describe('integration tests', () => {
    it('should handle complete email workflow', async () => {
      // Create custom template
      const template = emailService.createTemplate({
        name: 'Order Confirmation',
        subject: 'Order #{{order_id}} confirmed',
        body: 'Your order #{{order_id}} for {{total}} has been confirmed.',
        variables: ['order_id', 'total']
      })

      // Send template email
      const message = await emailService.sendTemplateEmail(
        template.id,
        'customer@example.com',
        {
          order_id: 'ORD-123',
          total: '$99.99'
        }
      )

      // Verify message
      expect(message.status).toBe('sent')
      expect(message.subject).toBe('Order #ORD-123 confirmed')

      // Check stats
      const stats = emailService.getStats()
      expect(stats.total).toBe(1)
      expect(stats.sent).toBe(1)
      expect(stats.successRate).toBe(1)
    })

    it('should handle bulk template emails', async () => {
      const orders = [
        { customer: 'customer1@example.com', order_id: 'ORD-001', total: '$50.00' },
        { customer: 'customer2@example.com', order_id: 'ORD-002', total: '$75.00' },
        { customer: 'customer3@example.com', order_id: 'ORD-003', total: '$100.00' }
      ]

      const emails = []
      for (const order of orders) {
        const message = await emailService.sendTemplateEmail(
          'invoice',
          order.customer,
          {
            invoice_number: order.order_id,
            amount: order.total
          }
        )
        emails.push(message)
      }

      expect(emails).toHaveLength(3)
      expect(emails.every(e => e.status === 'sent')).toBe(true)

      const stats = emailService.getStats()
      expect(stats.total).toBe(3)
      expect(stats.successRate).toBe(1)
    })
  })
})