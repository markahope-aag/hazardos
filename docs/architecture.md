# HazardOS Architecture

**Comprehensive technical architecture documentation for the HazardOS platform**

> **Last Updated**: February 1, 2026
> **Version**: 0.1.0

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

## Technology Stack

### Frontend Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Framework** | Next.js | 16.1.6 | React framework with App Router |
| **Language** | TypeScript | 5.9.3 | Type-safe JavaScript (strict mode) |
| **UI Library** | React | 19.2.4 | Component-based UI |
| **Styling** | Tailwind CSS | 4.1.18 | Utility-first CSS framework |
| **Components** | Radix UI | Latest | Accessible component primitives |
| **Component Library** | shadcn/ui | Latest | Pre-built component collection |
| **State Management** | Zustand | 5.0.10 | Global state management |
| **Server State** | TanStack Query | 5.90.20 | Data fetching & caching |
| **Forms** | React Hook Form | 7.71.1 | Form state management |
| **Validation** | Zod | 4.3.6 | Schema validation |
| **PWA** | next-pwa | 5.6.0 | Progressive Web App support |

### Backend Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Database** | PostgreSQL | 15+ | Relational database via Supabase |
| **BaaS** | Supabase | 2.93.3 | Backend services platform |
| **Authentication** | Supabase Auth | 2.93.3 | User authentication & sessions |
| **Storage** | Supabase Storage | 2.93.3 | File storage with CDN |
| **Real-time** | Supabase Realtime | 2.93.3 | WebSocket subscriptions |
| **API** | Next.js API Routes | 16.1.6 | RESTful API endpoints |
| **Rate Limiting** | Upstash Redis | 1.36.1 | DoS protection |

### Development & Deployment

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Hosting** | Vercel | Edge deployment & CDN |
| **CI/CD** | GitHub Actions | Automated testing & deployment |
| **Version Control** | Git | Source code management |
| **Package Manager** | npm/pnpm | Dependency management |
| **Linting** | ESLint | Code quality enforcement |
| **Testing** | Vitest | Unit & integration testing |
| **Type Checking** | TypeScript Compiler | Static type analysis |

---

## Application Architecture

### Next.js App Router Structure

```
app/
├── (auth)/              # Authentication routes
│   ├── login/          # Login page
│   └── layout.tsx      # Auth layout (no navigation)
│
├── (dashboard)/        # Main application (authenticated)
│   ├── page.tsx       # Dashboard home
│   ├── layout.tsx     # Dashboard layout (navigation)
│   ├── customers/     # Customer management
│   ├── site-surveys/  # Site survey management
│   ├── estimates/     # Estimate management
│   ├── jobs/          # Job management
│   │   ├── [id]/     # Job details
│   │   │   ├── complete/  # Job completion workflow
│   │   │   └── review/    # Job review workflow
│   ├── invoices/      # Invoice management
│   ├── calendar/      # Scheduling calendar
│   └── settings/      # Organization settings
│       └── pricing/   # Pricing configuration
│
├── (platform)/        # Platform administration
│   └── platform-admin/
│
├── (public)/          # Public routes (no auth)
│   └── feedback/     # Customer feedback surveys
│
└── api/              # API endpoints
    ├── customers/    # Customer CRUD
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
    │   └── variance/ # Variance analysis
    ├── integrations/ # External integrations
    │   └── quickbooks/ # QuickBooks sync
    ├── feedback/     # Customer feedback
    └── settings/     # Settings management
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

### Performance Optimization

**Database**:
- Materialized views for complex reports
- Partial indexes on filtered queries
- Query result caching (Redis)

**Frontend**:
- Server Components reduce bundle size
- Lazy loading for heavy components
- Image optimization (next/image)
- Route prefetching

**API**:
- Edge caching for public endpoints
- Compression (gzip/brotli)
- Pagination on all list endpoints

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

**Document Version**: 1.0
**Last Review**: February 1, 2026
**Next Review**: March 1, 2026
