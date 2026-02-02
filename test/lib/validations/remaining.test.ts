import { describe, it, expect } from 'vitest'

// integrations.ts
import {
  syncCustomerSchema,
  syncHubSpotContactsSchema,
  syncInvoiceSchema,
  syncContactsSchema,
} from '@/lib/validations/integrations'

// onboard.ts
import {
  organizationDataSchema,
  billingCycleSchema,
  completeOnboardSchema,
} from '@/lib/validations/onboard'

// pipeline.ts
import {
  createOpportunitySchema,
  updateOpportunitySchema as _updateOpportunitySchema,
  moveOpportunitySchema as _moveOpportunitySchema,
  stageTypeSchema,
  createStageSchema,
  updateStageSchema as _updateStageSchema,
  pipelineListQuerySchema as _pipelineListQuerySchema,
} from '@/lib/validations/pipeline'

// platform.ts
import {
  organizationFiltersSchema,
} from '@/lib/validations/platform'

// reports.ts
import {
  reportTypeSchema,
  dateRangeTypeSchema,
  chartTypeSchema,
  filterOperatorSchema as _filterOperatorSchema,
  columnFormatSchema as _columnFormatSchema,
  groupIntervalSchema as _groupIntervalSchema,
  dateRangeSchema as _dateRangeSchema,
  reportFilterSchema as _reportFilterSchema,
  reportColumnSchema as _reportColumnSchema,
  reportGroupingSchema as _reportGroupingSchema,
  reportConfigSchema as _reportConfigSchema,
  createReportSchema,
  updateReportSchema as _updateReportSchema,
  runReportSchema as _runReportSchema,
  exportFormatSchema,
  exportReportSchema as _exportReportSchema,
} from '@/lib/validations/reports'

// segments.ts
import {
  segmentTypeSchema,
  segmentRuleOperatorSchema,
  segmentRuleSchema as _segmentRuleSchema,
  createSegmentSchema,
  updateSegmentSchema as _updateSegmentSchema,
} from '@/lib/validations/segments'

// site-survey.ts
import {
  siteSurveySchema,
  defaultSiteSurveyValues,
} from '@/lib/validations/site-survey'

// sms.ts
import {
  smsMessageTypeSchema,
  smsStatusSchema,
  createSmsTemplateSchema,
  updateSmsTemplateSchema as _updateSmsTemplateSchema,
  smsMessagesQuerySchema as _smsMessagesQuerySchema,
  sendSmsSchema,
  updateSmsSettingsSchema,
} from '@/lib/validations/sms'

// webhooks.ts
import {
  webhookEventTypeSchema,
  createWebhookSchema,
  updateWebhookSchema,
} from '@/lib/validations/webhooks'

