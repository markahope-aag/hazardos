# HazardOS Quick API Reference

**Fast reference for all API endpoints in HazardOS**

> **Last Updated**: February 2, 2026  
> **Base URL**: `https://hazardos.app/api`  
> **Authentication**: Bearer token required for all endpoints

---

## Core Business Entities

### 👥 Customers
```
GET    /api/customers              # List customers with filters
POST   /api/customers              # Create customer
GET    /api/customers/[id]         # Get customer details
PATCH  /api/customers/[id]         # Update customer
DELETE /api/customers/[id]         # Delete customer
GET    /api/customers/[id]/contacts # List customer contacts
POST   /api/customers/[id]/contacts # Add contact
```

### 📋 Site Surveys
```
GET    /api/site-surveys           # List site surveys
POST   /api/site-surveys           # Create site survey
GET    /api/site-surveys/[id]      # Get survey details
PATCH  /api/site-surveys/[id]      # Update survey
DELETE /api/site-surveys/[id]      # Delete survey
```

### 💰 Estimates
```
GET    /api/estimates              # List estimates
POST   /api/estimates              # Create estimate
GET    /api/estimates/[id]         # Get estimate details
PATCH  /api/estimates/[id]         # Update estimate
DELETE /api/estimates/[id]         # Delete estimate
POST   /api/estimates/[id]/approve # Approve estimate
GET    /api/estimates/[id]/line-items # Get line items
POST   /api/estimates/[id]/line-items # Add line item
```

### 📄 Proposals
```
GET    /api/proposals              # List proposals
POST   /api/proposals              # Create proposal
GET    /api/proposals/[id]         # Get proposal details
PATCH  /api/proposals/[id]         # Update proposal
POST   /api/proposals/sign         # Sign proposal (customer portal)
POST   /api/proposals/generate     # Generate PDF
```

### 🔨 Jobs
```
GET    /api/jobs                   # List jobs with filters
POST   /api/jobs                   # Create job
GET    /api/jobs/[id]              # Get job details
PATCH  /api/jobs/[id]              # Update job
DELETE /api/jobs/[id]              # Delete job
POST   /api/jobs/from-proposal     # Create job from signed proposal
GET    /api/jobs/calendar          # Calendar view
GET    /api/jobs/available-crew    # Available crew members

# Job Sub-Resources
GET    /api/jobs/[id]/time-entries    # Time tracking
POST   /api/jobs/[id]/time-entries    # Add time entry
GET    /api/jobs/[id]/materials       # Material usage
POST   /api/jobs/[id]/materials       # Record material usage
GET    /api/jobs/[id]/equipment       # Equipment usage
POST   /api/jobs/[id]/equipment       # Record equipment usage
GET    /api/jobs/[id]/disposal        # Disposal tracking
POST   /api/jobs/[id]/disposal        # Record disposal
GET    /api/jobs/[id]/photos          # Job photos
POST   /api/jobs/[id]/photos          # Upload photo
GET    /api/jobs/[id]/checklist       # Completion checklist
PATCH  /api/jobs/[id]/checklist       # Update checklist
POST   /api/jobs/[id]/complete        # Mark job complete
GET    /api/jobs/[id]/crew            # Crew assignments
POST   /api/jobs/[id]/crew            # Assign crew
GET    /api/jobs/[id]/notes           # Job notes
POST   /api/jobs/[id]/notes           # Add note
PATCH  /api/jobs/[id]/status          # Update status
```

### 🧾 Invoices
```
GET    /api/invoices               # List invoices
POST   /api/invoices               # Create invoice
GET    /api/invoices/[id]          # Get invoice details
PATCH  /api/invoices/[id]          # Update invoice
DELETE /api/invoices/[id]          # Delete invoice
POST   /api/invoices/[id]/send     # Send invoice to customer
POST   /api/invoices/[id]/payments # Record payment
POST   /api/invoices/[id]/void     # Void invoice
GET    /api/invoices/[id]/line-items # Get line items
POST   /api/invoices/[id]/line-items # Add line item
GET    /api/invoices/stats         # Invoice statistics
POST   /api/invoices/from-job      # Create invoice from job
```

