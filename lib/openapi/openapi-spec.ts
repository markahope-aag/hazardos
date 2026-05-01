/**
 * OpenAPI 3.0 Specification for HazardOS API
 * Auto-generated documentation for all API endpoints
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'HazardOS API',
    description: `
## Overview
HazardOS is the Operating System for Environmental Remediation Companies. This API provides access to manage customers, jobs, estimates, invoices, proposals, and more.

## Authentication
Most endpoints require authentication via Bearer token (JWT) from Supabase Auth.

The v1 API endpoints use API Key authentication via the \`X-API-Key\` header.

## Rate Limiting
API requests are rate-limited. The following rate limit types apply:
- **general**: Standard endpoints (100 requests/minute)
- **sensitive**: Auth-related endpoints (10 requests/minute)
- **bulk**: Bulk operations (20 requests/minute)

## Error Responses
All errors follow a consistent format:
\`\`\`json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
\`\`\`
`,
    version: '1.0.0',
    contact: {
      name: 'HazardOS Support',
      email: 'support@hazardos.com',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Current environment',
    },
  ],
  tags: [
    { name: 'Customers', description: 'Customer management endpoints' },
    { name: 'Jobs', description: 'Job scheduling and management' },
    { name: 'Estimates', description: 'Estimate creation and management' },
    { name: 'Invoices', description: 'Invoice and billing management' },
    { name: 'Proposals', description: 'Proposal generation and tracking' },
    { name: 'Pipeline', description: 'Sales pipeline and opportunity management' },
    { name: 'Commissions', description: 'Sales commission tracking' },
    { name: 'Approvals', description: 'Workflow approvals' },
    { name: 'Reports', description: 'Reporting and analytics' },
    { name: 'Feedback', description: 'Customer feedback and testimonials' },
    { name: 'AI', description: 'AI-powered features' },
    { name: 'Billing', description: 'Subscription and billing management' },
    { name: 'Settings', description: 'Organization settings and configuration' },
    { name: 'Integrations', description: 'Third-party integrations' },
    { name: 'Webhooks', description: 'Webhook management' },
    { name: 'Platform', description: 'Platform administration (super-admin)' },
    { name: 'v1 API', description: 'External API with API key authentication' },
    { name: 'SMS', description: 'SMS messaging and communication' },
    { name: 'Notifications', description: 'User notifications and preferences' },
    { name: 'Segments', description: 'Customer segmentation and targeting' },
    { name: 'Team', description: 'Team member management and invitations' },
    { name: 'Portal', description: 'Customer portal and public access' },
    { name: 'Onboarding', description: 'Organization onboarding process' },
    { name: 'Cron', description: 'Scheduled tasks and background jobs' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Supabase JWT token from authentication',
      },
      apiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for v1 endpoints',
      },
    },
    schemas: {
      // Error schemas
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid input' },
              field: { type: 'string', example: 'email' },
            },
            required: ['code', 'message'],
          },
        },
      },

      // Pagination
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 100 },
          limit: { type: 'integer', example: 50 },
          offset: { type: 'integer', example: 0 },
          has_more: { type: 'boolean', example: true },
        },
      },

      // Customer schemas
      CustomerStatus: {
        type: 'string',
        enum: ['inquiry', 'prospect', 'customer', 'inactive'],
        description: 'Customer lifecycle status',
      },
      CustomerSource: {
        type: 'string',
        enum: ['phone', 'website', 'mail', 'referral', 'other'],
      },
      CommunicationPreferences: {
        type: 'object',
        properties: {
          email: { type: 'boolean', default: true },
          sms: { type: 'boolean', default: false },
          mail: { type: 'boolean', default: false },
        },
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organization_id: { type: 'string', format: 'uuid' },
          name: { type: 'string', maxLength: 255 },
          company_name: { type: 'string', maxLength: 255, nullable: true },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { type: 'string', maxLength: 20, nullable: true },
          address_line1: { type: 'string', maxLength: 255, nullable: true },
          address_line2: { type: 'string', maxLength: 255, nullable: true },
          city: { type: 'string', maxLength: 100, nullable: true },
          state: { type: 'string', maxLength: 50, nullable: true },
          zip: { type: 'string', maxLength: 20, nullable: true },
          status: { $ref: '#/components/schemas/CustomerStatus' },
          source: { $ref: '#/components/schemas/CustomerSource' },
          communication_preferences: { $ref: '#/components/schemas/CommunicationPreferences' },
          marketing_consent: { type: 'boolean', default: false },
          notes: { type: 'string', maxLength: 5000, nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateCustomer: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          company_name: { type: 'string', maxLength: 255 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 20 },
          address_line1: { type: 'string', maxLength: 255 },
          address_line2: { type: 'string', maxLength: 255 },
          city: { type: 'string', maxLength: 100 },
          state: { type: 'string', maxLength: 50 },
          zip: { type: 'string', maxLength: 20 },
          status: { $ref: '#/components/schemas/CustomerStatus' },
          source: { $ref: '#/components/schemas/CustomerSource' },
          communication_preferences: { $ref: '#/components/schemas/CommunicationPreferences' },
          marketing_consent: { type: 'boolean' },
          notes: { type: 'string', maxLength: 5000 },
        },
      },
      UpdateCustomer: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          company_name: { type: 'string', maxLength: 255 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 20 },
          address_line1: { type: 'string', maxLength: 255 },
          address_line2: { type: 'string', maxLength: 255 },
          city: { type: 'string', maxLength: 100 },
          state: { type: 'string', maxLength: 50 },
          zip: { type: 'string', maxLength: 20 },
          status: { $ref: '#/components/schemas/CustomerStatus' },
          source: { $ref: '#/components/schemas/CustomerSource' },
          communication_preferences: { $ref: '#/components/schemas/CommunicationPreferences' },
          marketing_consent: { type: 'boolean' },
          notes: { type: 'string', maxLength: 5000 },
        },
      },

      // Contact schemas
      ContactRole: {
        type: 'string',
        enum: ['primary', 'billing', 'site', 'scheduling', 'general'],
      },
      Contact: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          customer_id: { type: 'string', format: 'uuid' },
          name: { type: 'string', maxLength: 255 },
          title: { type: 'string', maxLength: 100, nullable: true },
          email: { type: 'string', format: 'email', nullable: true },
          phone: { type: 'string', maxLength: 20, nullable: true },
          mobile: { type: 'string', maxLength: 20, nullable: true },
          role: { $ref: '#/components/schemas/ContactRole' },
          is_primary: { type: 'boolean' },
          preferred_contact_method: { type: 'string', enum: ['email', 'phone', 'mobile'] },
          notes: { type: 'string', maxLength: 2000, nullable: true },
        },
      },
      CreateContact: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          title: { type: 'string', maxLength: 100 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string', maxLength: 20 },
          mobile: { type: 'string', maxLength: 20 },
          role: { $ref: '#/components/schemas/ContactRole' },
          is_primary: { type: 'boolean', default: false },
          preferred_contact_method: { type: 'string', enum: ['email', 'phone', 'mobile'] },
          notes: { type: 'string', maxLength: 2000 },
        },
      },

      // Job schemas
      JobStatus: {
        type: 'string',
        enum: ['scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'closed', 'cancelled'],
      },
      Job: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organization_id: { type: 'string', format: 'uuid' },
          customer_id: { type: 'string', format: 'uuid' },
          proposal_id: { type: 'string', format: 'uuid', nullable: true },
          name: { type: 'string', maxLength: 255 },
          status: { $ref: '#/components/schemas/JobStatus' },
          scheduled_start_date: { type: 'string', format: 'date' },
          scheduled_start_time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          scheduled_end_date: { type: 'string', format: 'date', nullable: true },
          estimated_duration_hours: { type: 'number', nullable: true },
          job_address: { type: 'string', maxLength: 255 },
          job_city: { type: 'string', maxLength: 100, nullable: true },
          job_state: { type: 'string', maxLength: 50, nullable: true },
          job_zip: { type: 'string', maxLength: 10, nullable: true },
          access_notes: { type: 'string', maxLength: 1000, nullable: true },
          special_instructions: { type: 'string', maxLength: 2000, nullable: true },
          hazard_types: { type: 'array', items: { type: 'string' } },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateJob: {
        type: 'object',
        required: ['customer_id', 'scheduled_start_date', 'job_address'],
        properties: {
          customer_id: { type: 'string', format: 'uuid' },
          proposal_id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 255 },
          scheduled_start_date: { type: 'string', format: 'date', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          scheduled_start_time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          scheduled_end_date: { type: 'string', format: 'date' },
          estimated_duration_hours: { type: 'number', minimum: 0 },
          job_address: { type: 'string', minLength: 1, maxLength: 255 },
          job_city: { type: 'string', maxLength: 100 },
          job_state: { type: 'string', maxLength: 50 },
          job_zip: { type: 'string', maxLength: 10 },
          access_notes: { type: 'string', maxLength: 1000 },
          special_instructions: { type: 'string', maxLength: 2000 },
          hazard_types: { type: 'array', items: { type: 'string' } },
        },
      },
      UpdateJob: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          scheduled_start_date: { type: 'string', format: 'date' },
          scheduled_start_time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
          scheduled_end_date: { type: 'string', format: 'date' },
          estimated_duration_hours: { type: 'number', minimum: 0 },
          job_address: { type: 'string', maxLength: 255 },
          job_city: { type: 'string', maxLength: 100 },
          job_state: { type: 'string', maxLength: 50 },
          job_zip: { type: 'string', maxLength: 10 },
          access_notes: { type: 'string', maxLength: 1000 },
          special_instructions: { type: 'string', maxLength: 2000 },
          hazard_types: { type: 'array', items: { type: 'string' } },
          status: { $ref: '#/components/schemas/JobStatus' },
        },
      },

      // Estimate schemas
      EstimateStatus: {
        type: 'string',
        enum: ['draft', 'pending_approval', 'approved', 'sent', 'accepted', 'rejected', 'expired'],
      },
      LineItemType: {
        type: 'string',
        enum: ['labor', 'material', 'equipment', 'disposal', 'travel', 'other'],
      },
      Estimate: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organization_id: { type: 'string', format: 'uuid' },
          site_survey_id: { type: 'string', format: 'uuid', nullable: true },
          customer_id: { type: 'string', format: 'uuid' },
          estimate_number: { type: 'string' },
          status: { $ref: '#/components/schemas/EstimateStatus' },
          project_name: { type: 'string', maxLength: 255 },
          scope_of_work: { type: 'string', maxLength: 5000, nullable: true },
          estimated_duration_days: { type: 'integer', nullable: true },
          estimated_start_date: { type: 'string', format: 'date', nullable: true },
          estimated_end_date: { type: 'string', format: 'date', nullable: true },
          subtotal: { type: 'number' },
          markup_percent: { type: 'number' },
          markup_amount: { type: 'number' },
          discount_percent: { type: 'number' },
          discount_amount: { type: 'number' },
          tax_percent: { type: 'number' },
          tax_amount: { type: 'number' },
          total: { type: 'number' },
          notes: { type: 'string', maxLength: 2000, nullable: true },
          internal_notes: { type: 'string', maxLength: 2000, nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateEstimateFromSurvey: {
        type: 'object',
        required: ['site_survey_id'],
        properties: {
          site_survey_id: { type: 'string', format: 'uuid' },
          customer_id: { type: 'string', format: 'uuid' },
          project_name: { type: 'string', maxLength: 255 },
          project_description: { type: 'string', maxLength: 5000 },
          scope_of_work: { type: 'string', maxLength: 10000 },
          estimated_duration_days: { type: 'integer', minimum: 1 },
          estimated_start_date: { type: 'string', format: 'date' },
          estimated_end_date: { type: 'string', format: 'date' },
          valid_until: { type: 'string', format: 'date' },
          markup_percent: { type: 'number', minimum: 0, maximum: 100 },
          internal_notes: { type: 'string', maxLength: 5000 },
        },
      },
      EstimateLineItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          estimate_id: { type: 'string', format: 'uuid' },
          item_type: { $ref: '#/components/schemas/LineItemType' },
          category: { type: 'string', maxLength: 100, nullable: true },
          description: { type: 'string', maxLength: 500 },
          quantity: { type: 'number' },
          unit: { type: 'string', maxLength: 20, nullable: true },
          unit_price: { type: 'number' },
          total_price: { type: 'number' },
          is_optional: { type: 'boolean' },
          is_included: { type: 'boolean' },
          sort_order: { type: 'integer' },
        },
      },
      AddLineItem: {
        type: 'object',
        required: ['item_type', 'description', 'quantity', 'unit_price'],
        properties: {
          item_type: { $ref: '#/components/schemas/LineItemType' },
          category: { type: 'string', maxLength: 100 },
          description: { type: 'string', minLength: 1, maxLength: 500 },
          quantity: { type: 'number', minimum: 0 },
          unit: { type: 'string', maxLength: 20 },
          unit_price: { type: 'number', minimum: 0 },
          is_optional: { type: 'boolean', default: false },
          is_included: { type: 'boolean', default: true },
          sort_order: { type: 'integer' },
        },
      },

      // Invoice schemas
      InvoiceStatus: {
        type: 'string',
        enum: ['draft', 'sent', 'viewed', 'paid', 'partial', 'overdue', 'void'],
      },
      PaymentMethod: {
        type: 'string',
        enum: ['check', 'credit_card', 'ach', 'cash', 'other'],
      },
      Invoice: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organization_id: { type: 'string', format: 'uuid' },
          customer_id: { type: 'string', format: 'uuid' },
          job_id: { type: 'string', format: 'uuid', nullable: true },
          invoice_number: { type: 'string' },
          status: { $ref: '#/components/schemas/InvoiceStatus' },
          due_date: { type: 'string', format: 'date' },
          subtotal: { type: 'number' },
          tax_percent: { type: 'number' },
          tax_amount: { type: 'number' },
          total: { type: 'number' },
          amount_paid: { type: 'number' },
          balance_due: { type: 'number' },
          notes: { type: 'string', maxLength: 2000, nullable: true },
          payment_terms: { type: 'string', maxLength: 500, nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateInvoice: {
        type: 'object',
        required: ['customer_id', 'due_date'],
        properties: {
          customer_id: { type: 'string', format: 'uuid' },
          job_id: { type: 'string', format: 'uuid' },
          due_date: { type: 'string', format: 'date' },
          notes: { type: 'string', maxLength: 2000 },
          payment_terms: { type: 'string', maxLength: 500 },
          tax_percent: { type: 'number', minimum: 0, maximum: 100 },
        },
      },
      AddPayment: {
        type: 'object',
        required: ['amount', 'payment_method', 'payment_date'],
        properties: {
          amount: { type: 'number', minimum: 0 },
          payment_method: { $ref: '#/components/schemas/PaymentMethod' },
          payment_date: { type: 'string', format: 'date' },
          reference_number: { type: 'string', maxLength: 100 },
          notes: { type: 'string', maxLength: 500 },
        },
      },

      // Proposal schemas
      ProposalStatus: {
        type: 'string',
        enum: ['draft', 'sent', 'viewed', 'signed', 'rejected', 'expired', 'converted'],
      },
      Proposal: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organization_id: { type: 'string', format: 'uuid' },
          estimate_id: { type: 'string', format: 'uuid' },
          customer_id: { type: 'string', format: 'uuid' },
          proposal_number: { type: 'string' },
          status: { $ref: '#/components/schemas/ProposalStatus' },
          cover_letter: { type: 'string', maxLength: 5000, nullable: true },
          terms_and_conditions: { type: 'string', maxLength: 10000, nullable: true },
          payment_terms: { type: 'string', maxLength: 2000, nullable: true },
          exclusions: { type: 'string', maxLength: 5000, nullable: true },
          inclusions: { type: 'string', maxLength: 5000, nullable: true },
          valid_until: { type: 'string', format: 'date', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateProposal: {
        type: 'object',
        required: ['estimate_id'],
        properties: {
          estimate_id: { type: 'string', format: 'uuid' },
          cover_letter: { type: 'string', maxLength: 5000 },
          terms_and_conditions: { type: 'string', maxLength: 10000 },
          payment_terms: { type: 'string', maxLength: 2000 },
          exclusions: { type: 'string', maxLength: 5000 },
          inclusions: { type: 'string', maxLength: 5000 },
          valid_until: { type: 'string', format: 'date' },
        },
      },

      // Pipeline schemas
      OpportunityStatus: {
        type: 'string',
        enum: ['open', 'won', 'lost'],
      },
      Opportunity: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organization_id: { type: 'string', format: 'uuid' },
          customer_id: { type: 'string', format: 'uuid' },
          stage_id: { type: 'string', format: 'uuid' },
          name: { type: 'string', maxLength: 255 },
          value: { type: 'number' },
          probability: { type: 'number', minimum: 0, maximum: 100 },
          expected_close_date: { type: 'string', format: 'date', nullable: true },
          source: { type: 'string', maxLength: 100, nullable: true },
          notes: { type: 'string', maxLength: 2000, nullable: true },
          status: { $ref: '#/components/schemas/OpportunityStatus' },
          assigned_to: { type: 'string', format: 'uuid', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateOpportunity: {
        type: 'object',
        required: ['customer_id', 'name', 'stage_id'],
        properties: {
          customer_id: { type: 'string', format: 'uuid' },
          name: { type: 'string', minLength: 1, maxLength: 255 },
          stage_id: { type: 'string', format: 'uuid' },
          value: { type: 'number', minimum: 0 },
          probability: { type: 'number', minimum: 0, maximum: 100 },
          expected_close_date: { type: 'string', format: 'date' },
          source: { type: 'string', maxLength: 100 },
          notes: { type: 'string', maxLength: 2000 },
          assigned_to: { type: 'string', format: 'uuid' },
        },
      },
      PipelineStage: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', maxLength: 100 },
          order: { type: 'integer' },
          probability: { type: 'number', minimum: 0, maximum: 100 },
          color: { type: 'string', maxLength: 20 },
        },
      },

      // Commission schemas
      CommissionStatus: {
        type: 'string',
        enum: ['pending', 'approved', 'paid'],
      },
      Commission: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          plan_id: { type: 'string', format: 'uuid' },
          opportunity_id: { type: 'string', format: 'uuid', nullable: true },
          job_id: { type: 'string', format: 'uuid', nullable: true },
          invoice_id: { type: 'string', format: 'uuid', nullable: true },
          base_amount: { type: 'number' },
          commission_amount: { type: 'number' },
          status: { $ref: '#/components/schemas/CommissionStatus' },
          paid_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },

      // Feedback schemas
      FeedbackSurvey: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          job_id: { type: 'string', format: 'uuid' },
          customer_id: { type: 'string', format: 'uuid' },
          token: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'sent', 'completed'] },
          rating: { type: 'integer', minimum: 1, maximum: 5, nullable: true },
          comments: { type: 'string', maxLength: 2000, nullable: true },
          would_recommend: { type: 'boolean', nullable: true },
          allow_testimonial: { type: 'boolean', nullable: true },
          testimonial_approved: { type: 'boolean' },
          created_at: { type: 'string', format: 'date-time' },
          completed_at: { type: 'string', format: 'date-time', nullable: true },
        },
      },

      // Site Survey / Hazard Assessment schemas
      HazardType: {
        type: 'string',
        enum: ['asbestos', 'mold', 'lead', 'vermiculite', 'other'],
      },
      SiteSurvey: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organization_id: { type: 'string', format: 'uuid' },
          customer_id: { type: 'string', format: 'uuid', nullable: true },
          job_name: { type: 'string', maxLength: 100 },
          customer_name: { type: 'string', maxLength: 100 },
          customer_email: { type: 'string', format: 'email', nullable: true },
          customer_phone: { type: 'string', nullable: true },
          site_address: { type: 'string' },
          site_city: { type: 'string' },
          site_state: { type: 'string', maxLength: 2 },
          site_zip: { type: 'string', maxLength: 10 },
          hazard_type: { $ref: '#/components/schemas/HazardType' },
          hazard_subtype: { type: 'string', nullable: true },
          containment_level: { type: 'integer', minimum: 1, maximum: 4, nullable: true },
          area_sqft: { type: 'number', nullable: true },
          linear_ft: { type: 'number', nullable: true },
          volume_cuft: { type: 'number', nullable: true },
          material_type: { type: 'string', nullable: true },
          occupied: { type: 'boolean' },
          access_issues: { type: 'array', items: { type: 'string' } },
          special_conditions: { type: 'string', nullable: true },
          clearance_required: { type: 'boolean' },
          clearance_lab: { type: 'string', nullable: true },
          regulatory_notifications_needed: { type: 'boolean' },
          notes: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['draft', 'completed', 'estimated'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },

      // Report schemas
      Report: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          report_type: { type: 'string' },
          config: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },

      // Subscription schemas
      Subscription: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['active', 'canceled', 'past_due', 'trialing'] },
          plan: { type: 'string' },
          current_period_start: { type: 'string', format: 'date-time' },
          current_period_end: { type: 'string', format: 'date-time' },
          cancel_at_period_end: { type: 'boolean' },
        },
      },

      // AI schemas
      AIEstimateInput: {
        type: 'object',
        required: ['hazard_types'],
        properties: {
          hazard_types: { type: 'array', items: { type: 'string' }, minItems: 1 },
          property_type: { type: 'string' },
          square_footage: { type: 'number' },
          photos: { type: 'array', items: { type: 'string' } },
          site_survey_notes: { type: 'string' },
          customer_notes: { type: 'string' },
        },
      },
      AIEstimateSuggestion: {
        type: 'object',
        properties: {
          estimated_cost: { type: 'number' },
          estimated_duration_days: { type: 'integer' },
          line_items: { type: 'array', items: { $ref: '#/components/schemas/AddLineItem' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          confidence_score: { type: 'number', minimum: 0, maximum: 1 },
        },
      },

      // SMS schemas
      SMSMessage: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organization_id: { type: 'string', format: 'uuid' },
          to_phone: { type: 'string', description: 'Phone number in E.164 format' },
          from_phone: { type: 'string', description: 'Twilio phone number' },
          message: { type: 'string', maxLength: 1600 },
          status: { type: 'string', enum: ['queued', 'sent', 'delivered', 'undelivered', 'failed'] },
          direction: { type: 'string', enum: ['inbound', 'outbound'] },
          twilio_sid: { type: 'string' },
          cost_cents: { type: 'integer', minimum: 0 },
          customer_id: { type: 'string', format: 'uuid', nullable: true },
          job_id: { type: 'string', format: 'uuid', nullable: true },
          template_id: { type: 'string', format: 'uuid', nullable: true },
          sent_at: { type: 'string', format: 'date-time' },
          delivered_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      SMSTemplate: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', maxLength: 100 },
          message: { type: 'string', maxLength: 1600 },
          category: { type: 'string', enum: ['appointment', 'reminder', 'followup', 'marketing'] },
          variables: { type: 'array', items: { type: 'string' } },
          usage_count: { type: 'integer', minimum: 0 },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      SendSMSRequest: {
        type: 'object',
        required: ['to', 'message'],
        properties: {
          to: { type: 'string', description: 'Phone number in E.164 format' },
          message: { type: 'string', maxLength: 1600 },
          template_id: { type: 'string', format: 'uuid' },
          variables: { type: 'object', additionalProperties: { type: 'string' } },
          customer_id: { type: 'string', format: 'uuid' },
          job_id: { type: 'string', format: 'uuid' },
          scheduled_at: { type: 'string', format: 'date-time' },
        },
      },

      // Job completion schemas
      JobCompletion: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          job_id: { type: 'string', format: 'uuid' },
          completed_by: { type: 'string', format: 'uuid' },
          completion_photos: { type: 'array', items: { type: 'string', format: 'uri' } },
          notes: { type: 'string', maxLength: 2000 },
          actual_duration_hours: { type: 'number', minimum: 0 },
          issues_encountered: { type: 'string', maxLength: 1000 },
          additional_work_needed: { type: 'boolean' },
          customer_satisfaction_rating: { type: 'integer', minimum: 1, maximum: 5 },
          status: { type: 'string', enum: ['pending_approval', 'approved', 'rejected'] },
          approved_by: { type: 'string', format: 'uuid', nullable: true },
          approved_at: { type: 'string', format: 'date-time', nullable: true },
          approval_notes: { type: 'string', maxLength: 1000, nullable: true },
          completed_at: { type: 'string', format: 'date-time' },
        },
      },
      JobTimeEntry: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          job_id: { type: 'string', format: 'uuid' },
          profile_id: { type: 'string', format: 'uuid' },
          entry_type: { type: 'string', enum: ['regular', 'overtime', 'travel', 'setup', 'cleanup'] },
          start_time: { type: 'string', format: 'date-time' },
          end_time: { type: 'string', format: 'date-time' },
          hours: { type: 'number', minimum: 0 },
          hourly_rate: { type: 'number', minimum: 0 },
          total_cost: { type: 'number', minimum: 0 },
          notes: { type: 'string', maxLength: 500 },
          approved: { type: 'boolean' },
          approved_by: { type: 'string', format: 'uuid', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      JobPhoto: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          job_id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          category: { type: 'string', enum: ['before', 'during', 'after', 'equipment', 'damage'] },
          caption: { type: 'string', maxLength: 200 },
          taken_at: { type: 'string', format: 'date-time' },
          gps_coordinates: { type: 'string', nullable: true },
          uploaded_by: { type: 'string', format: 'uuid' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      JobMaterial: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', maxLength: 255 },
          description: { type: 'string', maxLength: 500 },
          unit: { type: 'string', maxLength: 20 },
          unit_cost: { type: 'number', minimum: 0 },
          supplier: { type: 'string', maxLength: 255 },
          category: { type: 'string', maxLength: 100 },
        },
      },
      MaterialUsage: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          job_id: { type: 'string', format: 'uuid' },
          material_id: { type: 'string', format: 'uuid' },
          quantity_allocated: { type: 'number', minimum: 0 },
          quantity_used: { type: 'number', minimum: 0 },
          unit_cost: { type: 'number', minimum: 0 },
          total_cost: { type: 'number', minimum: 0 },
          waste_percentage: { type: 'number', minimum: 0, maximum: 100 },
          notes: { type: 'string', maxLength: 500 },
          recorded_by: { type: 'string', format: 'uuid' },
          recorded_at: { type: 'string', format: 'date-time' },
        },
      },

      // Notification schemas
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          type: { type: 'string', enum: ['job_assigned', 'job_completed', 'estimate_approved', 'invoice_paid', 'system_alert'] },
          title: { type: 'string', maxLength: 255 },
          message: { type: 'string', maxLength: 1000 },
          data: { type: 'object', description: 'Additional notification data' },
          read: { type: 'boolean' },
          read_at: { type: 'string', format: 'date-time', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },

      // Customer Segment schemas
      Segment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organization_id: { type: 'string', format: 'uuid' },
          name: { type: 'string', maxLength: 255 },
          description: { type: 'string', maxLength: 1000, nullable: true },
          criteria: {
            type: 'object',
            description: 'Segment criteria configuration',
            properties: {
              customer_status: { type: 'array', items: { type: 'string' } },
              lead_source: { type: 'array', items: { type: 'string' } },
              job_count_min: { type: 'integer', minimum: 0 },
              job_count_max: { type: 'integer', minimum: 0 },
              total_spent_min: { type: 'number', minimum: 0 },
              total_spent_max: { type: 'number', minimum: 0 },
              last_job_days_ago: { type: 'integer', minimum: 0 },
              created_after: { type: 'string', format: 'date' },
              created_before: { type: 'string', format: 'date' },
              tags: { type: 'array', items: { type: 'string' } },
              geographic_area: {
                type: 'object',
                properties: {
                  cities: { type: 'array', items: { type: 'string' } },
                  states: { type: 'array', items: { type: 'string' } },
                  zip_codes: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
          member_count: { type: 'integer', minimum: 0 },
          last_calculated_at: { type: 'string', format: 'date-time', nullable: true },
          is_dynamic: { type: 'boolean', description: 'Whether segment auto-updates' },
          created_by: { type: 'string', format: 'uuid' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateSegment: {
        type: 'object',
        required: ['name', 'criteria'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          criteria: {
            type: 'object',
            description: 'Segment criteria configuration',
            properties: {
              customer_status: { type: 'array', items: { type: 'string' } },
              lead_source: { type: 'array', items: { type: 'string' } },
              job_count_min: { type: 'integer', minimum: 0 },
              job_count_max: { type: 'integer', minimum: 0 },
              total_spent_min: { type: 'number', minimum: 0 },
              total_spent_max: { type: 'number', minimum: 0 },
              last_job_days_ago: { type: 'integer', minimum: 0 },
              created_after: { type: 'string', format: 'date' },
              created_before: { type: 'string', format: 'date' },
              tags: { type: 'array', items: { type: 'string' } },
              geographic_area: {
                type: 'object',
                properties: {
                  cities: { type: 'array', items: { type: 'string' } },
                  states: { type: 'array', items: { type: 'string' } },
                  zip_codes: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
          is_dynamic: { type: 'boolean', default: true },
        },
      },
      UpdateSegment: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', maxLength: 1000 },
          criteria: {
            type: 'object',
            description: 'Segment criteria configuration',
          },
          is_dynamic: { type: 'boolean' },
        },
      },

      // Team Management schemas
      TeamInvitation: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          organization_id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'estimator', 'technician', 'viewer'] },
          invited_by: { type: 'string', format: 'uuid' },
          expires_at: { type: 'string', format: 'date-time' },
          accepted_at: { type: 'string', format: 'date-time', nullable: true },
          status: { type: 'string', enum: ['pending', 'accepted', 'expired', 'revoked'] },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateInvitation: {
        type: 'object',
        required: ['email', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'estimator', 'technician', 'viewer'] },
          message: { type: 'string', maxLength: 500, description: 'Optional welcome message' },
        },
      },

      // Report schemas (expanded)
      ReportConfig: {
        type: 'object',
        properties: {
          date_range: {
            type: 'object',
            properties: {
              start_date: { type: 'string', format: 'date' },
              end_date: { type: 'string', format: 'date' },
              preset: { type: 'string', enum: ['last_30_days', 'last_quarter', 'last_year', 'ytd'] },
            },
          },
          filters: {
            type: 'object',
            properties: {
              customer_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
              job_statuses: { type: 'array', items: { type: 'string' } },
              crew_member_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
              hazard_types: { type: 'array', items: { type: 'string' } },
            },
          },
          grouping: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'quarterly'] },
          include_details: { type: 'boolean', default: false },
        },
      },
      ReportResult: {
        type: 'object',
        properties: {
          report_id: { type: 'string', format: 'uuid' },
          report_type: { type: 'string' },
          generated_at: { type: 'string', format: 'date-time' },
          data: { type: 'object', description: 'Report data structure varies by type' },
          summary: {
            type: 'object',
            properties: {
              total_records: { type: 'integer' },
              total_revenue: { type: 'number' },
              average_job_value: { type: 'number' },
              completion_rate: { type: 'number' },
            },
          },
          export_urls: {
            type: 'object',
            properties: {
              csv: { type: 'string', format: 'uri' },
              pdf: { type: 'string', format: 'uri' },
              xlsx: { type: 'string', format: 'uri' },
            },
          },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
          },
        },
      },
      Forbidden: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: { code: 'NOT_FOUND', message: 'Resource not found' } },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: { code: 'VALIDATION_ERROR', message: 'email: Invalid email', field: 'email' } },
          },
        },
      },
      RateLimited: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // =====================
    // CUSTOMERS
    // =====================
    '/customers': {
      get: {
        tags: ['Customers'],
        summary: 'List customers',
        description: 'Get a paginated list of customers for the current organization',
        operationId: 'listCustomers',
        parameters: [
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/CustomerStatus' }, description: 'Filter by status' },
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name, email, or company' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 }, description: 'Number of results' },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 }, description: 'Offset for pagination' },
        ],
        responses: {
          '200': {
            description: 'List of customers',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    customers: { type: 'array', items: { $ref: '#/components/schemas/Customer' } },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Customers'],
        summary: 'Create customer',
        description: 'Create a new customer',
        operationId: 'createCustomer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCustomer' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Customer created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    customer: { $ref: '#/components/schemas/Customer' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Get customer',
        description: 'Get a specific customer by ID',
        operationId: 'getCustomer',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Customer details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    customer: { $ref: '#/components/schemas/Customer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Customers'],
        summary: 'Update customer',
        description: 'Update an existing customer',
        operationId: 'updateCustomer',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCustomer' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Customer updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    customer: { $ref: '#/components/schemas/Customer' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Customers'],
        summary: 'Delete customer',
        description: 'Delete a customer (admin only)',
        operationId: 'deleteCustomer',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Customer deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { message: { type: 'string' } },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '403': { $ref: '#/components/responses/Forbidden' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/customers/{id}/contacts': {
      get: {
        tags: ['Customers'],
        summary: 'List customer contacts',
        description: 'Get all contacts for a customer',
        operationId: 'listCustomerContacts',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'List of contacts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    contacts: { type: 'array', items: { $ref: '#/components/schemas/Contact' } },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      post: {
        tags: ['Customers'],
        summary: 'Add contact',
        description: 'Add a new contact to a customer',
        operationId: 'addCustomerContact',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateContact' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Contact created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    contact: { $ref: '#/components/schemas/Contact' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // =====================
    // JOBS
    // =====================
    '/jobs': {
      get: {
        tags: ['Jobs'],
        summary: 'List jobs',
        description: 'Get a list of jobs with optional filtering',
        operationId: 'listJobs',
        parameters: [
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/JobStatus' } },
          { name: 'customer_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'from_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'crew_member_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'List of jobs',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/Job' } },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Jobs'],
        summary: 'Create job',
        description: 'Create a new job',
        operationId: 'createJob',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateJob' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Job created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Job' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/jobs/{id}': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job',
        description: 'Get a specific job by ID',
        operationId: 'getJob',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Job details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Job' } } },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Jobs'],
        summary: 'Update job',
        operationId: 'updateJob',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateJob' } } },
        },
        responses: {
          '200': {
            description: 'Job updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Job' } } },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Jobs'],
        summary: 'Delete job',
        operationId: 'deleteJob',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Job deleted' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/jobs/{id}/status': {
      patch: {
        tags: ['Jobs'],
        summary: 'Update job status',
        operationId: 'updateJobStatus',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: { status: { $ref: '#/components/schemas/JobStatus' } },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Status updated' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/jobs/{id}/crew': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job crew',
        operationId: 'getJobCrew',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Crew assignments' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Jobs'],
        summary: 'Assign crew member',
        operationId: 'assignCrewMember',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['profile_id'],
                properties: {
                  profile_id: { type: 'string', format: 'uuid' },
                  role: { type: 'string', enum: ['lead', 'crew', 'supervisor', 'trainee'] },
                  is_lead: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Crew member assigned' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/jobs/calendar': {
      get: {
        tags: ['Jobs'],
        summary: 'Get calendar events',
        operationId: 'getJobCalendar',
        parameters: [
          { name: 'start', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
          { name: 'end', in: 'query', required: true, schema: { type: 'string', format: 'date' } },
        ],
        responses: {
          '200': { description: 'Calendar events' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/jobs/from-proposal': {
      post: {
        tags: ['Jobs'],
        summary: 'Create job from proposal',
        operationId: 'createJobFromProposal',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['proposal_id', 'scheduled_start_date'],
                properties: {
                  proposal_id: { type: 'string', format: 'uuid' },
                  scheduled_start_date: { type: 'string', format: 'date' },
                  scheduled_start_time: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                  estimated_duration_hours: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Job created from proposal' },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },

    // =====================
    // ESTIMATES
    // =====================
    '/estimates': {
      get: {
        tags: ['Estimates'],
        summary: 'List estimates',
        operationId: 'listEstimates',
        parameters: [
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/EstimateStatus' } },
          { name: 'customer_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'survey_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': {
            description: 'List of estimates',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    estimates: { type: 'array', items: { $ref: '#/components/schemas/Estimate' } },
                    total: { type: 'integer' },
                    limit: { type: 'integer' },
                    offset: { type: 'integer' },
                  },
                },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Estimates'],
        summary: 'Create estimate from survey',
        operationId: 'createEstimate',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateEstimateFromSurvey' } },
          },
        },
        responses: {
          '201': {
            description: 'Estimate created',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { estimate: { $ref: '#/components/schemas/Estimate' } } },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/estimates/{id}': {
      get: {
        tags: ['Estimates'],
        summary: 'Get estimate',
        operationId: 'getEstimate',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Estimate details' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Estimates'],
        summary: 'Update estimate',
        operationId: 'updateEstimate',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Estimate updated' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/estimates/{id}/approve': {
      post: {
        tags: ['Estimates'],
        summary: 'Approve estimate',
        operationId: 'approveEstimate',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: { type: 'object', properties: { notes: { type: 'string', maxLength: 1000 } } },
            },
          },
        },
        responses: {
          '200': { description: 'Estimate approved' },
          '401': { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/estimates/{id}/line-items': {
      get: {
        tags: ['Estimates'],
        summary: 'Get estimate line items',
        operationId: 'getEstimateLineItems',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Line items' } },
      },
      post: {
        tags: ['Estimates'],
        summary: 'Add line item',
        operationId: 'addEstimateLineItem',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AddLineItem' } } },
        },
        responses: { '201': { description: 'Line item added' } },
      },
    },

    // =====================
    // INVOICES
    // =====================
    '/invoices': {
      get: {
        tags: ['Invoices'],
        summary: 'List invoices',
        operationId: 'listInvoices',
        parameters: [
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/InvoiceStatus' } },
          { name: 'customer_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'job_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'from_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'overdue', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: {
          '200': {
            description: 'List of invoices',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { invoices: { type: 'array', items: { $ref: '#/components/schemas/Invoice' } } } },
              },
            },
          },
        },
      },
      post: {
        tags: ['Invoices'],
        summary: 'Create invoice',
        operationId: 'createInvoice',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateInvoice' } } },
        },
        responses: { '201': { description: 'Invoice created' } },
      },
    },
    '/invoices/{id}': {
      get: {
        tags: ['Invoices'],
        summary: 'Get invoice',
        operationId: 'getInvoice',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Invoice details' } },
      },
      patch: {
        tags: ['Invoices'],
        summary: 'Update invoice',
        operationId: 'updateInvoice',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Invoice updated' } },
      },
      delete: {
        tags: ['Invoices'],
        summary: 'Delete invoice',
        operationId: 'deleteInvoice',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Invoice deleted' } },
      },
    },
    '/invoices/{id}/payments': {
      post: {
        tags: ['Invoices'],
        summary: 'Add payment',
        operationId: 'addPayment',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AddPayment' } } },
        },
        responses: { '201': { description: 'Payment recorded' } },
      },
    },
    '/invoices/{id}/send': {
      post: {
        tags: ['Invoices'],
        summary: 'Send invoice',
        operationId: 'sendInvoice',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  message: { type: 'string', maxLength: 2000 },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Invoice sent' } },
      },
    },

    // =====================
    // PROPOSALS
    // =====================
    '/proposals': {
      get: {
        tags: ['Proposals'],
        summary: 'List proposals',
        operationId: 'listProposals',
        parameters: [
          { name: 'status', in: 'query', schema: { $ref: '#/components/schemas/ProposalStatus' } },
          { name: 'customer_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'estimate_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: { '200': { description: 'List of proposals' } },
      },
      post: {
        tags: ['Proposals'],
        summary: 'Create proposal',
        operationId: 'createProposal',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProposal' } } },
        },
        responses: { '201': { description: 'Proposal created' } },
      },
    },

    // =====================
    // PIPELINE
    // =====================
    '/pipeline': {
      get: {
        tags: ['Pipeline'],
        summary: 'Get pipeline data',
        description: 'Get pipeline stages, opportunities, and metrics',
        operationId: 'getPipeline',
        responses: {
          '200': {
            description: 'Pipeline data',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stages: { type: 'array', items: { $ref: '#/components/schemas/PipelineStage' } },
                    opportunities: { type: 'array', items: { $ref: '#/components/schemas/Opportunity' } },
                    metrics: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Pipeline'],
        summary: 'Create opportunity',
        operationId: 'createOpportunity',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOpportunity' } } },
        },
        responses: { '201': { description: 'Opportunity created' } },
      },
    },
    '/pipeline/{id}': {
      get: {
        tags: ['Pipeline'],
        summary: 'Get opportunity',
        operationId: 'getOpportunity',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Opportunity details' } },
      },
      patch: {
        tags: ['Pipeline'],
        summary: 'Update opportunity',
        operationId: 'updateOpportunity',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Opportunity updated' } },
      },
    },
    '/pipeline/{id}/move': {
      post: {
        tags: ['Pipeline'],
        summary: 'Move opportunity to stage',
        operationId: 'moveOpportunity',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['stage_id'],
                properties: { stage_id: { type: 'string', format: 'uuid' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Opportunity moved' } },
      },
    },
    '/pipeline/stages': {
      get: {
        tags: ['Pipeline'],
        summary: 'List pipeline stages',
        operationId: 'listPipelineStages',
        responses: { '200': { description: 'Pipeline stages' } },
      },
      post: {
        tags: ['Pipeline'],
        summary: 'Create pipeline stage',
        operationId: 'createPipelineStage',
        responses: { '201': { description: 'Stage created' } },
      },
    },

    // =====================
    // COMMISSIONS
    // =====================
    '/commissions/summary': {
      get: {
        tags: ['Commissions'],
        summary: 'Get commission summary',
        operationId: 'getCommissionSummary',
        parameters: [
          { name: 'user_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'pay_period', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Commission summary' } },
      },
    },
    '/commissions/plans': {
      get: {
        tags: ['Commissions'],
        summary: 'List commission plans',
        operationId: 'listCommissionPlans',
        responses: { '200': { description: 'Commission plans' } },
      },
      post: {
        tags: ['Commissions'],
        summary: 'Create commission plan',
        operationId: 'createCommissionPlan',
        responses: { '201': { description: 'Plan created' } },
      },
    },

    // =====================
    // APPROVALS
    // =====================
    '/approvals/pending': {
      get: {
        tags: ['Approvals'],
        summary: 'Get pending approvals',
        operationId: 'getPendingApprovals',
        responses: { '200': { description: 'Pending approvals' } },
      },
    },
    '/approvals/{id}': {
      post: {
        tags: ['Approvals'],
        summary: 'Process approval',
        operationId: 'processApproval',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['action'],
                properties: {
                  action: { type: 'string', enum: ['approve', 'reject'] },
                  notes: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Approval processed' } },
      },
    },

    // =====================
    // REPORTS
    // =====================
    '/reports': {
      get: {
        tags: ['Reports'],
        summary: 'List saved reports',
        operationId: 'listReports',
        responses: { '200': { description: 'Saved reports' } },
      },
      post: {
        tags: ['Reports'],
        summary: 'Create saved report',
        operationId: 'createReport',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'report_type', 'config'],
                properties: {
                  name: { type: 'string' },
                  report_type: { type: 'string' },
                  config: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Report created' } },
      },
    },
    '/reports/{type}/run': {
      post: {
        tags: ['Reports'],
        summary: 'Run report',
        operationId: 'runReport',
        parameters: [
          { name: 'type', in: 'path', required: true, schema: { type: 'string' }, description: 'Report type (revenue, jobs, customers, etc.)' },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  date_range: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
                  filters: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Report data' } },
      },
    },
    '/reports/export': {
      post: {
        tags: ['Reports'],
        summary: 'Export report',
        operationId: 'exportReport',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['report_type', 'format'],
                properties: {
                  report_type: { type: 'string' },
                  format: { type: 'string', enum: ['csv', 'pdf', 'xlsx'] },
                  config: { type: 'object' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Export file' } },
      },
    },

    // =====================
    // FEEDBACK
    // =====================
    '/feedback/stats': {
      get: {
        tags: ['Feedback'],
        summary: 'Get feedback statistics',
        operationId: 'getFeedbackStats',
        responses: { '200': { description: 'Feedback statistics' } },
      },
    },
    '/feedback/testimonials': {
      get: {
        tags: ['Feedback'],
        summary: 'Get approved testimonials',
        operationId: 'getTestimonials',
        responses: { '200': { description: 'Approved testimonials' } },
      },
    },
    '/feedback/{id}/send': {
      post: {
        tags: ['Feedback'],
        summary: 'Send feedback request',
        operationId: 'sendFeedbackRequest',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Feedback request sent' } },
      },
    },
    '/feedback/{id}/approve-testimonial': {
      post: {
        tags: ['Feedback'],
        summary: 'Approve/reject testimonial',
        operationId: 'approveTestimonial',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['approved'], properties: { approved: { type: 'boolean' } } },
            },
          },
        },
        responses: { '200': { description: 'Testimonial status updated' } },
      },
    },
    '/feedback/{token}': {
      get: {
        tags: ['Feedback'],
        summary: 'Get feedback survey (public)',
        operationId: 'getFeedbackSurvey',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Feedback survey' } },
      },
      post: {
        tags: ['Feedback'],
        summary: 'Submit feedback (public)',
        operationId: 'submitFeedback',
        security: [],
        parameters: [{ name: 'token', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rating'],
                properties: {
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  comments: { type: 'string', maxLength: 2000 },
                  would_recommend: { type: 'boolean' },
                  allow_testimonial: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Feedback submitted' } },
      },
    },

    // =====================
    // AI
    // =====================
    '/ai/estimate': {
      post: {
        tags: ['AI'],
        summary: 'Get AI estimate suggestion',
        description: 'Use AI to suggest an estimate based on project details',
        operationId: 'aiEstimateSuggestion',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/AIEstimateInput' } } },
        },
        responses: {
          '200': {
            description: 'AI suggestion',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/AIEstimateSuggestion' } } },
          },
        },
      },
    },
    '/ai/photo-analysis': {
      post: {
        tags: ['AI'],
        summary: 'Analyze photos for hazards',
        operationId: 'aiPhotoAnalysis',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { photos: { type: 'array', items: { type: 'string', format: 'binary' } } },
              },
            },
          },
        },
        responses: { '200': { description: 'Photo analysis results' } },
      },
    },
    '/ai/voice/transcribe': {
      post: {
        tags: ['AI'],
        summary: 'Transcribe voice notes',
        operationId: 'aiVoiceTranscribe',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { audio: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Transcription result' } },
      },
    },

    // =====================
    // BILLING
    // =====================
    '/billing/subscription': {
      get: {
        tags: ['Billing'],
        summary: 'Get subscription status',
        operationId: 'getSubscription',
        responses: {
          '200': {
            description: 'Subscription details',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Subscription' } } },
          },
        },
      },
      delete: {
        tags: ['Billing'],
        summary: 'Cancel subscription',
        operationId: 'cancelSubscription',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  reason: { type: 'string' },
                  cancel_immediately: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Subscription cancelled' } },
      },
    },
    '/billing/plans': {
      get: {
        tags: ['Billing'],
        summary: 'Get available plans',
        operationId: 'getBillingPlans',
        security: [],
        responses: { '200': { description: 'Available plans' } },
      },
    },
    '/billing/checkout': {
      post: {
        tags: ['Billing'],
        summary: 'Create checkout session',
        operationId: 'createCheckoutSession',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['price_id'],
                properties: {
                  price_id: { type: 'string' },
                  success_url: { type: 'string' },
                  cancel_url: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Checkout session URL' } },
      },
    },
    '/billing/portal': {
      post: {
        tags: ['Billing'],
        summary: 'Create billing portal session',
        operationId: 'createBillingPortal',
        responses: { '200': { description: 'Portal session URL' } },
      },
    },

    // =====================
    // SETTINGS
    // =====================
    '/settings/pricing': {
      get: {
        tags: ['Settings'],
        summary: 'Get all pricing settings',
        operationId: 'getPricingSettings',
        responses: {
          '200': {
            description: 'Pricing configuration',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    labor_rates: { type: 'array' },
                    equipment_rates: { type: 'array' },
                    material_costs: { type: 'array' },
                    disposal_fees: { type: 'array' },
                    travel_rates: { type: 'array' },
                    settings: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Settings'],
        summary: 'Update pricing settings',
        operationId: 'updatePricingSettings',
        responses: { '200': { description: 'Settings updated' } },
      },
    },

    // =====================
    // INTEGRATIONS
    // =====================
    '/integrations/quickbooks/connect': {
      get: {
        tags: ['Integrations'],
        summary: 'Connect QuickBooks',
        operationId: 'connectQuickBooks',
        responses: { '302': { description: 'Redirect to QuickBooks OAuth' } },
      },
    },
    '/integrations/quickbooks/status': {
      get: {
        tags: ['Integrations'],
        summary: 'Get QuickBooks connection status',
        operationId: 'getQuickBooksStatus',
        responses: { '200': { description: 'Connection status' } },
      },
    },
    '/integrations/quickbooks/disconnect': {
      post: {
        tags: ['Integrations'],
        summary: 'Disconnect QuickBooks',
        operationId: 'disconnectQuickBooks',
        responses: { '200': { description: 'Disconnected' } },
      },
    },
    '/integrations/google-calendar/connect': {
      get: {
        tags: ['Integrations'],
        summary: 'Connect Google Calendar',
        operationId: 'connectGoogleCalendar',
        responses: { '302': { description: 'Redirect to Google OAuth' } },
      },
    },
    '/integrations/google-calendar/callback': {
      get: {
        tags: ['Integrations'],
        summary: 'Google Calendar OAuth callback',
        operationId: 'googleCalendarCallback',
        parameters: [
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '302': { description: 'Redirect to dashboard with success/error' },
        },
      },
    },
    '/integrations/google-calendar/disconnect': {
      post: {
        tags: ['Integrations'],
        summary: 'Disconnect Google Calendar',
        operationId: 'disconnectGoogleCalendar',
        responses: { '200': { description: 'Disconnected successfully' } },
      },
    },
    '/integrations/google-calendar/sync': {
      post: {
        tags: ['Integrations'],
        summary: 'Sync jobs to Google Calendar',
        operationId: 'syncGoogleCalendar',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  job_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  sync_all: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sync completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    synced_count: { type: 'integer' },
                    failed_count: { type: 'integer' },
                    errors: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/integrations/outlook-calendar/connect': {
      get: {
        tags: ['Integrations'],
        summary: 'Connect Outlook Calendar',
        operationId: 'connectOutlookCalendar',
        responses: { '302': { description: 'Redirect to Microsoft OAuth' } },
      },
    },
    '/integrations/outlook-calendar/callback': {
      get: {
        tags: ['Integrations'],
        summary: 'Outlook Calendar OAuth callback',
        operationId: 'outlookCalendarCallback',
        parameters: [
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '302': { description: 'Redirect to dashboard' } },
      },
    },
    '/integrations/outlook-calendar/disconnect': {
      post: {
        tags: ['Integrations'],
        summary: 'Disconnect Outlook Calendar',
        operationId: 'disconnectOutlookCalendar',
        responses: { '200': { description: 'Disconnected successfully' } },
      },
    },
    '/integrations/hubspot/connect': {
      get: {
        tags: ['Integrations'],
        summary: 'Connect HubSpot',
        operationId: 'connectHubSpot',
        responses: { '302': { description: 'Redirect to HubSpot OAuth' } },
      },
    },
    '/integrations/hubspot/callback': {
      get: {
        tags: ['Integrations'],
        summary: 'HubSpot OAuth callback',
        operationId: 'hubSpotCallback',
        parameters: [
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { '302': { description: 'Redirect to dashboard' } },
      },
    },
    '/integrations/hubspot/disconnect': {
      post: {
        tags: ['Integrations'],
        summary: 'Disconnect HubSpot',
        operationId: 'disconnectHubSpot',
        responses: { '200': { description: 'Disconnected successfully' } },
      },
    },
    '/integrations/hubspot/sync/contacts': {
      post: {
        tags: ['Integrations'],
        summary: 'Sync contacts to HubSpot',
        operationId: 'syncHubSpotContacts',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  customer_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  sync_all: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sync completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    synced_count: { type: 'integer' },
                    failed_count: { type: 'integer' },
                    errors: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/integrations/mailchimp/connect': {
      get: {
        tags: ['Integrations'],
        summary: 'Connect Mailchimp',
        operationId: 'connectMailchimp',
        responses: { '302': { description: 'Redirect to Mailchimp OAuth' } },
      },
    },
    '/integrations/mailchimp/callback': {
      get: {
        tags: ['Integrations'],
        summary: 'Mailchimp OAuth callback',
        operationId: 'mailchimpCallback',
        parameters: [
          { name: 'code', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { '302': { description: 'Redirect to dashboard' } },
      },
    },
    '/integrations/mailchimp/disconnect': {
      post: {
        tags: ['Integrations'],
        summary: 'Disconnect Mailchimp',
        operationId: 'disconnectMailchimp',
        responses: { '200': { description: 'Disconnected successfully' } },
      },
    },
    '/integrations/mailchimp/sync/contacts': {
      post: {
        tags: ['Integrations'],
        summary: 'Sync contacts to Mailchimp',
        operationId: 'syncMailchimpContacts',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  segment_id: { type: 'string', format: 'uuid' },
                  list_id: { type: 'string', description: 'Mailchimp list ID' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Sync completed' } },
      },
    },
    '/integrations/quickbooks/sync/invoice': {
      post: {
        tags: ['Integrations'],
        summary: 'Sync invoice to QuickBooks',
        operationId: 'syncQuickBooksInvoice',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['invoice_id'],
                properties: {
                  invoice_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Invoice synced to QuickBooks',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    quickbooks_id: { type: 'string' },
                    sync_status: { type: 'string', enum: ['success', 'failed'] },
                    error_message: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/integrations/quickbooks/sync/customer': {
      post: {
        tags: ['Integrations'],
        summary: 'Sync customer to QuickBooks',
        operationId: 'syncQuickBooksCustomer',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['customer_id'],
                properties: {
                  customer_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Customer synced to QuickBooks' } },
      },
    },

    // =====================
    // NOTIFICATIONS
    // =====================
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications',
        description: 'Get notifications for the current user',
        operationId: 'listNotifications',
        parameters: [
          { name: 'unread_only', in: 'query', schema: { type: 'boolean', default: false } },
          { name: 'type', in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': {
            description: 'Notifications list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notifications: { type: 'array', items: { $ref: '#/components/schemas/Notification' } },
                    unread_count: { type: 'integer' },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Notifications'],
        summary: 'Create notification',
        description: 'Create a notification for specific users (admin only)',
        operationId: 'createNotification',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['user_ids', 'type', 'title', 'message'],
                properties: {
                  user_ids: { type: 'array', items: { type: 'string', format: 'uuid' } },
                  type: { type: 'string', enum: ['job_assigned', 'job_completed', 'estimate_approved', 'invoice_paid', 'system_alert'] },
                  title: { type: 'string', maxLength: 255 },
                  message: { type: 'string', maxLength: 1000 },
                  data: { type: 'object', description: 'Additional notification data' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Notifications created' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/notifications/count': {
      get: {
        tags: ['Notifications'],
        summary: 'Get unread notification count',
        operationId: 'getNotificationCount',
        responses: {
          '200': {
            description: 'Unread count',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    unread_count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/notifications/read-all': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        operationId: 'markAllNotificationsRead',
        responses: {
          '200': {
            description: 'All notifications marked as read',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    updated_count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/notifications/{id}/read': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark notification as read',
        operationId: 'markNotificationRead',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': { description: 'Notification marked as read' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/notifications/preferences': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notification preferences',
        operationId: 'getNotificationPreferences',
        responses: {
          '200': {
            description: 'Notification preferences',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email_notifications: { type: 'boolean' },
                    sms_notifications: { type: 'boolean' },
                    push_notifications: { type: 'boolean' },
                    job_assignments: { type: 'boolean' },
                    job_completions: { type: 'boolean' },
                    estimate_approvals: { type: 'boolean' },
                    invoice_payments: { type: 'boolean' },
                    system_alerts: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Notifications'],
        summary: 'Update notification preferences',
        operationId: 'updateNotificationPreferences',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email_notifications: { type: 'boolean' },
                  sms_notifications: { type: 'boolean' },
                  push_notifications: { type: 'boolean' },
                  job_assignments: { type: 'boolean' },
                  job_completions: { type: 'boolean' },
                  estimate_approvals: { type: 'boolean' },
                  invoice_payments: { type: 'boolean' },
                  system_alerts: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Preferences updated' },
        },
      },
    },

    // =====================
    // WEBHOOKS
    // =====================
    '/webhooks': {
      get: {
        tags: ['Webhooks'],
        summary: 'List webhooks',
        operationId: 'listWebhooks',
        responses: { '200': { description: 'Webhook subscriptions' } },
      },
      post: {
        tags: ['Webhooks'],
        summary: 'Create webhook',
        operationId: 'createWebhook',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url', 'events'],
                properties: {
                  url: { type: 'string', format: 'uri' },
                  events: { type: 'array', items: { type: 'string' } },
                  secret: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Webhook created' } },
      },
    },
    '/webhooks/{id}': {
      delete: {
        tags: ['Webhooks'],
        summary: 'Delete webhook',
        operationId: 'deleteWebhook',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Webhook deleted' } },
      },
    },

    // =====================
    // PLATFORM (Super Admin)
    // =====================
    '/platform/stats': {
      get: {
        tags: ['Platform'],
        summary: 'Get platform statistics',
        description: 'Platform admin only - get overall platform metrics',
        operationId: 'getPlatformStats',
        responses: { '200': { description: 'Platform statistics' } },
      },
    },
    '/platform/organizations': {
      get: {
        tags: ['Platform'],
        summary: 'List all organizations',
        description: 'Platform admin only',
        operationId: 'listOrganizations',
        responses: { '200': { description: 'Organizations list' } },
      },
    },

    // =====================
    // V1 API (External)
    // =====================
    '/v1/customers': {
      get: {
        tags: ['v1 API'],
        summary: 'List customers (API key)',
        description: 'Requires customers:read scope',
        operationId: 'v1ListCustomers',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Customers list with pagination',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Customer' } },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
          '403': { description: 'Missing required scope' },
        },
      },
      post: {
        tags: ['v1 API'],
        summary: 'Create customer (API key)',
        description: 'Requires customers:write scope',
        operationId: 'v1CreateCustomer',
        security: [{ apiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  first_name: { type: 'string' },
                  last_name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  company_name: { type: 'string' },
                  address_line1: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  zip: { type: 'string' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Customer created' } },
      },
    },
    '/v1/jobs': {
      get: {
        tags: ['v1 API'],
        summary: 'List jobs (API key)',
        description: 'Requires jobs:read scope',
        operationId: 'v1ListJobs',
        security: [{ apiKeyAuth: [] }],
        responses: { '200': { description: 'Jobs list' } },
      },
      post: {
        tags: ['v1 API'],
        summary: 'Create job (API key)',
        description: 'Requires jobs:write scope',
        operationId: 'v1CreateJob',
        security: [{ apiKeyAuth: [] }],
        responses: { '201': { description: 'Job created' } },
      },
    },
    '/v1/invoices': {
      get: {
        tags: ['v1 API'],
        summary: 'List invoices (API key)',
        description: 'Requires invoices:read scope',
        operationId: 'v1ListInvoices',
        security: [{ apiKeyAuth: [] }],
        responses: { '200': { description: 'Invoices list' } },
      },
    },
    '/v1/estimates': {
      get: {
        tags: ['v1 API'],
        summary: 'List estimates (API key)',
        description: 'Requires estimates:read scope',
        operationId: 'v1ListEstimates',
        security: [{ apiKeyAuth: [] }],
        responses: { '200': { description: 'Estimates list' } },
      },
    },
    '/v1/customers/{id}': {
      get: {
        tags: ['v1 API'],
        summary: 'Get customer (API key)',
        description: 'Requires customers:read scope',
        operationId: 'v1GetCustomer',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Customer details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Customer' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['v1 API'],
        summary: 'Update customer (API key)',
        description: 'Requires customers:write scope',
        operationId: 'v1UpdateCustomer',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCustomer' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Customer updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Customer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/v1/jobs/{id}': {
      get: {
        tags: ['v1 API'],
        summary: 'Get job (API key)',
        description: 'Requires jobs:read scope',
        operationId: 'v1GetJob',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Job details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { $ref: '#/components/schemas/Job' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // =====================
    // SMS SYSTEM
    // =====================
    '/sms/send': {
      post: {
        tags: ['SMS'],
        summary: 'Send SMS message',
        description: 'Send SMS message to customer with TCPA compliance',
        operationId: 'sendSMS',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['to', 'message'],
                properties: {
                  to: { type: 'string', description: 'Phone number in E.164 format' },
                  message: { type: 'string', maxLength: 1600, description: 'SMS message content' },
                  template_id: { type: 'string', format: 'uuid', description: 'Optional template ID' },
                  variables: { type: 'object', description: 'Template variables' },
                  customer_id: { type: 'string', format: 'uuid', description: 'Customer ID for tracking' },
                  job_id: { type: 'string', format: 'uuid', description: 'Job ID for tracking' },
                  scheduled_at: { type: 'string', format: 'date-time', description: 'Schedule for later' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'SMS sent successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message_id: { type: 'string' },
                    status: { type: 'string', enum: ['sent', 'scheduled', 'failed'] },
                    cost: { type: 'number', description: 'Cost in cents' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '402': {
            description: 'Insufficient SMS credits',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/sms/messages': {
      get: {
        tags: ['SMS'],
        summary: 'List SMS messages',
        description: 'Get SMS message history with filtering',
        operationId: 'listSMSMessages',
        parameters: [
          { name: 'customer_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'job_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['sent', 'delivered', 'failed', 'undelivered'] } },
          { name: 'from_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to_date', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': {
            description: 'SMS messages list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    messages: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          to_phone: { type: 'string' },
                          message: { type: 'string' },
                          status: { type: 'string' },
                          sent_at: { type: 'string', format: 'date-time' },
                          delivered_at: { type: 'string', format: 'date-time', nullable: true },
                          cost_cents: { type: 'integer' },
                          customer_id: { type: 'string', format: 'uuid', nullable: true },
                          job_id: { type: 'string', format: 'uuid', nullable: true },
                        },
                      },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/sms/templates': {
      get: {
        tags: ['SMS'],
        summary: 'List SMS templates',
        operationId: 'listSMSTemplates',
        responses: {
          '200': {
            description: 'SMS templates',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    templates: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          message: { type: 'string' },
                          variables: { type: 'array', items: { type: 'string' } },
                          category: { type: 'string', enum: ['appointment', 'reminder', 'followup', 'marketing'] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['SMS'],
        summary: 'Create SMS template',
        operationId: 'createSMSTemplate',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'message'],
                properties: {
                  name: { type: 'string', maxLength: 100 },
                  message: { type: 'string', maxLength: 1600 },
                  category: { type: 'string', enum: ['appointment', 'reminder', 'followup', 'marketing'] },
                  variables: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Template created' },
        },
      },
    },
    '/sms/opt-in': {
      post: {
        tags: ['SMS'],
        summary: 'Handle SMS opt-in/opt-out',
        description: 'Process SMS consent and TCPA compliance',
        operationId: 'handleSMSOptIn',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['phone', 'action'],
                properties: {
                  phone: { type: 'string', description: 'Phone number in E.164 format' },
                  action: { type: 'string', enum: ['opt-in', 'opt-out'] },
                  customer_id: { type: 'string', format: 'uuid' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Opt-in status updated' },
        },
      },
    },
    '/sms/settings': {
      get: {
        tags: ['SMS'],
        summary: 'Get SMS settings',
        operationId: 'getSMSSettings',
        responses: {
          '200': {
            description: 'SMS configuration',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    twilio_phone_number: { type: 'string' },
                    credits_remaining: { type: 'integer' },
                    quiet_hours_start: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                    quiet_hours_end: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                    timezone: { type: 'string' },
                    auto_opt_out_keywords: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['SMS'],
        summary: 'Update SMS settings',
        operationId: 'updateSMSSettings',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  quiet_hours_start: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                  quiet_hours_end: { type: 'string', pattern: '^\\d{2}:\\d{2}$' },
                  timezone: { type: 'string' },
                  auto_opt_out_keywords: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Settings updated' },
        },
      },
    },

    // =====================
    // ADVANCED JOB MANAGEMENT
    // =====================
    '/jobs/{id}/complete': {
      post: {
        tags: ['Jobs'],
        summary: 'Complete job',
        description: 'Mark job as complete and submit for approval',
        operationId: 'completeJob',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['completion_photos'],
                properties: {
                  completion_photos: {
                    type: 'array',
                    items: { type: 'string', format: 'uri' },
                    description: 'URLs of completion photos',
                  },
                  notes: { type: 'string', maxLength: 2000 },
                  actual_duration_hours: { type: 'number', minimum: 0 },
                  issues_encountered: { type: 'string', maxLength: 1000 },
                  additional_work_needed: { type: 'boolean' },
                  customer_satisfaction_rating: { type: 'integer', minimum: 1, maximum: 5 },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Job marked as complete',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    completion_id: { type: 'string', format: 'uuid' },
                    status: { type: 'string', enum: ['pending_approval', 'approved'] },
                    requires_approval: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/jobs/{id}/complete/approve': {
      post: {
        tags: ['Jobs'],
        summary: 'Approve job completion',
        description: 'Approve completed job (admin/supervisor only)',
        operationId: 'approveJobCompletion',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  approval_notes: { type: 'string', maxLength: 1000 },
                  variance_approved: { type: 'boolean' },
                  generate_invoice: { type: 'boolean', default: true },
                  send_feedback_survey: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Job completion approved' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/jobs/{id}/complete/reject': {
      post: {
        tags: ['Jobs'],
        summary: 'Reject job completion',
        description: 'Reject completed job and return to in-progress',
        operationId: 'rejectJobCompletion',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['rejection_reason'],
                properties: {
                  rejection_reason: { type: 'string', maxLength: 1000 },
                  required_actions: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Job completion rejected' },
        },
      },
    },
    '/jobs/{id}/time-entries': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job time entries',
        operationId: 'getJobTimeEntries',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Time entries for job',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    time_entries: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          profile_id: { type: 'string', format: 'uuid' },
                          entry_type: { type: 'string', enum: ['regular', 'overtime', 'travel', 'setup', 'cleanup'] },
                          start_time: { type: 'string', format: 'date-time' },
                          end_time: { type: 'string', format: 'date-time' },
                          hours: { type: 'number' },
                          hourly_rate: { type: 'number' },
                          total_cost: { type: 'number' },
                          notes: { type: 'string' },
                          approved: { type: 'boolean' },
                        },
                      },
                    },
                    total_hours: { type: 'number' },
                    total_cost: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Jobs'],
        summary: 'Add time entry',
        operationId: 'addJobTimeEntry',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['profile_id', 'entry_type', 'start_time', 'end_time'],
                properties: {
                  profile_id: { type: 'string', format: 'uuid' },
                  entry_type: { type: 'string', enum: ['regular', 'overtime', 'travel', 'setup', 'cleanup'] },
                  start_time: { type: 'string', format: 'date-time' },
                  end_time: { type: 'string', format: 'date-time' },
                  notes: { type: 'string', maxLength: 500 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Time entry added' },
        },
      },
    },
    '/jobs/{id}/photos': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job photos',
        operationId: 'getJobPhotos',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'category', in: 'query', schema: { type: 'string', enum: ['before', 'during', 'after', 'equipment', 'damage'] } },
        ],
        responses: {
          '200': {
            description: 'Job photos',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    photos: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          url: { type: 'string', format: 'uri' },
                          category: { type: 'string' },
                          caption: { type: 'string' },
                          taken_at: { type: 'string', format: 'date-time' },
                          gps_coordinates: { type: 'string' },
                          uploaded_by: { type: 'string', format: 'uuid' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Jobs'],
        summary: 'Upload job photo',
        operationId: 'uploadJobPhoto',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['photo'],
                properties: {
                  photo: { type: 'string', format: 'binary' },
                  category: { type: 'string', enum: ['before', 'during', 'after', 'equipment', 'damage'] },
                  caption: { type: 'string', maxLength: 200 },
                  gps_coordinates: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Photo uploaded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    photo_id: { type: 'string', format: 'uuid' },
                    url: { type: 'string', format: 'uri' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/jobs/{id}/materials': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job materials',
        operationId: 'getJobMaterials',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Materials assigned to job',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    materials: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          quantity_allocated: { type: 'number' },
                          quantity_used: { type: 'number' },
                          unit: { type: 'string' },
                          unit_cost: { type: 'number' },
                          total_cost: { type: 'number' },
                          supplier: { type: 'string' },
                        },
                      },
                    },
                    total_material_cost: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/jobs/{id}/material-usage': {
      post: {
        tags: ['Jobs'],
        summary: 'Record material usage',
        operationId: 'recordMaterialUsage',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['material_id', 'quantity_used'],
                properties: {
                  material_id: { type: 'string', format: 'uuid' },
                  quantity_used: { type: 'number', minimum: 0 },
                  notes: { type: 'string', maxLength: 500 },
                  waste_percentage: { type: 'number', minimum: 0, maximum: 100 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Material usage recorded' },
        },
      },
    },

    // =====================
    // WEBHOOKS (External)
    // =====================
    '/webhooks/stripe': {
      post: {
        tags: ['Webhooks'],
        summary: 'Stripe webhook handler',
        description: 'Handle Stripe payment and subscription events',
        operationId: 'handleStripeWebhook',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Stripe webhook event payload',
              },
            },
          },
        },
        responses: {
          '200': { description: 'Webhook processed successfully' },
          '400': { description: 'Invalid webhook signature or payload' },
        },
      },
    },
    '/webhooks/twilio/inbound': {
      post: {
        tags: ['Webhooks'],
        summary: 'Twilio inbound SMS webhook',
        description: 'Handle incoming SMS messages from Twilio',
        operationId: 'handleTwilioInbound',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  From: { type: 'string', description: 'Sender phone number' },
                  To: { type: 'string', description: 'Recipient phone number' },
                  Body: { type: 'string', description: 'Message content' },
                  MessageSid: { type: 'string', description: 'Twilio message ID' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'SMS processed',
            content: {
              'application/xml': {
                schema: {
                  type: 'string',
                  description: 'TwiML response',
                },
              },
            },
          },
        },
      },
    },
    '/webhooks/twilio/status': {
      post: {
        tags: ['Webhooks'],
        summary: 'Twilio SMS status webhook',
        description: 'Handle SMS delivery status updates from Twilio',
        operationId: 'handleTwilioStatus',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/x-www-form-urlencoded': {
              schema: {
                type: 'object',
                properties: {
                  MessageSid: { type: 'string' },
                  MessageStatus: { type: 'string', enum: ['sent', 'delivered', 'undelivered', 'failed'] },
                  ErrorCode: { type: 'string' },
                  ErrorMessage: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Status update processed' },
        },
      },
    },

    // =====================
    // CUSTOMER SEGMENTS
    // =====================
    '/segments': {
      get: {
        tags: ['Segments'],
        summary: 'List customer segments',
        description: 'Get all customer segments for the organization',
        operationId: 'listSegments',
        responses: {
          '200': {
            description: 'List of segments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    segments: { type: 'array', items: { $ref: '#/components/schemas/Segment' } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Segments'],
        summary: 'Create customer segment',
        description: 'Create a new customer segment with criteria',
        operationId: 'createSegment',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSegment' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Segment created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    segment: { $ref: '#/components/schemas/Segment' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/segments/{id}': {
      get: {
        tags: ['Segments'],
        summary: 'Get segment',
        description: 'Get a specific customer segment by ID',
        operationId: 'getSegment',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Segment details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    segment: { $ref: '#/components/schemas/Segment' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Segments'],
        summary: 'Update segment',
        description: 'Update an existing customer segment',
        operationId: 'updateSegment',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateSegment' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Segment updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    segment: { $ref: '#/components/schemas/Segment' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Segments'],
        summary: 'Delete segment',
        description: 'Delete a customer segment',
        operationId: 'deleteSegment',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Segment deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/segments/{id}/calculate': {
      post: {
        tags: ['Segments'],
        summary: 'Calculate segment members',
        description: 'Recalculate the number of customers in this segment',
        operationId: 'calculateSegmentMembers',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Segment calculation completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    member_count: { type: 'integer' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/segments/{id}/sync/mailchimp': {
      post: {
        tags: ['Segments'],
        summary: 'Sync segment to Mailchimp',
        description: 'Sync segment members to a Mailchimp list',
        operationId: 'syncSegmentToMailchimp',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['list_id'],
                properties: {
                  list_id: { type: 'string', description: 'Mailchimp list ID' },
                  create_list: { type: 'boolean', default: false, description: 'Create new list if not exists' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sync completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    synced_count: { type: 'integer' },
                    failed_count: { type: 'integer' },
                    mailchimp_list_id: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/segments/{id}/sync/hubspot': {
      post: {
        tags: ['Segments'],
        summary: 'Sync segment to HubSpot',
        description: 'Sync segment members to a HubSpot list',
        operationId: 'syncSegmentToHubSpot',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  list_name: { type: 'string', description: 'HubSpot list name' },
                  create_list: { type: 'boolean', default: true },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Sync completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    synced_count: { type: 'integer' },
                    failed_count: { type: 'integer' },
                    hubspot_list_id: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // =====================
    // TEAM MANAGEMENT
    // =====================
    '/invitations': {
      get: {
        tags: ['Team'],
        summary: 'List team invitations',
        description: 'Get all pending and completed team invitations',
        operationId: 'listInvitations',
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'accepted', 'expired', 'revoked'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
        ],
        responses: {
          '200': {
            description: 'List of invitations',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    invitations: { type: 'array', items: { $ref: '#/components/schemas/TeamInvitation' } },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Team'],
        summary: 'Invite team member',
        description: 'Send invitation to join the organization',
        operationId: 'inviteTeamMember',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateInvitation' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Invitation sent',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    invitation: { $ref: '#/components/schemas/TeamInvitation' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/invitations/{id}': {
      get: {
        tags: ['Team'],
        summary: 'Get invitation',
        description: 'Get details of a specific invitation',
        operationId: 'getInvitation',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Invitation details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    invitation: { $ref: '#/components/schemas/TeamInvitation' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      patch: {
        tags: ['Team'],
        summary: 'Update invitation',
        description: 'Update invitation status (revoke, resend)',
        operationId: 'updateInvitation',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  action: { type: 'string', enum: ['revoke', 'resend'] },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Invitation updated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    invitation: { $ref: '#/components/schemas/TeamInvitation' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Team'],
        summary: 'Delete invitation',
        description: 'Delete/revoke a team invitation',
        operationId: 'deleteInvitation',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Invitation deleted',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/team': {
      get: {
        tags: ['Team'],
        summary: 'List team members',
        description: 'Get all team members in the organization',
        operationId: 'listTeamMembers',
        parameters: [
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['admin', 'estimator', 'technician', 'viewer'] } },
          { name: 'active_only', in: 'query', schema: { type: 'boolean', default: true } },
        ],
        responses: {
          '200': {
            description: 'List of team members',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    team_members: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          email: { type: 'string', format: 'email' },
                          first_name: { type: 'string' },
                          last_name: { type: 'string' },
                          role: { type: 'string' },
                          is_active: { type: 'boolean' },
                          last_login_at: { type: 'string', format: 'date-time', nullable: true },
                          created_at: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    total: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // =====================
    // ADVANCED REPORTING
    // =====================
    '/reports/scheduled': {
      get: {
        tags: ['Reports'],
        summary: 'List scheduled reports',
        description: 'Get all scheduled/recurring reports',
        operationId: 'listScheduledReports',
        responses: {
          '200': {
            description: 'List of scheduled reports',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    scheduled_reports: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          report_type: { type: 'string' },
                          schedule: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                          recipients: { type: 'array', items: { type: 'string', format: 'email' } },
                          last_run_at: { type: 'string', format: 'date-time', nullable: true },
                          next_run_at: { type: 'string', format: 'date-time' },
                          is_active: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Reports'],
        summary: 'Schedule report',
        description: 'Create a scheduled/recurring report',
        operationId: 'scheduleReport',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'report_type', 'schedule', 'recipients'],
                properties: {
                  name: { type: 'string', maxLength: 255 },
                  report_type: { type: 'string', enum: ['revenue', 'jobs', 'customers', 'performance'] },
                  schedule: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
                  recipients: { type: 'array', items: { type: 'string', format: 'email' } },
                  config: { $ref: '#/components/schemas/ReportConfig' },
                  format: { type: 'string', enum: ['csv', 'pdf', 'xlsx'], default: 'pdf' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Scheduled report created' },
        },
      },
    },

    // =====================
    // PORTAL & PUBLIC ACCESS
    // =====================
    '/portal/proposal/{token}': {
      get: {
        tags: ['Portal'],
        summary: 'Get proposal (public)',
        description: 'Public endpoint to view proposal with token',
        operationId: 'getPublicProposal',
        security: [],
        parameters: [
          { name: 'token', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Proposal details for customer portal',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    proposal: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        proposal_number: { type: 'string' },
                        customer_name: { type: 'string' },
                        project_name: { type: 'string' },
                        total_amount: { type: 'number' },
                        status: { type: 'string' },
                        valid_until: { type: 'string', format: 'date' },
                        cover_letter: { type: 'string' },
                        terms_and_conditions: { type: 'string' },
                        line_items: { type: 'array', items: { type: 'object' } },
                        can_sign: { type: 'boolean' },
                      },
                    },
                    organization: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        logo_url: { type: 'string', format: 'uri' },
                        contact_info: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '410': {
            description: 'Proposal expired',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/portal/proposal/{token}/sign': {
      post: {
        tags: ['Portal'],
        summary: 'Sign proposal (public)',
        description: 'Public endpoint to electronically sign proposal',
        operationId: 'signPublicProposal',
        security: [],
        parameters: [
          { name: 'token', in: 'path', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['signature_name', 'signature_date'],
                properties: {
                  signature_name: { type: 'string', maxLength: 255 },
                  signature_date: { type: 'string', format: 'date' },
                  title: { type: 'string', maxLength: 100 },
                  ip_address: { type: 'string' },
                  user_agent: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Proposal signed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    signed_at: { type: 'string', format: 'date-time' },
                    next_steps: { type: 'string' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '410': { description: 'Proposal expired or already signed' },
        },
      },
    },

    // (Duplicate /platform/stats and /platform/organizations removed - see originals above)

    '/platform/_stats-dedup': {
      get: {
        tags: ['Platform'],
        summary: 'DUPLICATE REMOVED',
        description: 'Platform admin only - get overall platform metrics and KPIs',
        operationId: 'getPlatformStatsDedup',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Platform statistics and metrics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    stats: {
                      type: 'object',
                      properties: {
                        total_organizations: { type: 'integer' },
                        active_organizations: { type: 'integer' },
                        total_users: { type: 'integer' },
                        active_users: { type: 'integer' },
                        total_jobs: { type: 'integer' },
                        total_revenue: { type: 'number' },
                        monthly_recurring_revenue: { type: 'number' },
                        churn_rate: { type: 'number' },
                      },
                    },
                    growth: {
                      type: 'object',
                      properties: {
                        organizations_growth: { type: 'number', description: 'Month over month growth %' },
                        users_growth: { type: 'number' },
                        revenue_growth: { type: 'number' },
                        jobs_growth: { type: 'number' },
                      },
                    },
                    planDistribution: {
                      type: 'object',
                      properties: {
                        starter: { type: 'integer' },
                        professional: { type: 'integer' },
                        enterprise: { type: 'integer' },
                        trial: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },
    '/platform/organizations/list': {
      get: {
        tags: ['Platform'],
        summary: 'List all organizations (paginated)',
        description: 'Platform admin only - get all organizations with filtering and pagination',
        operationId: 'listAllOrganizationsPaginated',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by organization name' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'suspended'] } },
          { name: 'planSlug', in: 'query', schema: { type: 'string', enum: ['starter', 'professional', 'enterprise'] } },
          { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['created_at', 'name', 'user_count', 'mrr'] } },
          { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
        ],
        responses: {
          '200': {
            description: 'List of organizations with pagination',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    organizations: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          name: { type: 'string' },
                          slug: { type: 'string' },
                          status: { type: 'string', enum: ['active', 'inactive', 'suspended'] },
                          subscription_tier: { type: 'string' },
                          user_count: { type: 'integer' },
                          job_count: { type: 'integer' },
                          monthly_revenue: { type: 'number' },
                          created_at: { type: 'string', format: 'date-time' },
                          last_activity_at: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        total: { type: 'integer' },
                        page: { type: 'integer' },
                        limit: { type: 'integer' },
                        total_pages: { type: 'integer' },
                        has_next: { type: 'boolean' },
                        has_prev: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          '403': { $ref: '#/components/responses/Forbidden' },
        },
      },
    },

    // =====================
    // UTILITY & MISCELLANEOUS ENDPOINTS
    // =====================
    '/onboard/complete': {
      post: {
        tags: ['Onboarding'],
        summary: 'Complete organization onboarding',
        description: 'Complete the onboarding process for a new organization',
        operationId: 'completeOnboarding',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['organization_name'],
                properties: {
                  organization_name: { type: 'string', minLength: 1, maxLength: 255 },
                  organization_slug: { type: 'string', pattern: '^[a-z0-9-]+$' },
                  business_type: { type: 'string', enum: ['asbestos', 'mold', 'lead', 'multi_hazard'] },
                  employee_count: { type: 'string', enum: ['1-5', '6-20', '21-50', '51-100', '100+'] },
                  phone: { type: 'string' },
                  address: {
                    type: 'object',
                    properties: {
                      line1: { type: 'string' },
                      line2: { type: 'string' },
                      city: { type: 'string' },
                      state: { type: 'string' },
                      zip: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Onboarding completed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    organization: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        slug: { type: 'string' },
                      },
                    },
                    next_steps: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/cron/appointment-reminders': {
      post: {
        tags: ['Cron'],
        summary: 'Send appointment reminders',
        description: 'Scheduled job to send SMS appointment reminders (internal use)',
        operationId: 'sendAppointmentReminders',
        security: [],
        responses: {
          '200': {
            description: 'Reminders processed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    processed_count: { type: 'integer' },
                    sent_count: { type: 'integer' },
                    failed_count: { type: 'integer' },
                    errors: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/invoices/from-job': {
      post: {
        tags: ['Invoices'],
        summary: 'Create invoice from job',
        description: 'Generate invoice automatically from completed job',
        operationId: 'createInvoiceFromJob',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['job_id'],
                properties: {
                  job_id: { type: 'string', format: 'uuid' },
                  due_date: { type: 'string', format: 'date' },
                  payment_terms: { type: 'string', maxLength: 500 },
                  notes: { type: 'string', maxLength: 2000 },
                  include_time_entries: { type: 'boolean', default: true },
                  include_materials: { type: 'boolean', default: true },
                  include_photos: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Invoice created from job',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    invoice: { $ref: '#/components/schemas/Invoice' },
                  },
                },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '404': { description: 'Job not found or not completed' },
        },
      },
    },
    '/invoices/stats': {
      get: {
        tags: ['Invoices'],
        summary: 'Get invoice statistics',
        description: 'Get invoice metrics and statistics for dashboard',
        operationId: 'getInvoiceStats',
        parameters: [
          { name: 'period', in: 'query', schema: { type: 'string', enum: ['7d', '30d', '90d', '1y'], default: '30d' } },
        ],
        responses: {
          '200': {
            description: 'Invoice statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total_invoices: { type: 'integer' },
                    total_amount: { type: 'number' },
                    paid_amount: { type: 'number' },
                    outstanding_amount: { type: 'number' },
                    overdue_amount: { type: 'number' },
                    average_days_to_pay: { type: 'number' },
                    payment_rate: { type: 'number', description: 'Percentage of invoices paid' },
                    status_breakdown: {
                      type: 'object',
                      properties: {
                        draft: { type: 'integer' },
                        sent: { type: 'integer' },
                        paid: { type: 'integer' },
                        overdue: { type: 'integer' },
                        void: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/jobs/available-crew': {
      get: {
        tags: ['Jobs'],
        summary: 'Get available crew members',
        description: 'Get crew members available for job assignment',
        operationId: 'getAvailableCrew',
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Check availability for specific date' },
          { name: 'skills', in: 'query', schema: { type: 'array', items: { type: 'string' } }, description: 'Required skills/certifications' },
        ],
        responses: {
          '200': {
            description: 'Available crew members',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    available_crew: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          first_name: { type: 'string' },
                          last_name: { type: 'string' },
                          role: { type: 'string' },
                          skills: { type: 'array', items: { type: 'string' } },
                          hourly_rate: { type: 'number' },
                          availability_score: { type: 'number', description: 'Availability rating 0-1' },
                          current_jobs: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/jobs/{id}/notes': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job notes',
        description: 'Get all notes and comments for a job',
        operationId: 'getJobNotes',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Job notes and comments',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    notes: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          content: { type: 'string' },
                          note_type: { type: 'string', enum: ['general', 'safety', 'customer', 'internal'] },
                          created_by: { type: 'string', format: 'uuid' },
                          created_by_name: { type: 'string' },
                          created_at: { type: 'string', format: 'date-time' },
                          is_private: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Jobs'],
        summary: 'Add job note',
        description: 'Add a note or comment to a job',
        operationId: 'addJobNote',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['content'],
                properties: {
                  content: { type: 'string', maxLength: 2000 },
                  note_type: { type: 'string', enum: ['general', 'safety', 'customer', 'internal'], default: 'general' },
                  is_private: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Note added successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    note_id: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/jobs/{id}/change-orders': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job change orders',
        description: 'Get all change orders for a job',
        operationId: 'getJobChangeOrders',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Job change orders',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    change_orders: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          description: { type: 'string' },
                          amount: { type: 'number' },
                          status: { type: 'string', enum: ['pending', 'approved', 'rejected'] },
                          requested_by: { type: 'string', format: 'uuid' },
                          approved_by: { type: 'string', format: 'uuid', nullable: true },
                          created_at: { type: 'string', format: 'date-time' },
                        },
                      },
                    },
                    total_change_amount: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Jobs'],
        summary: 'Create change order',
        description: 'Request a change order for additional work',
        operationId: 'createChangeOrder',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['description', 'amount'],
                properties: {
                  description: { type: 'string', maxLength: 1000 },
                  amount: { type: 'number', minimum: 0 },
                  reason: { type: 'string', maxLength: 500 },
                  line_items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        description: { type: 'string' },
                        quantity: { type: 'number' },
                        unit_price: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Change order created' },
        },
      },
    },
    '/jobs/{id}/checklist': {
      get: {
        tags: ['Jobs'],
        summary: 'Get job checklist',
        description: 'Get completion checklist for a job',
        operationId: 'getJobChecklist',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Job completion checklist',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    checklist_items: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          description: { type: 'string' },
                          category: { type: 'string', enum: ['safety', 'quality', 'cleanup', 'documentation'] },
                          is_required: { type: 'boolean' },
                          is_completed: { type: 'boolean' },
                          completed_by: { type: 'string', format: 'uuid', nullable: true },
                          completed_at: { type: 'string', format: 'date-time', nullable: true },
                          notes: { type: 'string', nullable: true },
                        },
                      },
                    },
                    completion_percentage: { type: 'number' },
                    required_items_completed: { type: 'boolean' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
}
