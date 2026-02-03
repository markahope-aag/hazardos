import { describe, it, expect } from 'vitest'
import { 
  smsMessageTypeSchema,
  smsStatusSchema,
  createSmsTemplateSchema,
  updateSmsTemplateSchema,
  smsMessagesQuerySchema,
  sendSmsSchema,
  updateSmsSettingsSchema
} from '@/lib/validations/sms'

describe('sms validations', () => {
  describe('smsMessageTypeSchema', () => {
    const validMessageTypes = [
      'appointment_reminder',
      'job_status',
      'lead_notification',
      'payment_reminder',
      'estimate_follow_up',
      'invoice',
      'general'
    ]

    it('should validate all valid message types', () => {
      for (const messageType of validMessageTypes) {
        const result = smsMessageTypeSchema.safeParse(messageType)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(messageType)
        }
      }
    })

    it('should reject invalid message type', () => {
      const result = smsMessageTypeSchema.safeParse('invalid_type')
      expect(result.success).toBe(false)
    })
  })

  describe('smsStatusSchema', () => {
    const validStatuses = [
      'queued',
      'sending',
      'sent',
      'delivered',
      'failed',
      'undelivered'
    ]

    it('should validate all valid statuses', () => {
      for (const status of validStatuses) {
        const result = smsStatusSchema.safeParse(status)
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data).toBe(status)
        }
      }
    })

    it('should reject invalid status', () => {
      const result = smsStatusSchema.safeParse('invalid_status')
      expect(result.success).toBe(false)
    })
  })

  describe('createSmsTemplateSchema', () => {
    it('should validate complete template creation', () => {
      const validData = {
        name: 'Appointment Reminder',
        message_type: 'appointment_reminder',
        body: 'Hi {{customer_name}}, your appointment is scheduled for {{date}} at {{time}}.'
      }
      
      const result = createSmsTemplateSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Appointment Reminder')
        expect(result.data.message_type).toBe('appointment_reminder')
        expect(result.data.body).toContain('{{customer_name}}')
      }
    })

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        message_type: 'general',
        body: 'Test message'
      }
      
      const result = createSmsTemplateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject name too long', () => {
      const invalidData = {
        name: 'a'.repeat(101),
        message_type: 'general',
        body: 'Test message'
      }
      
      const result = createSmsTemplateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty body', () => {
      const invalidData = {
        name: 'Test Template',
        message_type: 'general',
        body: ''
      }
      
      const result = createSmsTemplateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject body too long', () => {
      const invalidData = {
        name: 'Test Template',
        message_type: 'general',
        body: 'a'.repeat(1601)
      }
      
      const result = createSmsTemplateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid message type', () => {
      const invalidData = {
        name: 'Test Template',
        message_type: 'invalid_type',
        body: 'Test message'
      }
      
      const result = createSmsTemplateSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('updateSmsTemplateSchema', () => {
    it('should validate partial update', () => {
      const validData = {
        name: 'Updated Template Name'
      }
      
      const result = updateSmsTemplateSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Updated Template Name')
      }
    })

    it('should validate complete update', () => {
      const validData = {
        name: 'Updated Template',
        message_type: 'job_status',
        body: 'Your job status has been updated to {{status}}.',
        is_active: false
      }
      
      const result = updateSmsTemplateSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Updated Template')
        expect(result.data.message_type).toBe('job_status')
        expect(result.data.is_active).toBe(false)
      }
    })

    it('should validate empty update object', () => {
      const validData = {}
      
      const result = updateSmsTemplateSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('smsMessagesQuerySchema', () => {
    it('should validate with customer_id', () => {
      const validData = {
        customer_id: '123e4567-e89b-12d3-a456-426614174000'
      }
      
      const result = smsMessagesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.customer_id).toBe(validData.customer_id)
      }
    })

    it('should validate with status filter', () => {
      const validData = {
        status: 'sent'
      }
      
      const result = smsMessagesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('sent')
      }
    })

    it('should transform string limit to number', () => {
      const validData = {
        limit: '50'
      }
      
      const result = smsMessagesQuerySchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(typeof result.data.limit).toBe('number')
      }
    })

    it('should pass through unknown fields', () => {
      const dataWithExtra = {
        status: 'sent',
        unknownField: 'should pass through'
      }
      
      const result = smsMessagesQuerySchema.safeParse(dataWithExtra)
      expect(result.success).toBe(true)
      if (result.success) {
        expect((result.data as any).unknownField).toBe('should pass through')
      }
    })
  })

  describe('sendSmsSchema', () => {
    it('should validate complete SMS send request', () => {
      const validData = {
        to: '+1234567890',
        body: 'Hello, this is a test message.',
        message_type: 'general',
        customer_id: '123e4567-e89b-12d3-a456-426614174000',
        related_entity_type: 'job',
        related_entity_id: '456e7890-e12b-34c5-d678-901234567890'
      }
      
      const result = sendSmsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.to).toBe('+1234567890')
        expect(result.data.body).toBe('Hello, this is a test message.')
        expect(result.data.message_type).toBe('general')
      }
    })

    it('should validate minimal SMS send request', () => {
      const validData = {
        to: '5551234567',
        body: 'Test message',
        message_type: 'general'
      }
      
      const result = sendSmsSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject phone number too short', () => {
      const invalidData = {
        to: '123456789', // 9 digits, minimum is 10
        body: 'Test message',
        message_type: 'general'
      }
      
      const result = sendSmsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject phone number too long', () => {
      const invalidData = {
        to: '123456789012345678901', // 21 digits, maximum is 20
        body: 'Test message',
        message_type: 'general'
      }
      
      const result = sendSmsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty body', () => {
      const invalidData = {
        to: '5551234567',
        body: '',
        message_type: 'general'
      }
      
      const result = sendSmsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('updateSmsSettingsSchema', () => {
    it('should validate complete settings update', () => {
      const validData = {
        sms_enabled: true,
        appointment_reminders_enabled: true,
        appointment_reminder_hours: 24,
        job_status_updates_enabled: false,
        quiet_hours_enabled: true,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        timezone: 'America/New_York',
        use_platform_twilio: false,
        twilio_account_sid: 'AC1234567890',
        twilio_auth_token: 'auth_token_123',
        twilio_phone_number: '+15551234567'
      }
      
      const result = updateSmsSettingsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sms_enabled).toBe(true)
        expect(result.data.appointment_reminder_hours).toBe(24)
        expect(result.data.quiet_hours_start).toBe('22:00')
      }
    })

    it('should validate partial settings update', () => {
      const validData = {
        sms_enabled: false
      }
      
      const result = updateSmsSettingsSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sms_enabled).toBe(false)
      }
    })

    it('should reject invalid time format', () => {
      const invalidData = {
        quiet_hours_start: '25:00' // Invalid hour
      }
      
      const result = updateSmsSettingsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject appointment reminder hours out of range', () => {
      const invalidData = {
        appointment_reminder_hours: 200 // Max is 168 (7 days)
      }
      
      const result = updateSmsSettingsSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should validate time format correctly', () => {
      const validTimes = ['00:00', '12:30', '23:59']
      
      for (const time of validTimes) {
        const result = updateSmsSettingsSchema.safeParse({
          quiet_hours_start: time
        })
        expect(result.success).toBe(true)
      }
    })
  })
})