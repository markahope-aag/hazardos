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
        enum: ['lead', 'prospect', 'customer', 'inactive'],
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
        enum: ['draft', 'pending_review', 'approved', 'sent', 'accepted', 'rejected', 'expired'],
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
  },
}
