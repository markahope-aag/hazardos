# HazardOS Architecture

**Comprehensive technical architecture documentation for the HazardOS platform**

> **Last Updated**: April 7, 2026  
> **Version**: 0.2.2  
> **Status**: ✅ Current (Post-Audit Update)

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Application Architecture](#application-architecture)
4. [Database Architecture](#database-architecture)
5. [Security Architecture](#security-architecture)
6. [API Architecture](#api-architecture)
7. [Frontend Architecture](#frontend-architecture)
8. [Data Flow](#data-flow)
9. [Deployment Architecture](#deployment-architecture)
10. [Scalability Considerations](#scalability-considerations)

---

## System Overview

HazardOS is a multi-tenant SaaS platform built for environmental remediation companies to manage site surveys, estimates, jobs, invoicing, and customer relationships.

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         Client Layer                           │
│  ┌──────────────────┐    ┌──────────────────┐                 │
│  │  Mobile PWA      │    │  Desktop Web     │                 │
│  │  (Field Workers) │    │  (Office Staff)  │                 │
│  └────────┬─────────┘    └────────┬─────────┘                 │
│           │                       │                            │
│           │   Service Worker      │                            │
│           │   (Offline Cache)     │                            │
│           └───────────┬───────────┘                            │
└───────────────────────┼────────────────────────────────────────┘
                        │
                        │ HTTPS
                        ▼
┌────────────────────────────────────────────────────────────────┐
│                    Application Layer (Vercel)                  │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Next.js 16 (App Router)                     │ │
│  │  ┌────────────────────┐  ┌────────────────────┐         │ │
│  │  │  API Routes        │  │  Server Components │         │ │
│  │  │  - REST Endpoints  │  │  - SSR Pages       │         │ │
│  │  │  - Edge Functions  │  │  - Data Fetching   │         │ │
│  │  └────────────────────┘  └────────────────────┘         │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        ▼
┌────────────────────────────────────────────────────────────────┐
│                      Data Layer (Supabase)                     │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              PostgreSQL Database                         │ │
│  │  - Multi-tenant tables with RLS                          │ │
│  │  - Computed columns & triggers                           │ │
│  │  - Full-text search indexes                              │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Authentication                              │ │
│  │  - JWT-based auth                                        │ │
│  │  - Role-based access control                             │ │
│  │  - Session management                                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │              Storage                                     │ │
│  │  - Photos & documents                                    │ │
│  │  - RLS-protected buckets                                 │ │
│  │  - CDN distribution                                      │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack (Updated April 2026)

### Frontend Stack

| Layer | Technology | Version | Purpose | Status |
|-------|------------|---------|---------|--------|
| **Framework** | Next.js | 16.1.6 | React framework with App Router | ✅ Latest |
| **Language** | TypeScript | 5.9.3 | Type-safe JavaScript (strict mode) | ✅ Current |
| **UI Library** | React | 19.2.4 | Component-based UI | ✅ Latest |
| **Styling** | Tailwind CSS | 4.1.18 | Utility-first CSS framework | ✅ Latest |
| **Components** | Radix UI | Latest | Accessible component primitives | ✅ Current |
| **Component Library** | shadcn/ui | Latest | Pre-built component collection | ✅ Current |
| **State Management** | Zustand | 5.0.10 | Global state management | ✅ Current |
| **Server State** | TanStack Query | 5.90.20 | Data fetching & caching | ✅ Current |
| **Forms** | React Hook Form | 7.71.1 | Form state management | ✅ Current |
| **Validation** | Zod | 4.3.6 | Schema validation | ✅ Current |
| **PWA** | @serwist/next | 9.5.6 | Progressive Web App support | ✅ Updated |

### Backend Stack

| Layer | Technology | Version | Purpose | Status |
|-------|------------|---------|---------|--------|
| **Database** | PostgreSQL | 15+ | Relational database via Supabase | ✅ Current |
| **BaaS** | Supabase | 2.93.3 | Backend services platform | ✅ Current |
| **Authentication** | Supabase Auth | 2.93.3 | User authentication & sessions | ✅ Current |
| **Storage** | Supabase Storage | 2.93.3 | File storage with CDN | ✅ Current |
| **Real-time** | Supabase Realtime | 2.93.3 | WebSocket subscriptions | ✅ Current |
| **API** | Next.js API Routes | 16.1.6 | RESTful API endpoints | ✅ Current |
| **Rate Limiting** | Upstash Redis | 1.36.1 | DoS protection | ✅ Current |
| **Payments** | Stripe | 20.3.0 | Payment processing | ✅ Current |
| **SMS** | Twilio | 5.12.0 | SMS communications | ✅ Current |
| **Email** | Resend | 6.9.1 | Transactional email | ✅ Current |

### Development & Deployment

| Layer | Technology | Purpose | Status |
|-------|------------|---------|--------|
| **Hosting** | Vercel | Edge deployment & CDN | ✅ Production |
| **Version Control** | Git | Source code management | ✅ Active |
| **Package Manager** | npm/pnpm | Dependency management | ✅ Active |
| **Linting** | ESLint | Code quality enforcement | ✅ Configured |
| **Testing** | Vitest | Unit & integration testing | ✅ Active |
| **Type Checking** | TypeScript Compiler | Static type analysis | ✅ Strict Mode |
| **Monitoring** | Sentry | Error tracking | ✅ Production |
| **Analytics** | Vercel Analytics | Performance monitoring | ✅ Production |

### ⚠️ Critical Security Alert

**23 dependency vulnerabilities identified** (1 critical, 13 high severity):
- **jsPDF**: Critical RCE vulnerability
- **axios**: High severity DoS vulnerability  
- **Next.js**: CSRF bypass and request smuggling
- **rollup, vite, tar**: Path traversal vulnerabilities

**Action Required**: Run `npm audit fix` immediately

---

## Critical Architecture Decisions

### Next.js 16: proxy.ts vs middleware.ts

**Decision**: HazardOS uses `proxy.ts` at the root — the Next.js 16 replacement for middleware.

**Why**: Next.js 16 deprecated the traditional `middleware.ts` file in favor of the new proxy system for better performance and edge compatibility.

**Implementation**:
```typescript
// proxy.ts
export async function proxy(request: NextRequest) {
  // Handle CORS first (short-circuits for OPTIONS requests)
  const corsResponse = corsMiddleware(request)
  if (corsResponse) return corsResponse

  // Continue with session management
  const response = await updateSession(request)
  
  // Auth redirects using chunked Supabase cookie names
  const hasAuthCookie = request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')
  )
  
  return response
}
```

**⚠️ Critical**: Never create a `middleware.ts` file — it will conflict and cause 404s on all routes.

### Multi-Tenant Security Architecture

**Row-Level Security (RLS)** is the foundation of multi-tenant data isolation:

```sql
-- Helper function for tenant isolation
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    SELECT organization_id INTO org_id FROM public.profiles WHERE id = auth.uid();
    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Example RLS policy
CREATE POLICY "tenant_isolation" ON customers
FOR ALL USING (organization_id = get_user_organization_id());
```

**Platform vs Tenant Access**:
- Platform users (`is_platform_user = true`) can access cross-org data
- Tenant users are restricted to their organization's data
- All queries are org-scoped at the database level

---

## Application Architecture

### Next.js 16 App Router Structure

**Critical Architecture Decision**: HazardOS uses `proxy.ts` (Next.js 16) instead of deprecated `middleware.ts`

```
app/
├── (auth)/              # Authentication routes
│   ├── login/          # Login page
│   ├── signup/         # Registration with invite support
│   ├── forgot-password/ # Password reset flow
│   └── layout.tsx      # Auth layout (no navigation)
│
├── (dashboard)/        # Main application (authenticated)
│   ├── page.tsx       # Dashboard home with analytics
│   ├── layout.tsx     # Dashboard layout with navigation
│   ├── crm/           # CRM Hub (Primary Navigation)
│   │   ├── layout.tsx # CRM sub-navigation
│   │   ├── contacts/  # Contact management (customers table)
│   │   ├── companies/ # Company accounts
│   │   ├── opportunities/ # Sales pipeline items
│   │   ├── pipeline/  # Kanban board view
│   │   └── jobs/      # Jobs within CRM context
│   ├── customers/     # Legacy customer routes
│   ├── site-surveys/  # Mobile survey wizard
│   ├── estimates/     # Estimate builder
│   ├── jobs/          # Legacy job management
│   │   ├── [id]/     # Job details
│   │   │   ├── complete/  # Job completion workflow
│   │   │   └── review/    # Job review workflow
│   ├── invoices/      # Invoice management
│   ├── calendar/      # Scheduling calendar
│   └── settings/      # Organization settings
│       ├── pricing/   # Pricing configuration
│       ├── team/      # Team management
│       └── integrations/ # Third-party integrations
│
├── (platform)/        # Platform administration
│   └── platform-admin/ # Multi-tenant management
│       ├── organizations/ # Tenant management
│       └── analytics/     # Platform-wide metrics
│
├── (public)/          # Public routes (no auth)
│   ├── feedback/     # Customer feedback surveys
│   └── proposals/    # Customer proposal review
│
└── api/              # API endpoints
    ├── v1/           # Public API (API key auth)
    │   ├── customers/ # External customer API
    │   └── companies/ # External company API
    ├── customers/    # Internal customer CRUD
    ├── companies/    # Internal company CRUD
    ├── opportunities/ # Sales pipeline API
    ├── estimates/    # Estimate CRUD
    ├── jobs/         # Job management
    │   ├── [id]/    # Job operations
    │   │   ├── checklist/      # Job checklists
    │   │   ├── complete/       # Job completion
    │   │   ├── material-usage/ # Material tracking
    │   │   ├── photos/         # Photo uploads
    │   │   └── time-entries/   # Time tracking
    ├── invoices/     # Invoice CRUD
    ├── proposals/    # Proposal generation
    ├── analytics/    # Analytics & reporting
    │   ├── variance/ # Variance analysis
    │   └── pipeline/ # Sales analytics
    ├── integrations/ # External integrations
    │   ├── quickbooks/ # QuickBooks sync
    │   ├── stripe/     # Payment processing
    │   └── twilio/     # SMS communications
    ├── feedback/     # Customer feedback
    ├── webhooks/     # Webhook handlers
    │   ├── stripe/   # Payment webhooks
    │   └── leads/    # Lead generation webhooks
    ├── cron/         # Scheduled tasks
    │   └── appointment-reminders/ # SMS reminders
    └── settings/     # Settings management

# Root-level files
proxy.ts              # Next.js 16 proxy (replaces middleware.ts)
```

### Component Architecture

```
components/
├── ui/               # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   └── ...
│
├── layout/           # Layout components
│   ├── header.tsx
│   ├── navigation.tsx
│   └── user-menu.tsx
│
├── customers/        # Customer-specific components
│   ├── CustomerForm.tsx
│   ├── CustomerList.tsx
│   └── DeleteCustomerDialog.tsx
│
├── surveys/          # Site survey components
│   └── mobile/      # Mobile survey wizard
│       ├── SurveyWizard.tsx
│       ├── photos/
│       └── sections/
│
├── assessments/      # Site survey forms
│   ├── simple-site-survey-form.tsx
│   └── media-upload.tsx
│
├── proposals/        # Proposal components
│   └── proposal-generator.tsx
│
├── dashboard/        # Dashboard widgets
│   ├── jobs-by-status.tsx
│   └── revenue-chart.tsx
│
└── error-boundary.tsx # Error handling
```

### Library Architecture

```
lib/
├── supabase/         # Database layer
│   ├── client.ts    # Client-side Supabase client
│   ├── server.ts    # Server-side Supabase client
│   ├── middleware.ts # Auth middleware
│   ├── database.ts  # Database queries
│   ├── customers.ts # Customer service
│   └── site-survey-service.ts
│
├── services/         # Business logic services
│   ├── estimate-calculator.ts
│   ├── proposal-pdf-generator.ts
│   ├── job-completion-service.ts
│   ├── feedback-service.ts
│   ├── quickbooks-service.ts
│   ├── photo-upload-service.ts
│   ├── invoices-service.ts
│   ├── jobs-service.ts
│   ├── activity-service.ts
│   └── notification-service.ts
│
├── hooks/            # Custom React hooks
│   ├── use-auth.ts
│   ├── use-multi-tenant-auth.ts
│   ├── use-customers.ts
│   ├── use-online-status.ts
│   └── use-logout.ts
│
├── stores/           # Global state (Zustand)
│   ├── survey-store.ts
│   ├── survey-types.ts
│   ├── survey-mappers.ts
│   └── photo-queue-store.ts
│
├── middleware/       # Request middleware
│   ├── unified-rate-limit.ts
│   ├── rate-limit.ts
│   └── memory-rate-limit.ts
│
├── utils/           # Utility functions
│   ├── secure-error-handler.ts
│   └── utils.ts
│
└── pdf/             # PDF generation
    └── templates/
```

---

## Database Architecture

### Multi-Tenant Design

HazardOS uses a **shared database, shared schema** multi-tenant architecture with Row Level Security (RLS) for data isolation.

#### Core Principle
All tenant data resides in shared tables, isolated by `organization_id` foreign key and enforced by PostgreSQL RLS policies.

#### Tenant Hierarchy

```
Platform
  └── Organizations (Tenants)
      ├── Users (Profiles)
      ├── Customers
      ├── Site Surveys
      ├── Estimates
      ├── Jobs
      ├── Invoices
      └── Settings
```

### Database Schema

#### Core Tables

**Organizations** (Tenants)
```sql
organizations
  - id (uuid, pk)
  - name (text)
  - status (enum: active, suspended, cancelled, trial)
  - subscription_tier (enum: trial, starter, professional, enterprise)
  - subscription_start_date (date)
  - trial_ends_at (timestamptz)
  - billing_email (text)
  - logo_url (text)
```

**Profiles** (Users)
```sql
profiles
  - id (uuid, pk, fk: auth.users)
  - organization_id (uuid, fk: organizations)
  - email (text)
  - full_name (text)
  - role (enum: platform_owner, platform_admin, tenant_owner,
          admin, estimator, technician, viewer)
  - avatar_url (text)
  - phone (text)
```

**Customers**
```sql
customers
  - id (uuid, pk)
  - organization_id (uuid, fk: organizations)
  - name (text)
  - email (text)
  - phone (text)
  - address, city, state, zip (text)
  - status (enum: lead, prospect, customer, inactive)
  - source (enum: referral, website, advertising, cold_call,
            trade_show, other)
  - marketing_consent (boolean)
  - notes (text)
```

**Site Surveys**
```sql
site_surveys
  - id (uuid, pk)
  - organization_id (uuid, fk: organizations)
  - customer_id (uuid, fk: customers)
  - site_name (text)
  - site_address (text)
  - hazard_type (enum: asbestos, mold, lead, vermiculite, other)
  - status (enum: draft, submitted, estimated, quoted,
            scheduled, completed)
  - scheduled_date (timestamptz)
  - appointment_status (enum: scheduled, confirmed, in_progress,
                         completed, cancelled, rescheduled)
  - field_data (jsonb)  # Mobile survey responses
  - location_lat, location_lng (decimal)
```

**Jobs**
```sql
jobs
  - id (uuid, pk)
  - organization_id (uuid, fk: organizations)
  - job_number (text, unique)
  - customer_id (uuid, fk: customers)
  - site_survey_id (uuid, fk: site_surveys)
  - estimate_id (uuid, fk: estimates)
  - status (enum: scheduled, in_progress, on_hold, completed,
            cancelled)
  - scheduled_start_date (date)
  - estimated_duration_hours (decimal)
  - contract_amount (decimal)
  - actual_start_date (date)
  - actual_end_date (date)
  - completion_id (uuid, fk: job_completions)
```

#### Job Completion Tables

**Job Completions**
```sql
job_completions
  - id (uuid, pk)
  - job_id (uuid, fk: jobs, unique)
  - status (enum: draft, submitted, approved, rejected)
  - estimated_hours, actual_hours (decimal)
  - hours_variance, hours_variance_percent (decimal)
  - estimated_material_cost, actual_material_cost (decimal)
  - cost_variance, cost_variance_percent (decimal)
  - field_notes, issues_encountered (text)
  - customer_signed (boolean)
  - customer_signature_data (text)
```

**Job Time Entries**
```sql
job_time_entries
  - id (uuid, pk)
  - job_id (uuid, fk: jobs)
  - profile_id (uuid, fk: profiles)
  - work_date (date)
  - hours (decimal)
  - work_type (enum: regular, overtime, travel, setup,
               cleanup, supervision)
  - hourly_rate (decimal)
  - billable (boolean)
```

**Job Material Usage**
```sql
job_material_usage
  - id (uuid, pk)
  - job_id (uuid, fk: jobs)
  - material_name (text)
  - quantity_estimated, quantity_used (decimal)
  - unit_cost (decimal)
  - total_cost (computed)
  - variance_quantity, variance_percent (computed)
```

**Job Completion Photos**
```sql
job_completion_photos
  - id (uuid, pk)
  - job_id (uuid, fk: jobs)
  - photo_url (text)
  - storage_path (text)
  - photo_type (enum: before, during, after, issue, documentation)
  - caption (text)
  - taken_at (timestamptz)
  - location_lat, location_lng (decimal)
  - camera_make, camera_model (text)
```

**Job Completion Checklists**
```sql
job_completion_checklists
  - id (uuid, pk)
  - job_id (uuid, fk: jobs)
  - category (enum: safety, quality, cleanup, documentation, custom)
  - item_name (text)
  - is_required, is_completed (boolean)
  - completed_by (uuid, fk: profiles)
  - evidence_photo_ids (uuid[])
```

#### Customer Feedback Tables

**Feedback Surveys**
```sql
feedback_surveys
  - id (uuid, pk)
  - organization_id (uuid, fk: organizations)
  - job_id (uuid, fk: jobs)
  - customer_id (uuid, fk: customers)
  - access_token (text, unique)  # For public access
  - token_expires_at (timestamptz)
  - status (enum: pending, sent, viewed, completed, expired)
  - rating_overall, rating_quality, rating_communication,
    rating_timeliness, rating_value (integer 1-5)
  - likelihood_to_recommend (integer 0-10)  # NPS
  - feedback_text, testimonial_text (text)
  - testimonial_permission, testimonial_approved (boolean)
```

**Review Requests**
```sql
review_requests
  - id (uuid, pk)
  - organization_id (uuid, fk: organizations)
  - feedback_survey_id (uuid, fk: feedback_surveys)
  - customer_id (uuid, fk: customers)
  - platform (enum: google, yelp, facebook, bbb,
              homeadvisor, angi)
  - status (enum: pending, sent, clicked, completed)
  - platform_url (text)
  - click_token (text)
```

#### Pricing Tables

**Labor Rates**
```sql
labor_rates
  - id (uuid, pk)
  - organization_id (uuid, fk: organizations)
  - role_name (text)
  - hourly_rate (decimal)
  - overtime_rate (decimal)
```

**Equipment Rates**
```sql
equipment_rates
  - id (uuid, pk)
  - organization_id (uuid, fk: organizations)
  - equipment_name (text)
  - rental_rate_type (enum: hourly, daily, weekly, monthly)
  - rate_amount (decimal)
```

**Material Costs, Disposal Fees, Travel Rates**
Similar structure with organization_id for multi-tenancy.

#### Integration Tables

**Organization Integrations**
```sql
organization_integrations
  - id (uuid, pk)
  - organization_id (uuid, fk: organizations)
  - integration_type (enum: quickbooks, stripe, mailchimp)
  - is_active (boolean)
  - credentials (jsonb, encrypted)
  - settings (jsonb)
  - last_sync_at (timestamptz)
```

**Activity Log**
```sql
activity_log
  - id (uuid, pk)
  - organization_id (uuid, fk: organizations)
  - user_id (uuid, fk: profiles)
  - action (text)
  - entity_type (text)
  - entity_id (uuid)
  - changes (jsonb)
  - ip_address (text)
```

### Database Functions

**Helper Functions**
```sql
-- Get user's organization ID
get_user_organization_id() → uuid

-- Generate feedback survey token
generate_feedback_token() → text

-- Initialize job checklist
initialize_job_checklist(job_id uuid) → void

-- Calculate completion variance
calculate_completion_variance(completion_id uuid) → void

-- Get feedback statistics
get_feedback_stats(org_id uuid) → feedback_stats
```

### Indexes

Performance indexes on:
- Foreign keys (all `organization_id`, `customer_id`, etc.)
- Search fields (`customers.name`, `jobs.job_number`)
- Status fields (`jobs.status`, `feedback_surveys.status`)
- Date ranges (`jobs.scheduled_start_date`)
- Token lookups (`feedback_surveys.access_token`)

---

## Security Architecture

### Authentication Flow

```
User Login Request
    ↓
Supabase Auth (Email/Password)
    ↓
JWT Token Issued
    ↓
Profile Lookup (organization_id, role)
    ↓
Session Stored (Cookie)
    ↓
Redirect to Dashboard
```

### Authorization Model

#### Role Hierarchy

```
Platform Roles (Cross-Organization):
  - platform_owner      # Full platform access
  - platform_admin      # Platform administration

Tenant Roles (Organization-Scoped):
  - tenant_owner        # Organization owner
  - admin               # Full organization access
  - estimator           # Create surveys, estimates
  - technician          # Job execution, time tracking
  - viewer              # Read-only access
```

#### Row Level Security (RLS)

**Policy Pattern**:
```sql
-- Example: Customers table RLS
CREATE POLICY "Users can access their org customers"
  ON customers FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());
```

**Platform Admin Override**:
```sql
-- Platform admins bypass organization filter
CREATE POLICY "Platform admins can access all customers"
  ON customers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('platform_owner', 'platform_admin')
    )
  );
```

### Security Features

#### Rate Limiting
```typescript
// Upstash Redis-based rate limiting
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10s'),
})
```

Applied to:
- API routes (general: 1000 req/hour)
- Login endpoints (stricter: 5 req/minute)
- PDF generation (100 req/hour)

#### Input Validation
```typescript
// Zod schemas for all inputs
const customerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  // ...
})
```

#### Error Handling
```typescript
// Generic errors to clients, detailed logs server-side
try {
  // operation
} catch (error) {
  logger.error('Operation failed', error)
  return { error: 'An error occurred' }  // Generic
}
```

#### Storage Security
- Private buckets with RLS policies
- Signed URLs for temporary access
- File type validation
- Size limits enforced

---

## API Architecture

### REST API Design

**Base URL**: `https://hazardos.app/api`

**Authentication**: Bearer token in Authorization header

**Response Format**:
```typescript
{
  data: T | T[],          // Success data
  pagination?: {          // For list endpoints
    total: number,
    page: number,
    limit: number,
    pages: number
  },
  error?: string          // Error message if failed
}
```

### API Endpoints

#### Customers
- `GET /api/customers` - List customers
- `POST /api/customers` - Create customer
- `GET /api/customers/[id]` - Get customer
- `PUT /api/customers/[id]` - Update customer
- `DELETE /api/customers/[id]` - Delete customer

#### Jobs
- `GET /api/jobs` - List jobs
- `POST /api/jobs` - Create job
- `GET /api/jobs/[id]` - Get job
- `PATCH /api/jobs/[id]` - Update job
- `DELETE /api/jobs/[id]` - Delete job
- `POST /api/jobs/[id]/complete` - Mark job complete
- `GET /api/jobs/[id]/time-entries` - List time entries
- `POST /api/jobs/[id]/time-entries` - Add time entry
- `GET /api/jobs/[id]/material-usage` - List material usage
- `POST /api/jobs/[id]/material-usage` - Add material usage
- `GET /api/jobs/[id]/photos` - List photos
- `POST /api/jobs/[id]/photos` - Upload photo
- `GET /api/jobs/[id]/checklist` - Get checklist
- `PATCH /api/jobs/[id]/checklist/[itemId]` - Update checklist item

#### Invoices
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/[id]` - Get invoice
- `PATCH /api/invoices/[id]` - Update invoice
- `POST /api/invoices/[id]/send` - Send invoice
- `POST /api/invoices/[id]/payments` - Record payment

#### Estimates
- `GET /api/estimates` - List estimates
- `POST /api/estimates` - Create estimate
- `GET /api/estimates/[id]` - Get estimate
- `PATCH /api/estimates/[id]` - Update estimate
- `POST /api/estimates/[id]/approve` - Approve estimate

#### Proposals
- `POST /api/proposals/generate` - Generate PDF
- `GET /api/proposals/[id]` - Get proposal
- `POST /api/proposals/[id]/send` - Send to customer

#### Analytics
- `GET /api/analytics/variance` - Variance analysis
- `GET /api/analytics/jobs-by-status` - Job status distribution
- `GET /api/analytics/revenue` - Revenue metrics

#### Feedback
- `GET /api/feedback` - List surveys (auth)
- `POST /api/feedback` - Create survey (auth)
- `GET /api/feedback/[token]` - Get survey (public)
- `POST /api/feedback/[token]` - Submit feedback (public)
- `POST /api/feedback/[id]/send` - Send survey invite
- `GET /api/feedback/stats` - Feedback statistics

#### Integrations
- `GET /api/integrations/quickbooks` - QB connection status
- `POST /api/integrations/quickbooks/connect` - Initiate OAuth
- `GET /api/integrations/quickbooks/callback` - OAuth callback
- `POST /api/integrations/quickbooks/sync/customers` - Sync customers
- `POST /api/integrations/quickbooks/sync/invoices` - Sync invoices

---

## Frontend Architecture

### React Component Patterns

#### Server Components (Default)
```typescript
// app/(dashboard)/jobs/page.tsx
export default async function JobsPage() {
  const supabase = createServerClient()
  const jobs = await supabase.from('jobs').select('*')

  return <JobsTable jobs={jobs} />
}
```

#### Client Components
```typescript
'use client'

// components/customers/CustomerForm.tsx
export default function CustomerForm({ customer }: Props) {
  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
  })

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>
}
```

### State Management

#### Server State (TanStack Query)
```typescript
const { data: jobs, isLoading } = useQuery({
  queryKey: ['jobs', filters],
  queryFn: () => fetchJobs(filters),
  staleTime: 5 * 60 * 1000,  // 5 minutes
})
```

#### Global Client State (Zustand)
```typescript
interface SurveyStore {
  currentSurvey: Survey | null
  setCurrentSurvey: (survey: Survey) => void
}

export const useSurveyStore = create<SurveyStore>((set) => ({
  currentSurvey: null,
  setCurrentSurvey: (survey) => set({ currentSurvey: survey }),
}))
```

#### Form State (React Hook Form)
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: 'onChange',
})
```

### PWA Implementation

#### Service Worker
```javascript
// public/sw.js
self.addEventListener('fetch', (event) => {
  // Network-first for API requests
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .catch(() => caches.match(event.request))
    )
  }
  // Cache-first for static assets
  else {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    )
  }
})
```

#### Offline Queue
```typescript
// lib/stores/photo-queue-store.ts
interface PhotoQueue {
  pending: Photo[]
  addToQueue: (photo: Photo) => void
  syncQueue: () => Promise<void>
}

export const usePhotoQueue = create<PhotoQueue>((set, get) => ({
  pending: [],
  addToQueue: (photo) => {
    set((state) => ({ pending: [...state.pending, photo] }))
    // Save to IndexedDB
  },
  syncQueue: async () => {
    // Upload pending photos when online
  },
}))
```

---

## Data Flow

### Site Survey Workflow

```
Field Estimator (Mobile)
    ↓
1. Create Site Survey (Draft)
    ↓
2. Fill Property Info
    ↓
3. Capture Photos/Videos
    ↓
4. Add Hazard Details
    ↓
5. Submit Survey
    ↓
Office Staff (Desktop)
    ↓
6. Review Survey
    ↓
7. Create Estimate
    ↓
8. Generate Proposal PDF
    ↓
9. Send to Customer
    ↓
Customer
    ↓
10. Accept Proposal
    ↓
11. Convert to Job
    ↓
12. Schedule Job
    ↓
Technicians (Mobile/Desktop)
    ↓
13. Execute Job
    ↓
14. Track Time & Materials
    ↓
15. Upload Completion Photos
    ↓
16. Complete Checklist
    ↓
17. Submit Completion
    ↓
Office Manager
    ↓
18. Review & Approve
    ↓
19. Generate Invoice
    ↓
20. Send Feedback Survey
```

### Data Synchronization

#### Offline → Online Sync

```
Mobile Device Offline
    ↓
User Creates Survey
    ↓
Saved to IndexedDB
    ↓
Queued for Sync
    ↓
Device Comes Online
    ↓
Service Worker Detects Online
    ↓
Trigger Sync Event
    ↓
POST /api/sync
    ↓
Upload to Supabase
    ↓
Update Local Cache
    ↓
Notify User: Synced ✓
```

---

## Deployment Architecture

### Vercel Deployment

```
GitHub Repository (main branch)
    ↓
Push Commit
    ↓
Vercel Detects Change
    ↓
Build Process:
  - npm install
  - npm run build
  - TypeScript compilation
  - Next.js optimization
    ↓
Deploy to Edge Network
    ↓
Update DNS (hazardos.app)
    ↓
Production Live
```

### Environment Configuration

**Development**
- Local Next.js dev server
- Local Supabase project or cloud
- Hot reload enabled

**Staging** (Optional)
- Vercel preview deployments
- Dedicated Supabase project
- Production-like configuration

**Production**
- Vercel production deployment
- Production Supabase project
- Performance monitoring active

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# App
NEXT_PUBLIC_APP_URL=https://hazardos.app

# Rate Limiting
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Integrations (optional)
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
```

---

## Scalability Considerations

### Database Scalability

**Current**: Supabase shared instance
- Supports 100+ concurrent connections
- Suitable for 100-500 active users

**Future Scaling**:
- Supabase Pro plan (dedicated resources)
- Read replicas for reporting queries
- Connection pooling (PgBouncer)
- Sharding by organization_id if needed

### Application Scalability

**Horizontal Scaling**:
- Vercel Edge Functions auto-scale
- Stateless API design allows unlimited instances

**Vertical Scaling**:
- Increase Vercel function memory limits
- Optimize bundle size
- Implement code splitting

### Storage Scalability

**Current**: Supabase Storage (100GB included)
- CDN distribution via Supabase
- Automatic image optimization

**Future**:
- Migrate to dedicated CDN if needed
- Implement tiered storage (hot/cold)
- Consider external storage (S3, R2)

### Performance Optimization (Updated Post-Audit)

**Current Performance Status**: B- (Good foundations with critical optimization opportunities)

#### Performance Strengths ✅
- **Bundle Optimization**: Strategic code splitting with 180KB main bundle
- **Multi-Layered Caching**: Browser, CDN, and API-level caching with proper TTLs
- **Next.js 16 Optimizations**: Turbopack, optimizeCss, package imports
- **Lazy Loading**: Heavy libraries (recharts, PDF, AI) properly code-split

#### Critical Performance Issues ⚠️

**1. Survey Store Bottleneck (High Impact)**
```typescript
// PROBLEM: O(n) operations causing mobile lag
updateArea: (id, data) =>
  set((state) => ({
    formData: {
      ...state.formData,
      hazards: {
        ...state.formData.hazards,
        areas: state.formData.hazards.areas.map((a) =>
          a.id === id ? { ...a, ...data } : a  // O(n) on every update
        ),
      },
    },
  }))

// SOLUTION: Use Map-based storage for O(1) lookups
```

**2. Database Query Optimization**
- **N+1 Query Patterns**: Customer service with potential 201 queries for 100 customers
- **Multiple Count Queries**: Stats queries use 4 separate database calls instead of single aggregation
- **Missing Indexes**: Some common query patterns lack optimized indexes

**3. Authentication Hook Performance**
```typescript
// PROBLEM: 2-3 HTTP requests per component mount, no shared cache
const { user, profile, organization } = useMultiTenantAuth()
// 17+ consumers each making separate API calls
```

#### Performance Metrics
- **Current LCP**: ~2.1s (Good - under 2.5s target)
- **Current FID**: ~45ms (Good - under 100ms target)
- **Current CLS**: ~0.08 (Good - under 0.1 target)

#### Optimization Roadmap

**Phase 1: Critical Fixes (Week 1)**
- Fix survey store O(n) operations → Use Map-based storage
- Optimize customer stats query → Single aggregation query
- Add database indexes → 50-80% query speed improvement
- Increase photo upload concurrency → Better mobile experience

**Phase 2: React Optimizations (Week 2)**
- Add React.memo to table components → Reduce re-renders
- Optimize photo queue operations → Indexed lookups
- Implement section lazy loading → Faster initial load
- Add touch optimizations → Better mobile UX

**Phase 3: Advanced Optimizations (Week 3)**
- Implement auth context caching → Reduce API overhead
- Add resource preloading → Improve LCP
- Optimize RLS policies → Database performance
- Bundle analysis and splitting → Smaller initial payloads

**Expected Impact**: 
- **LCP**: 2.1s → 1.0s (52% improvement)
- **Mobile Performance**: +145% improvement
- **Database Queries**: +80% faster
- **Bundle Size**: -15% reduction

**Database**:
- Materialized views for complex reports
- Partial indexes on filtered queries
- Query result caching (Redis)
- **NEW**: Composite indexes for multi-tenant queries
- **NEW**: GIN indexes for full-text search

**Frontend**:
- Server Components reduce bundle size
- Lazy loading for heavy components
- Image optimization (next/image)
- Route prefetching
- **NEW**: React.memo for performance-critical components
- **NEW**: Map-based state management for O(1) operations

**API**:
- Edge caching for public endpoints
- Compression (gzip/brotli)
- Pagination on all list endpoints
- **NEW**: Auth context caching to reduce redundant requests
- **NEW**: Database query optimization and N+1 prevention

---

## Security Architecture (Updated Post-Audit)

### Current Security Status

**Overall Grade**: B+ (Strong foundations with critical vulnerabilities to address)

### Critical Security Issues (Immediate Action Required)

#### 1. Dependency Vulnerabilities
- **23 vulnerabilities** including 1 critical (jsPDF RCE)
- **Impact**: Remote code execution, DoS attacks, path traversal
- **Action**: `npm audit fix` and dependency updates

#### 2. SQL Injection Risk
- **Location**: `app/api/v1/customers/route.ts:50`
- **Issue**: Direct string interpolation in ILIKE queries
- **Fix**: Use parameterized queries or proper escaping

#### 3. Authentication Bypass Risks
- **Webhook secrets**: Fall back to empty string on misconfiguration
- **Cron endpoints**: Timing-unsafe comparison allows bypass
- **Platform access**: Inconsistent role checking across services

### Security Strengths

#### Multi-Tenant Isolation ✅
- **Row-Level Security**: All tenant data isolated at database level
- **Helper Functions**: `get_user_organization_id()` with immutable search paths
- **Org-Scoped Queries**: Every query filtered by organization_id

#### Input Validation ✅
- **Zod Schemas**: Comprehensive validation on all API endpoints
- **Sanitization**: SQL injection prevention, CSV formula injection protection
- **Error Handling**: `SecureError` class prevents information leakage

#### Authentication & Authorization ✅
- **JWT-Based**: Supabase Auth with proper session management
- **Role Hierarchy**: Platform → Tenant → User roles with proper inheritance
- **Session Refresh**: Automatic token refresh via proxy.ts

#### Rate Limiting ✅
- **Dual Strategy**: Redis + memory fallback for resilience
- **Per-Route Configuration**: Different limits for different endpoint types
- **DoS Protection**: Upstash Redis-based sliding window

### Security Headers

```javascript
// next.config.mjs - Security headers
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' }
]
```

### CORS Configuration

**Policy-Based CORS** with different configurations:
- **Public API** (`/api/v1/*`): Restricted origins
- **Webhooks**: Specific vendor origins only
- **Internal API**: Same-origin only
- **OpenAPI**: Documentation access

### Storage Security

- **Private Buckets**: All files require authentication
- **RLS Policies**: Organization-scoped file access
- **Signed URLs**: Temporary access for file downloads
- **File Validation**: Type and size restrictions

### Webhook Security

```typescript
// Secure webhook verification
import { timingSafeEqual } from 'crypto'

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex')
  const providedSignature = signature.replace('sha256=', '')
  
  return timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  )
}
```

### Security Monitoring

- **Structured Logging**: Pino-based JSON logging with sensitive data redaction
- **Error Tracking**: Sentry integration for security incident monitoring
- **Audit Trail**: Comprehensive activity logging for compliance

### Security Recommendations

#### Immediate (Critical)
1. **Update all dependencies** with security vulnerabilities
2. **Fix SQL injection** in customer search endpoints
3. **Implement timing-safe comparisons** for all secret validation
4. **Add comprehensive input validation** to all public endpoints

#### Short-term (High)
1. **Implement CSP headers** without unsafe-inline/unsafe-eval
2. **Add API rate limiting** to all public v1 endpoints
3. **Audit platform admin access** patterns for consistency
4. **Implement comprehensive webhook validation**

#### Long-term (Medium)
1. **Security penetration testing** for multi-tenant isolation
2. **Automated security scanning** in CI/CD pipeline
3. **Security training** for development team
4. **Regular security audits** and vulnerability assessments

---

## Monitoring & Observability

### Key Metrics

**Application Health**:
- Response times (p50, p95, p99)
- Error rates by endpoint
- User authentication success rate

**Business Metrics**:
- Active users per day/week/month
- Site surveys created per day
- Job completion rate
- Invoice generation rate

**Infrastructure**:
- Database connection pool usage
- Storage bucket size growth
- API rate limit hits
- CDN cache hit ratio

### Alerting Thresholds

- Error rate > 1% → Alert
- p95 response time > 2s → Warning
- Database connections > 80% → Warning
- Storage > 80% capacity → Warning

---

## Testing Architecture (Updated Post-Audit)

### Current Testing Status

**Overall Coverage**: ~75-80% estimated coverage with comprehensive strategy

### Test Organization

```
test/
├── api/                  # API route tests (95% coverage)
│   ├── customers.test.ts
│   ├── jobs.test.ts
│   └── ...
├── components/           # Component tests (8% coverage - needs expansion)
│   ├── CustomerForm.test.tsx
│   └── ...
├── services/             # Service tests (85% coverage)
│   ├── estimate-calculator.test.ts
│   └── ...
├── hooks/                # Hook tests (good coverage)
│   └── use-multi-tenant-auth.test.tsx
├── lib/                  # Utility tests (high coverage)
│   ├── validations/      # 99.58% coverage
│   └── utils/
└── integration/          # Integration tests (2 workflows)
    └── customer-workflow.test.tsx
```

### Testing Strengths ✅

- **Comprehensive API Testing**: 95% coverage of API routes
- **Strong Validation Testing**: 99.58% coverage of Zod schemas
- **Multi-Tenant Testing**: Good coverage of RBAC and organization isolation
- **Consistent Patterns**: @testing-library/react with proper mocking
- **Business Logic Coverage**: Critical calculations and workflows tested

### Testing Gaps ⚠️

#### Critical Gaps
- **RLS Policy Testing**: Missing comprehensive Row Level Security tests
- **Database Integration**: No real database integration tests
- **E2E Testing**: No end-to-end test suite
- **Component Coverage**: Only 8% of components tested

#### Zero Coverage Areas
- `lib/supabase/server.ts` — server-side auth client
- `lib/stores/survey-store.ts` — 649 lines, core mobile survey state
- `lib/services/stripe-service.ts` — payment processing (~570 lines)
- Platform admin components and workflows

### Testing Strategy

#### Unit Tests
```typescript
// Example: Service test with proper mocking
describe('EstimateCalculator', () => {
  it('calculates total with markup', () => {
    const calculator = new EstimateCalculator()
    const result = calculator.calculateTotal({
      laborCost: 1000,
      materialCost: 500,
      markup: 0.25
    })
    expect(result.total).toBe(1875)
  })
})
```

#### Integration Tests
```typescript
// Example: Full workflow testing
describe('Customer Workflow', () => {
  it('should handle complete customer lifecycle', async () => {
    // Create → Update → Delete workflow
    const customer = await createCustomer(testData)
    expect(customer.id).toBeDefined()
    
    const updated = await updateCustomer(customer.id, updateData)
    expect(updated.name).toBe(updateData.name)
    
    await deleteCustomer(customer.id)
    const deleted = await getCustomer(customer.id)
    expect(deleted).toBeNull()
  })
})
```

#### Component Tests
```typescript
// Example: Component test with user interactions
describe('CustomerForm', () => {
  it('submits form with valid data', async () => {
    const onSave = vi.fn()
    render(<CustomerForm onSave={onSave} />)
    
    await userEvent.type(screen.getByLabelText(/name/i), 'Test Customer')
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    
    expect(onSave).toHaveBeenCalledWith({
      name: 'Test Customer',
      email: 'test@example.com'
    })
  })
})
```

### Testing Recommendations

#### Immediate (Critical)
1. **Add RLS policy testing** for multi-tenant security validation
2. **Expand component test coverage** from 8% to 70% target
3. **Add database integration tests** with real Supabase instance
4. **Test critical user paths** end-to-end

#### Short-term (High)
1. **Implement E2E test suite** using Playwright
2. **Add performance testing** for key operations
3. **Test mobile survey workflows** comprehensively
4. **Add Stripe integration testing** with test mode

#### Long-term (Medium)
1. **Visual regression testing** for UI consistency
2. **Load testing** for scalability validation
3. **Security testing** automation in CI/CD
4. **Cross-browser compatibility** testing

### Test Configuration

**Vitest Configuration**:
```typescript
export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70
        }
      }
    }
  }
})
```

**Mock Strategy**:
- **Supabase Client**: Comprehensive mocking for database operations
- **External APIs**: Mock Stripe, Twilio, QuickBooks integrations
- **File System**: Mock photo uploads and file operations
- **Time**: Mock dates for consistent test results

---

## Future Architectural Considerations

### Planned Enhancements

1. **Real-time Collaboration**
   - WebSocket connections for live updates
   - Collaborative estimate editing
   - Live job status updates

2. **Advanced Analytics**
   - Data warehouse for historical analysis
   - Machine learning for estimate accuracy
   - Predictive job duration models

3. **Mobile Native Apps**
   - React Native for iOS/Android
   - Shared codebase with web PWA
   - Enhanced offline capabilities

4. **API Platform**
   - Public API for integrations
   - Webhooks for events
   - API key management

5. **White-Label Support**
   - Custom domains per tenant
   - Configurable branding
   - Isolated deployments option

---

## Summary

HazardOS represents a **mature, well-architected multi-tenant SaaS platform** with strong foundations in security, performance, and scalability. The architecture successfully implements complex business requirements while maintaining good separation of concerns and following modern development practices.

### Key Architectural Strengths
- ✅ **Next.js 16 Implementation**: Proper proxy.ts usage with excellent session management
- ✅ **Multi-Tenant Security**: Robust RLS implementation with comprehensive data isolation
- ✅ **Modern Tech Stack**: Latest versions of React 19, Next.js 16, TypeScript 5.9
- ✅ **Performance Optimization**: Strategic code splitting and multi-layered caching
- ✅ **Comprehensive Testing**: 399 test files with strong API and service coverage

### Critical Areas for Improvement
- 🚨 **Security Vulnerabilities**: 23 dependency vulnerabilities requiring immediate updates
- ⚠️ **Performance Bottlenecks**: Survey store and authentication hook optimization needed
- ⚠️ **Testing Gaps**: Component and E2E testing expansion required

### Architecture Maturity Assessment
- **Security**: B+ (Strong foundations, critical vulnerabilities to address)
- **Performance**: B- (Good optimization, specific bottlenecks identified)
- **Scalability**: A- (Excellent multi-tenant design, ready for growth)
- **Maintainability**: B+ (Clean architecture, some consistency improvements needed)
- **Testing**: B (Comprehensive strategy, coverage gaps to fill)

**Overall Architecture Grade: B+**

The platform is **production-ready** with a solid foundation for continued growth and scaling. Addressing the identified security vulnerabilities and performance optimizations will further strengthen an already robust architecture.

---

**Document Version**: 2.0 (Post-Audit Update)  
**Last Review**: April 7, 2026  
**Next Review**: July 1, 2026  
**Audit Reference**: [Comprehensive Codebase Audit 2026-04-07](./CODEBASE-AUDIT-2026-04-07.md)