---

## Sales & Marketing

### 🎯 Sales Pipeline
```
GET    /api/pipeline               # Get pipeline data
POST   /api/pipeline               # Create opportunity
GET    /api/pipeline/[id]          # Get opportunity details
PATCH  /api/pipeline/[id]          # Update opportunity
DELETE /api/pipeline/[id]          # Delete opportunity
GET    /api/pipeline/stages        # List pipeline stages
```

### 💼 Commissions
```
GET    /api/commissions            # List commission earnings
POST   /api/commissions            # Create commission earning
GET    /api/commissions/[id]       # Get commission details
PATCH  /api/commissions/[id]       # Update commission
GET    /api/commissions/plans      # List commission plans
POST   /api/commissions/plans      # Create commission plan
GET    /api/commissions/summary    # Commission summary
```

### ✅ Approvals
```
GET    /api/approvals              # List approval requests
POST   /api/approvals              # Create approval request
GET    /api/approvals/[id]         # Get approval details
PATCH  /api/approvals/[id]         # Process approval
GET    /api/approvals/pending      # Pending approvals for user
```

### 📊 Customer Segmentation
```
GET    /api/segments               # List segments
POST   /api/segments               # Create segment
GET    /api/segments/[id]          # Get segment details
PATCH  /api/segments/[id]          # Update segment
DELETE /api/segments/[id]          # Delete segment
GET    /api/segments/[id]/customers # Get customers in segment
```

---

## Communications & Feedback

### 📱 SMS
```
POST   /api/sms/send               # Send SMS message
GET    /api/sms/messages           # List SMS messages
GET    /api/sms/settings           # Get SMS settings
PATCH  /api/sms/settings           # Update SMS settings
GET    /api/sms/templates          # List SMS templates
POST   /api/sms/templates          # Create SMS template
```

### 🔔 Notifications
```
GET    /api/notifications          # List notifications
POST   /api/notifications          # Create notification
GET    /api/notifications/count    # Unread count
PATCH  /api/notifications/[id]     # Mark as read
POST   /api/notifications/read-all # Mark all as read
GET    /api/notifications/preferences # Get preferences
PATCH  /api/notifications/preferences # Update preferences
```

### ⭐ Customer Feedback
```
GET    /api/feedback               # List feedback surveys
POST   /api/feedback               # Create feedback survey
GET    /api/feedback/[id]          # Get feedback details
PATCH  /api/feedback/[id]          # Update feedback
POST   /api/feedback/[token]       # Submit feedback (public)
GET    /api/feedback/stats         # Feedback statistics
GET    /api/feedback/testimonials  # List testimonials
PATCH  /api/feedback/testimonials  # Approve testimonial
```

---

## Reporting & Analytics

### 📈 Analytics
```
GET    /api/analytics/jobs-by-status # Job distribution
GET    /api/analytics/revenue        # Revenue analytics
GET    /api/analytics/variance       # Variance analysis
```

### 📊 Reports
```
GET    /api/reports                # List reports
POST   /api/reports                # Create report
GET    /api/reports/[id]           # Get report details
GET    /api/reports/[type]         # Generate report by type
POST   /api/reports/export         # Export report
```

---

## Settings & Configuration

### 💰 Pricing Settings
```
GET    /api/settings/pricing       # Get pricing configuration
PATCH  /api/settings/pricing       # Update pricing
GET    /api/settings/pricing/labor-rates    # Labor rates
POST   /api/settings/pricing/labor-rates    # Add labor rate
GET    /api/settings/pricing/travel-rates   # Travel rates
PATCH  /api/settings/pricing/travel-rates   # Update travel rates
GET    /api/settings/pricing/material-costs # Material costs
POST   /api/settings/pricing/material-costs # Add material cost
GET    /api/settings/pricing/equipment-rates # Equipment rates
POST   /api/settings/pricing/equipment-rates # Add equipment rate
GET    /api/settings/pricing/disposal-fees  # Disposal fees
POST   /api/settings/pricing/disposal-fees  # Add disposal fee
```

---

## Integrations