// ========== INTEGRATIONS ==========
describe('integrations validations', () => {
  describe('syncCustomerSchema', () => {
    it('accepts valid customer_id', () => {
      const result = syncCustomerSchema.safeParse({
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('requires customer_id', () => {
      const result = syncCustomerSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('syncHubSpotContactsSchema', () => {
    it('accepts optional customer_id', () => {
      const result = syncHubSpotContactsSchema.safeParse({
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('accepts empty object', () => {
      const result = syncHubSpotContactsSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('syncInvoiceSchema', () => {
    it('accepts valid invoice_id', () => {
      const result = syncInvoiceSchema.safeParse({
        invoice_id: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('requires invoice_id', () => {
      const result = syncInvoiceSchema.safeParse({})
      expect(result.success).toBe(false)
    })
  })

  describe('syncContactsSchema', () => {
    it('accepts valid options', () => {
      const result = syncContactsSchema.safeParse({
        list_id: 'list123',
        segment_id: '550e8400-e29b-41d4-a716-446655440000',
      })
      expect(result.success).toBe(true)
    })

    it('accepts empty object', () => {
      const result = syncContactsSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})

// ========== ONBOARD ==========
describe('onboard validations', () => {
  describe('organizationDataSchema', () => {
    it('accepts valid organization', () => {
      const result = organizationDataSchema.safeParse({
        name: 'Acme Corp',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
      })
      expect(result.success).toBe(true)
    })

    it('requires name', () => {
      const result = organizationDataSchema.safeParse({
        city: 'Springfield',
      })
      expect(result.success).toBe(false)
    })

    it('rejects empty name', () => {
      const result = organizationDataSchema.safeParse({
        name: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('billingCycleSchema', () => {
    it('accepts monthly', () => {
      expect(billingCycleSchema.safeParse('monthly').success).toBe(true)
    })

    it('accepts yearly', () => {
      expect(billingCycleSchema.safeParse('yearly').success).toBe(true)
    })

    it('rejects invalid', () => {
      expect(billingCycleSchema.safeParse('weekly').success).toBe(false)
    })
  })

  describe('completeOnboardSchema', () => {
    it('accepts valid onboard data', () => {
      const result = completeOnboardSchema.safeParse({
        organization: { name: 'Acme' },
        plan_id: '550e8400-e29b-41d4-a716-446655440000',
        billing_cycle: 'monthly',
      })
      expect(result.success).toBe(true)
    })

    it('defaults start_trial to true', () => {
      const result = completeOnboardSchema.safeParse({
        organization: { name: 'Acme' },
        plan_id: '550e8400-e29b-41d4-a716-446655440000',
        billing_cycle: 'monthly',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.start_trial).toBe(true)
      }
    })
  })
})

// ========== PIPELINE ==========
describe('pipeline validations', () => {
  describe('createOpportunitySchema', () => {
    const validOpportunity = {
      customer_id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'New Project',
      stage_id: '550e8400-e29b-41d4-a716-446655440001',
    }

    it('accepts valid opportunity', () => {
      const result = createOpportunitySchema.safeParse(validOpportunity)
      expect(result.success).toBe(true)
    })

    it('requires customer_id', () => {
      const result = createOpportunitySchema.safeParse({
        name: 'Project',
        stage_id: '550e8400-e29b-41d4-a716-446655440001',
      })
      expect(result.success).toBe(false)
    })

    it('requires name', () => {
      const result = createOpportunitySchema.safeParse({
        customer_id: '550e8400-e29b-41d4-a716-446655440000',
        stage_id: '550e8400-e29b-41d4-a716-446655440001',
      })
      expect(result.success).toBe(false)
    })

    it('validates probability range', () => {
      const valid = createOpportunitySchema.safeParse({
        ...validOpportunity,
        probability: 50,
      })
      expect(valid.success).toBe(true)

      const invalid = createOpportunitySchema.safeParse({
        ...validOpportunity,
        probability: 150,
      })
      expect(invalid.success).toBe(false)
    })
  })

  describe('stageTypeSchema', () => {
    it('accepts valid stage types', () => {
      const types = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']
      for (const type of types) {
        expect(stageTypeSchema.safeParse(type).success).toBe(true)
      }
    })
  })

  describe('createStageSchema', () => {
    it('accepts valid stage', () => {
      const result = createStageSchema.safeParse({
        name: 'New Stage',
        stage_type: 'lead',
      })
      expect(result.success).toBe(true)
    })

    it('requires name', () => {
      const result = createStageSchema.safeParse({
        stage_type: 'lead',
      })
      expect(result.success).toBe(false)
    })
  })
})

// ========== PLATFORM ==========
describe('platform validations', () => {
  describe('organizationFiltersSchema', () => {
    it('accepts valid filters', () => {
      const result = organizationFiltersSchema.safeParse({
        search: 'acme',
        status: 'active',
        sortBy: 'name',
        sortOrder: 'asc',
        page: '1',
        limit: '10',
      })
      expect(result.success).toBe(true)
    })

    it('accepts empty filters', () => {
      const result = organizationFiltersSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('validates sortBy', () => {
      const valid = organizationFiltersSchema.safeParse({
        sortBy: 'created_at',
      })
      expect(valid.success).toBe(true)

      const invalid = organizationFiltersSchema.safeParse({
        sortBy: 'invalid',
      })
      expect(invalid.success).toBe(false)
    })
  })
})

// ========== REPORTS ==========
describe('reports validations', () => {
  describe('reportTypeSchema', () => {
    it('accepts valid types', () => {
      const types = ['sales', 'jobs', 'leads', 'revenue', 'custom']
      for (const type of types) {
        expect(reportTypeSchema.safeParse(type).success).toBe(true)
      }
    })
  })

  describe('dateRangeTypeSchema', () => {
    it('accepts valid types', () => {
      const types = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'this_quarter', 'this_year', 'custom']
      for (const type of types) {
        expect(dateRangeTypeSchema.safeParse(type).success).toBe(true)
      }
    })
  })

  describe('chartTypeSchema', () => {
    it('accepts valid types', () => {
      const types = ['bar', 'line', 'pie', 'area', 'none']
      for (const type of types) {
        expect(chartTypeSchema.safeParse(type).success).toBe(true)
      }
    })
  })

  describe('createReportSchema', () => {
    const validConfig = {
      date_range: { type: 'last_30_days' },
      filters: [],
      metrics: ['total_revenue'],
      columns: [{ field: 'date', label: 'Date', visible: true }],
      chart_type: 'bar',
    }

    it('accepts valid report', () => {
      const result = createReportSchema.safeParse({
        name: 'Sales Report',
        report_type: 'sales',
        config: validConfig,
      })
      expect(result.success).toBe(true)
    })

    it('requires name', () => {
      const result = createReportSchema.safeParse({
        report_type: 'sales',
        config: validConfig,
      })
      expect(result.success).toBe(false)
    })

    it('defaults is_shared to false', () => {
      const result = createReportSchema.safeParse({
        name: 'Report',
        report_type: 'sales',
        config: validConfig,
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_shared).toBe(false)
      }
    })
  })

  describe('exportFormatSchema', () => {
    it('accepts valid formats', () => {
      const formats = ['xlsx', 'csv', 'pdf']
      for (const format of formats) {
        expect(exportFormatSchema.safeParse(format).success).toBe(true)
      }
    })
  })
})

// ========== SEGMENTS ==========
describe('segments validations', () => {
  describe('segmentTypeSchema', () => {
    it('accepts dynamic', () => {
      expect(segmentTypeSchema.safeParse('dynamic').success).toBe(true)
    })

    it('accepts static', () => {
      expect(segmentTypeSchema.safeParse('static').success).toBe(true)
    })
  })

  describe('segmentRuleOperatorSchema', () => {
    it('accepts valid operators', () => {
      const operators = ['=', '!=', '>', '<', '>=', '<=', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_null', 'is_not_null']
      for (const op of operators) {
        expect(segmentRuleOperatorSchema.safeParse(op).success).toBe(true)
      }
    })
  })

  describe('createSegmentSchema', () => {
    it('accepts valid segment', () => {
      const result = createSegmentSchema.safeParse({
        name: 'High Value Customers',
      })
      expect(result.success).toBe(true)
    })

    it('requires name', () => {
      const result = createSegmentSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('defaults segment_type to dynamic', () => {
      const result = createSegmentSchema.safeParse({
        name: 'Segment',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.segment_type).toBe('dynamic')
      }
    })

    it('accepts rules', () => {
      const result = createSegmentSchema.safeParse({
        name: 'Segment',
        rules: [{ field: 'status', operator: '=', value: 'active' }],
      })
      expect(result.success).toBe(true)
    })
  })
})

// ========== SITE SURVEY ==========
describe('site-survey validations', () => {
  describe('siteSurveySchema', () => {
    const validSurvey = {
      job_name: 'Test Job',
      customer_name: 'John Doe',
      site_address: '123 Main St',
      site_city: 'Springfield',
      site_state: 'IL',
      site_zip: '62701',
      hazard_type: 'asbestos',
    }

    it('accepts valid survey', () => {
      const result = siteSurveySchema.safeParse(validSurvey)
      expect(result.success).toBe(true)
    })

    it('requires job_name', () => {
      const { job_name: _job_name, ...rest } = validSurvey
      const result = siteSurveySchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('requires customer_name', () => {
      const { customer_name: _customer_name, ...rest } = validSurvey
      const result = siteSurveySchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it('validates hazard_type', () => {
      const types = ['asbestos', 'mold', 'lead', 'vermiculite', 'other'] as const
      for (const type of types) {
        const result = siteSurveySchema.safeParse({
          ...validSurvey,
          hazard_type: type,
        })
        expect(result.success).toBe(true)
      }
    })

    it('validates containment_level range (1-4)', () => {
      const valid = siteSurveySchema.safeParse({
        ...validSurvey,
        containment_level: 3,
      })
      expect(valid.success).toBe(true)

      const tooLow = siteSurveySchema.safeParse({
        ...validSurvey,
        containment_level: 0,
      })
      expect(tooLow.success).toBe(false)

      const tooHigh = siteSurveySchema.safeParse({
        ...validSurvey,
        containment_level: 5,
      })
      expect(tooHigh.success).toBe(false)
    })

    it('validates state length (2 chars)', () => {
      const valid = siteSurveySchema.safeParse({
        ...validSurvey,
        site_state: 'IL',
      })
      expect(valid.success).toBe(true)

      const tooShort = siteSurveySchema.safeParse({
        ...validSurvey,
        site_state: 'I',
      })
      expect(tooShort.success).toBe(false)

      const tooLong = siteSurveySchema.safeParse({
        ...validSurvey,
        site_state: 'Illinois',
      })
      expect(tooLong.success).toBe(false)
    })
  })

  describe('defaultSiteSurveyValues', () => {
    it('has expected defaults', () => {
      expect(defaultSiteSurveyValues.hazard_type).toBe('asbestos')
      expect(defaultSiteSurveyValues.containment_level).toBe(1)
      expect(defaultSiteSurveyValues.occupied).toBe(false)
      expect(defaultSiteSurveyValues.clearance_required).toBe(false)
    })
  })
})

// ========== SMS ==========
describe('sms validations', () => {
  describe('smsMessageTypeSchema', () => {
    it('accepts valid types', () => {
      const types = ['appointment_reminder', 'job_status', 'lead_notification', 'payment_reminder', 'estimate_follow_up', 'invoice', 'general']
      for (const type of types) {
        expect(smsMessageTypeSchema.safeParse(type).success).toBe(true)
      }
    })
  })

  describe('smsStatusSchema', () => {
    it('accepts valid statuses', () => {
      const statuses = ['queued', 'sending', 'sent', 'delivered', 'failed', 'undelivered']
      for (const status of statuses) {
        expect(smsStatusSchema.safeParse(status).success).toBe(true)
      }
    })
  })

  describe('createSmsTemplateSchema', () => {
    it('accepts valid template', () => {
      const result = createSmsTemplateSchema.safeParse({
        name: 'Appointment Reminder',
        message_type: 'appointment_reminder',
        body: 'Your appointment is tomorrow at {time}',
      })
      expect(result.success).toBe(true)
    })

    it('requires name', () => {
      const result = createSmsTemplateSchema.safeParse({
        message_type: 'general',
        body: 'Test',
      })
      expect(result.success).toBe(false)
    })

    it('validates body max length (1600)', () => {
      const result = createSmsTemplateSchema.safeParse({
        name: 'Template',
        message_type: 'general',
        body: 'a'.repeat(1601),
      })
      expect(result.success).toBe(false)
    })
  })

  describe('sendSmsSchema', () => {
    it('accepts valid SMS', () => {
      const result = sendSmsSchema.safeParse({
        to: '5551234567',
        body: 'Test message',
        message_type: 'general',
      })
      expect(result.success).toBe(true)
    })

    it('requires valid phone number length', () => {
      const result = sendSmsSchema.safeParse({
        to: '123',
        body: 'Test',
        message_type: 'general',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateSmsSettingsSchema', () => {
    it('accepts valid settings', () => {
      const result = updateSmsSettingsSchema.safeParse({
        sms_enabled: true,
        appointment_reminders_enabled: true,
        appointment_reminder_hours: 24,
        quiet_hours_enabled: true,
        quiet_hours_start: '21:00',
        quiet_hours_end: '08:00',
      })
      expect(result.success).toBe(true)
    })

    it('validates quiet hours format', () => {
      const result = updateSmsSettingsSchema.safeParse({
        quiet_hours_start: '9 PM',
      })
      expect(result.success).toBe(false)
    })

    it('validates appointment_reminder_hours range (1-168)', () => {
      const valid = updateSmsSettingsSchema.safeParse({
        appointment_reminder_hours: 48,
      })
      expect(valid.success).toBe(true)

      const tooLow = updateSmsSettingsSchema.safeParse({
        appointment_reminder_hours: 0,
      })
      expect(tooLow.success).toBe(false)

      const tooHigh = updateSmsSettingsSchema.safeParse({
        appointment_reminder_hours: 200,
      })
      expect(tooHigh.success).toBe(false)
    })
  })
})

// ========== WEBHOOKS ==========
describe('webhooks validations', () => {
  describe('webhookEventTypeSchema', () => {
    it('accepts valid event types', () => {
      const types = [
        'customer.created', 'customer.updated',
        'job.created', 'job.updated', 'job.completed',
        'invoice.created', 'invoice.paid',
        'proposal.created', 'proposal.signed',
        'estimate.approved',
      ]
      for (const type of types) {
        expect(webhookEventTypeSchema.safeParse(type).success).toBe(true)
      }
    })
  })

  describe('createWebhookSchema', () => {
    it('accepts valid webhook', () => {
      const result = createWebhookSchema.safeParse({
        name: 'Job Notifications',
        url: 'https://example.com/webhook',
        events: ['job.created', 'job.completed'],
      })
      expect(result.success).toBe(true)
    })

    it('requires name', () => {
      const result = createWebhookSchema.safeParse({
        url: 'https://example.com/webhook',
        events: ['job.created'],
      })
      expect(result.success).toBe(false)
    })

    it('requires valid URL', () => {
      const result = createWebhookSchema.safeParse({
        name: 'Test',
        url: 'not-a-url',
        events: ['job.created'],
      })
      expect(result.success).toBe(false)
    })

    it('requires at least one event', () => {
      const result = createWebhookSchema.safeParse({
        name: 'Test',
        url: 'https://example.com/webhook',
        events: [],
      })
      expect(result.success).toBe(false)
    })

    it('accepts optional secret', () => {
      const result = createWebhookSchema.safeParse({
        name: 'Test',
        url: 'https://example.com/webhook',
        events: ['job.created'],
        secret: 'my-secret',
      })
      expect(result.success).toBe(true)
    })

    it('accepts optional headers', () => {
      const result = createWebhookSchema.safeParse({
        name: 'Test',
        url: 'https://example.com/webhook',
        events: ['job.created'],
        headers: { 'X-Custom-Header': 'value' },
      })
      expect(result.success).toBe(true)
    })
  })

  describe('updateWebhookSchema', () => {
    it('accepts partial update', () => {
      const result = updateWebhookSchema.safeParse({
        name: 'Updated Name',
      })
      expect(result.success).toBe(true)
    })

    it('accepts empty object', () => {
      const result = updateWebhookSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('accepts is_active', () => {
      const result = updateWebhookSchema.safeParse({
        is_active: false,
      })
      expect(result.success).toBe(true)
    })
  })
})