### 📚 QuickBooks
```
GET    /api/integrations/quickbooks/auth     # OAuth URL
GET    /api/integrations/quickbooks/callback # OAuth callback
GET    /api/integrations/quickbooks/status   # Connection status
POST   /api/integrations/quickbooks/sync-customers # Sync customers
POST   /api/integrations/quickbooks/sync-invoices  # Sync invoices
```

### 📧 Marketing Integrations
```
GET    /api/integrations/mailchimp/auth      # Mailchimp OAuth
GET    /api/integrations/mailchimp/lists    # Get lists
POST   /api/integrations/mailchimp/sync     # Sync contacts

GET    /api/integrations/hubspot/auth       # HubSpot OAuth
POST   /api/integrations/hubspot/sync       # Sync contacts

GET    /api/integrations/google-calendar/auth    # Google Calendar OAuth
GET    /api/integrations/google-calendar/events # Get events
POST   /api/integrations/google-calendar/sync   # Sync events

GET    /api/integrations/outlook-calendar/auth   # Outlook OAuth
POST   /api/integrations/outlook-calendar/sync  # Sync events
```

---

## Billing & Subscriptions

### 💳 Stripe Billing
```
POST   /api/billing/checkout       # Create checkout session
GET    /api/billing/subscription   # Get subscription details
PATCH  /api/billing/subscription   # Update subscription
GET    /api/billing/portal         # Customer portal URL
GET    /api/billing/plans          # List subscription plans
GET    /api/billing/features       # Check feature availability
GET    /api/billing/invoices       # List Stripe invoices
```

---

## AI & Automation

### 🤖 AI Services
```
POST   /api/ai/estimate            # Generate AI estimate
POST   /api/ai/photo-analysis      # Analyze photos for hazards
POST   /api/ai/voice/transcribe    # Transcribe voice to text
```

### ⏰ Cron Jobs
```
GET    /api/cron/appointment-reminders # Send appointment reminders
```

---

## Webhooks

### 🔗 Webhook Endpoints
```
POST   /api/webhooks/stripe        # Stripe webhook events
POST   /api/webhooks/twilio/status # Twilio delivery status
POST   /api/webhooks/twilio/inbound # Inbound SMS messages
GET    /api/webhooks/[id]          # Get webhook details
```

---

## Platform Administration

### 🏢 Platform Management
```
GET    /api/platform/organizations # List organizations
GET    /api/platform/stats         # Platform statistics
```

### 📝 Activity Logging
```
GET    /api/activity               # List activities
POST   /api/activity/manual        # Log manual activity
```

---

## Public Endpoints

### 🌐 Customer Portal
```
GET    /api/portal/proposal        # View proposal (public)
POST   /api/portal/proposal/sign   # Sign proposal (public)
```

### 📋 Lead Capture
```
POST   /api/leads/webhook/[slug]   # Lead provider webhook
GET    /api/leads/webhook/[slug]   # Webhook verification
```

### 🔧 System
```
GET    /api/openapi                # OpenAPI specification
POST   /api/errors/report          # Error reporting
```

---

## API Versioning

### v1 API (External)
```
GET    /api/v1/customers           # List customers (API key auth)
POST   /api/v1/customers           # Create customer (API key auth)
GET    /api/v1/jobs                # List jobs (API key auth)
POST   /api/v1/jobs                # Create job (API key auth)
GET    /api/v1/estimates           # List estimates (API key auth)
GET    /api/v1/invoices            # List invoices (API key auth)
```

---

## Authentication & Rate Limiting

- **Authentication**: All endpoints require Bearer token except public endpoints
- **Rate Limiting**: Applied to all endpoints (general: 100/min, public: 20/min, strict: 10/min)
- **Multi-tenant**: All data automatically filtered by organization via RLS
- **Error Handling**: Consistent error responses with secure error messages

---

## Response Format

**Success Response**:
```json
{
  "data": {...},
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 25,
    "pages": 4
  }
}
```

**Error Response**:
```json
{
  "error": "User-friendly error message",
  "type": "ERROR_TYPE"
}
```

---

**Total Endpoints**: 140+ API routes covering complete business workflow