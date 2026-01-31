# HazardOS Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** January 31, 2026  
**Product:** HazardOS - Environmental Remediation Business Management Platform  
**Product URL:** https://hazardos.app  
**Document Owner:** Mark Zweig, Asymmetric Marketing LLC  
**Status:** Pre-Development

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Overview](#product-overview)
3. [Target Users](#target-users)
4. [User Stories & Use Cases](#user-stories--use-cases)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [Technical Requirements](#technical-requirements)
8. [User Interface Requirements](#user-interface-requirements)
9. [Data Model](#data-model)
10. [Integration Requirements](#integration-requirements)
11. [Security & Compliance](#security--compliance)
12. [Success Metrics](#success-metrics)
13. [Release Criteria](#release-criteria)
14. [Future Considerations](#future-considerations)

---

## Executive Summary

### Product Vision

HazardOS is an operating system for environmental remediation and abatement companies, providing a complete business management platform that connects field operations with office workflows. The platform enables small to medium-sized companies to digitize their operations—from on-site surveys through invoicing—in a single, integrated system.

### Problem Statement

Environmental remediation companies providing asbestos, vermiculite, mold, lead paint, and other hazardous material abatement services face operational challenges:

- **Manual processes**: Field site surveys captured on paper, transcribed later in office
- **Disconnected systems**: Estimating, scheduling, and invoicing happen in separate tools (or spreadsheets)
- **Knowledge loss**: Experienced estimators' judgment exists only in their heads
- **Mobile limitations**: Existing software is desktop-first, unusable at job sites
- **Accuracy issues**: Estimates don't account for historical job performance data
- **Resource conflicts**: Crews, equipment, and clearance labs scheduled manually with conflicts

### Solution Overview

HazardOS provides:

1. **Mobile field site survey tool**: Estimators capture site conditions on their phones/tablets, even offline
2. **Office management platform**: Converts site surveys into estimates, proposals, schedules, and invoices
3. **Learning system**: Analyzes historical job data to improve future estimate accuracy
4. **Unified workflow**: Single platform from initial site survey through final payment

### Target Market

- **Primary**: Small to medium-sized local/regional remediation companies (5-50 employees)
- **Geography**: United States (initial), English-speaking markets
- **Revenue range**: $1M - $20M annual revenue
- **Services**: Asbestos, mold, lead paint, vermiculite, and other regulated hazards

### Success Criteria

- **Phase 1 (Beta)**: 5 companies actively using platform daily
- **Phase 2 (Launch)**: 50 paying customers within 6 months
- **Phase 3 (PMF)**: 150 customers, 90%+ retention, clear unit economics

---

## Product Overview

### Core Value Proposition

**For field estimators:**  
"Create accurate site surveys on your phone, even without internet, and let the office handle the rest."

**For office staff:**  
"Turn field site surveys into proposals, schedules, and invoices with a few clicks—no more re-entering data."

**For business owners:**  
"See every job in real-time, understand what drives costs, and keep your team's knowledge in the system."

### Product Principles

1. **Mobile-first, not mobile-only**: Built primarily for field use but fully functional on desktop
2. **Offline-capable**: Core functions work without internet connectivity
3. **Simple by default, powerful when needed**: Easy onboarding, advanced features don't overwhelm
4. **Learning system**: Platform gets smarter with every completed job
5. **Industry-specific**: Purpose-built for remediation, not generic field service

### Product Components

```
┌─────────────────────────────────────────────────────────────┐
│                         HazardOS                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │  Mobile Field    │              │  Office          │    │
│  │  Site Survey     │◄────Sync────►│  Management      │    │
│  │                  │              │                  │    │
│  │  • Site audit    │              │  • Estimating    │    │
│  │  • Photos        │              │  • Proposals     │    │
│  │  • GPS tagging   │              │  • Scheduling    │    │
│  │  • Offline work  │              │  • Invoicing     │    │
│  └──────────────────┘              │  • Reporting     │    │
│                                     └──────────────────┘    │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Learning Engine                           │  │
│  │  • Historical job analysis                             │  │
│  │  • Pattern detection                                   │  │
│  │  • Estimate improvement suggestions                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Target Users

### Primary Personas

#### 1. Field Estimator (Primary User - Mobile)

**Profile:**
- **Name**: Sarah Martinez
- **Age**: 28-45
- **Experience**: 5-15 years in remediation
- **Tech comfort**: Moderate (uses smartphone daily, not tech-savvy)
- **Work context**: On job sites, wearing PPE, limited connectivity

**Goals:**
- Create accurate site surveys quickly
- Capture all necessary site information
- Avoid paperwork and double-entry
- Get paid properly for their expertise

**Pain Points:**
- Paper forms get damaged/lost
- Can't access past job info in field
- Manual calculations prone to errors
- Have to remember to transfer notes later

**Success Metrics:**
- Can complete assessment in <15 minutes
- No lost data from paper forms
- Reduced estimation errors

---

#### 2. Office Administrator/Project Coordinator (Secondary User - Desktop)

**Profile:**
- **Name**: Mike Johnson
- **Age**: 30-55
- **Experience**: 3-10 years in operations
- **Tech comfort**: High (uses multiple business apps daily)
- **Work context**: Office, desktop computer, handles scheduling/proposals

**Goals:**
- Turn assessments into proposals quickly
- Schedule jobs without conflicts
- Track job progress
- Get invoices out promptly

**Pain Points:**
- Re-entering data from paper forms
- Double-bookings and crew conflicts
- Chasing estimators for information
- Manually tracking job status

**Success Metrics:**
- Proposal generation time cut by 75%
- Zero double-bookings
- Real-time visibility into job pipeline

---

#### 3. Business Owner/Manager (Decision Maker - Desktop/Mobile)

**Profile:**
- **Name**: Tom Williams
- **Age**: 40-65
- **Experience**: 15-30 years, owns or manages company
- **Tech comfort**: Moderate to high
- **Work context**: Office and field, needs mobile access to dashboards

**Goals:**
- Increase profitability
- Reduce job overruns
- Retain knowledge as staff changes
- Make data-driven decisions

**Pain Points:**
- Can't see true job profitability
- Knowledge walks out door with retiring staff
- No visibility without being in office
- Repeating same estimation mistakes

**Success Metrics:**
- Improved gross margins
- Reduced estimation variance
- Business insights at fingertips

---

### Secondary Personas

#### 4. Crew Lead/Supervisor

**Needs:**
- Access to job details in field
- Ability to update job status
- Report issues/delays
- Clock time and materials

---

#### 5. Accounting/Bookkeeper

**Needs:**
- Invoice generation
- Payment tracking
- Financial reporting
- QuickBooks integration

---

## User Stories & Use Cases

### Epic 1: Field Assessment (Mobile)

#### US-1.1: Create Site Assessment
**As a** field estimator  
**I want to** create a new site assessment on my mobile device  
**So that** I can capture job details while on-site

**Acceptance Criteria:**
- Can create new assessment with one tap from home screen
- Form is optimized for mobile (large touch targets, minimal typing)
- Can select hazard type (asbestos, mold, lead, vermiculite, other)
- Can specify containment level (1-4 for asbestos)
- Can enter area measurements (sq ft, linear ft)
- Can select material types from predefined list
- Can add free-text notes for special conditions
- Form validates required fields before submission
- Can save as draft and return later

**Priority:** P0 (MVP)  
**Effort:** 5 story points

---

#### US-1.2: Capture Job Site Photos
**As a** field estimator  
**I want to** take photos of the hazard and surrounding area  
**So that** the office team has visual documentation

**Acceptance Criteria:**
- Can access device camera from within app
- Can take multiple photos (up to 20 per assessment)
- Photos automatically tagged with GPS coordinates (if available)
- Photos automatically tagged with timestamp
- Can add caption to each photo
- Photos compress automatically for faster upload
- Photos queue for upload and sync when online
- Can view thumbnail gallery of captured photos

**Priority:** P0 (MVP)  
**Effort:** 3 story points

---

#### US-1.3: Work Offline
**As a** field estimator  
**I want to** complete assessments even without internet connectivity  
**So that** I can work in basements, remote areas, or buildings with no signal

**Acceptance Criteria:**
- App detects online/offline status
- Shows clear indicator of offline mode
- All form inputs work offline
- Photos stored locally until online
- Form saves to device storage automatically
- Shows "pending sync" indicator for unsaved assessments
- Automatically syncs when connection restored
- Shows sync progress/status
- Handles sync conflicts gracefully

**Priority:** P0 (MVP)  
**Effort:** 8 story points

---

#### US-1.4: Tag Location
**As a** field estimator  
**I want to** automatically capture the job site location  
**So that** we have accurate records and can verify I was on-site

**Acceptance Criteria:**
- Auto-captures GPS coordinates when creating assessment
- Shows address (reverse geocoding) for verification
- Can manually adjust location on map if GPS inaccurate
- Works offline (captures coordinates, resolves address later)
- Location displays in office view
- Respects device location permissions

**Priority:** P1 (Important, not MVP)  
**Effort:** 3 story points

---

#### US-1.5: Voice Input for Notes
**As a** field estimator  
**I want to** dictate notes using voice input  
**So that** I can capture details while wearing gloves or PPE

**Acceptance Criteria:**
- Microphone button on notes field
- Converts speech to text
- Works with device's native speech recognition
- Indicates when listening
- Can pause and resume
- Appends to existing notes (doesn't replace)

**Priority:** P2 (Nice to have)  
**Effort:** 2 story points

---

### Epic 2: Office Processing (Desktop/Tablet)

#### US-2.1: View Submitted Assessments
**As an** office administrator  
**I want to** see all submitted field assessments in one place  
**So that** I can process them into estimates and proposals

**Acceptance Criteria:**
- Dashboard shows all assessments
- Can filter by status (pending, estimated, quoted, scheduled)
- Can filter by estimator
- Can filter by date range
- Can search by customer name or address
- Shows key details in list view (customer, hazard type, date, estimator)
- Can sort by any column
- Shows "new" indicator for unviewed assessments

**Priority:** P0 (MVP)  
**Effort:** 5 story points

---

#### US-2.2: Generate Cost Estimate
**As an** office administrator  
**I want to** convert a site assessment into a cost estimate  
**So that** I can determine pricing and profitability

**Acceptance Criteria:**
- Opens assessment details
- System suggests estimated duration (in days)
- System suggests crew size and type
- System suggests equipment needs
- System calculates labor cost (hours × rate)
- System calculates equipment cost (rental + consumables)
- System calculates disposal cost (based on material and volume)
- System suggests markup/margin
- Can override any system suggestion with reason
- Calculates total estimated cost
- Saves estimate linked to assessment

**Priority:** P0 (MVP)  
**Effort:** 8 story points

---

#### US-2.3: Create Proposal Document
**As an** office administrator  
**I want to** generate a professional proposal from the estimate  
**So that** I can send it to the customer

**Acceptance Criteria:**
- One-click "Generate Proposal" from estimate
- Proposal includes:
  - Company branding/logo
  - Customer information
  - Site address
  - Scope of work (from assessment)
  - Line item breakdown (labor, equipment, disposal)
  - Total price
  - Terms and conditions
  - Compliance disclaimers
  - Signature block
- Can edit all text before sending
- Generates PDF for download/email
- Can email directly from platform
- Tracks when sent and viewed (if emailed)
- Tracks proposal status (sent, viewed, accepted, rejected)

**Priority:** P0 (MVP)  
**Effort:** 8 story points

---

#### US-2.4: Schedule Job
**As an** office administrator  
**I want to** schedule accepted jobs with crew and equipment  
**So that** work can be completed

**Acceptance Criteria:**
- Can create schedule from accepted proposal
- Can select start date
- System suggests duration based on estimate
- Can assign crew/team
- Can assign equipment
- Shows crew availability (if other jobs scheduled)
- Shows equipment availability
- Alerts if scheduling conflict detected
- Can add buffer days with reason
- Sends notification to assigned crew
- Updates job status to "scheduled"

**Priority:** P0 (MVP)  
**Effort:** 8 story points

---

#### US-2.5: Track Job Status
**As an** office administrator  
**I want to** see the status of all active jobs  
**So that** I know what's in progress, what's complete, what's delayed

**Acceptance Criteria:**
- Dashboard shows all jobs by status
- Status options: Scheduled, In Progress, Awaiting Clearance, Complete, Invoiced
- Can update status manually
- Shows days elapsed vs estimated duration
- Highlights jobs over estimated duration
- Shows next action required
- Can filter by crew, date range, status

**Priority:** P0 (MVP)  
**Effort:** 5 story points

---

#### US-2.6: Generate Invoice
**As an** office administrator  
**I want to** create an invoice when a job is complete  
**So that** we can get paid

**Acceptance Criteria:**
- One-click "Generate Invoice" from completed job
- Invoice includes:
  - Invoice number (auto-generated, sequential)
  - Date
  - Customer information
  - Line items (matches proposal unless changed)
  - Total amount
  - Payment terms (Net 30, etc.)
  - Payment methods accepted
- Can edit line items and amounts
- Can add additional charges (change orders)
- Can apply discounts
- Generates PDF
- Can email directly
- Tracks invoice status (sent, paid, overdue)
- Records payment when received

**Priority:** P0 (MVP)  
**Effort:** 5 story points

---

### Epic 3: Learning System (The Ralph Wiggum Loop)

#### US-3.1: Capture Actual Job Outcomes
**As an** office administrator  
**I want to** record what actually happened on a job  
**So that** the system can learn and improve estimates

**Acceptance Criteria:**
- When marking job complete, must enter:
  - Actual start date
  - Actual end date (system calculates duration)
  - Actual labor hours (from crew timesheets)
  - Actual materials/equipment costs
  - Any issues encountered (from predefined list + notes)
  - Clearance lab turnaround time
- System calculates variance (actual vs estimated)
- Data stored for analysis
- Cannot mark complete without actual data

**Priority:** P0 (MVP for learning loop)  
**Effort:** 5 story points

---

#### US-3.2: Override Tracking
**As an** office administrator  
**I want to** record why I'm overriding system suggestions  
**So that** the system understands when and why estimates need adjustment

**Acceptance Criteria:**
- Whenever changing system suggestion (duration, crew, equipment), must select reason
- Reason categories:
  - Clearance lab backlog
  - Crew availability
  - Equipment shortage
  - Site access issues
  - Weather
  - Scope change
  - Estimator error
  - Other (with note)
- Override reason saved with adjustment
- Data available for pattern analysis

**Priority:** P0 (MVP for learning loop)  
**Effort:** 3 story points

---

#### US-3.3: Pattern Detection
**As a** business owner  
**I want to** see patterns in job outcomes  
**So that** I can understand what drives variances and improve operations

**Acceptance Criteria:**
- System analyzes completed jobs (minimum 10 similar jobs)
- Identifies patterns:
  - Jobs that consistently run over/under estimate
  - Estimators who are consistently optimistic/conservative
  - Hazard types that have high variance
  - Site characteristics that affect duration (occupied vs vacant)
  - Seasonal factors
  - Clearance lab performance
- Dashboard shows top 5 patterns
- Can drill into any pattern for job list
- Updates weekly as new jobs complete

**Priority:** P1 (Post-MVP, high value)  
**Effort:** 13 story points

---

#### US-3.4: Smart Suggestions
**As a** field estimator  
**I want to** receive suggestions based on historical data  
**So that** my estimates are more accurate

**Acceptance Criteria:**
- When creating assessment, system checks for similar past jobs
- If 5+ similar jobs found, shows suggestion:
  - "Jobs like this typically take X days (based on Y similar jobs)"
  - "This type of job usually costs $Z"
  - "Consider: [risk factor that commonly appears]"
- Estimator can accept, modify, or ignore suggestion
- System tracks which suggestions were helpful
- Suggestions improve over time as more data collected

**Priority:** P1 (Post-MVP, high value)  
**Effort:** 8 story points

---

### Epic 4: Reporting & Analytics

#### US-4.1: Job Pipeline Dashboard
**As a** business owner  
**I want to** see all jobs in various stages  
**So that** I understand my business pipeline

**Acceptance Criteria:**
- Dashboard shows counts by stage:
  - Assessments pending (field work complete, not estimated)
  - Estimates pending (estimated, proposal not sent)
  - Proposals sent (awaiting customer decision)
  - Jobs scheduled (accepted, not started)
  - Jobs in progress
  - Jobs completed (awaiting invoice)
  - Invoiced (awaiting payment)
- Shows total dollar value at each stage
- Click any stage to see job list
- Updates in real-time

**Priority:** P1 (Important for management)  
**Effort:** 5 story points

---

#### US-4.2: Estimator Performance Report
**As a** business owner  
**I want to** see how accurate each estimator is  
**So that** I can provide coaching and improve overall accuracy

**Acceptance Criteria:**
- Report shows for each estimator:
  - Number of jobs estimated
  - Average duration variance (actual vs estimated)
  - Average cost variance
  - Win rate (proposals accepted)
  - Common patterns (tends to underestimate X)
- Can filter by date range
- Can filter by hazard type
- Exportable to PDF/Excel

**Priority:** P2 (Nice to have)  
**Effort:** 5 story points

---

#### US-4.3: Profitability Analysis
**As a** business owner  
**I want to** understand profitability by job type, crew, and customer  
**So that** I can make strategic business decisions

**Acceptance Criteria:**
- Shows gross margin by:
  - Hazard type (asbestos vs mold vs lead, etc.)
  - Job size (small/medium/large)
  - Customer (repeat vs one-time)
  - Crew/team
- Shows trend over time
- Identifies highest/lowest margin jobs
- Exportable

**Priority:** P2 (Nice to have)  
**Effort:** 8 story points

---

## Functional Requirements

### FR-1: Authentication & Authorization

**FR-1.1:** Users must authenticate with email and password  
**FR-1.2:** Support for password reset via email  
**FR-1.3:** Role-based access control (Estimator, Admin, Owner)  
**FR-1.4:** Estimators can only view/edit their own assessments  
**FR-1.5:** Admins can view/edit all assessments and manage scheduling  
**FR-1.6:** Owners have full access to all data and analytics  
**FR-1.7:** Session timeout after 8 hours of inactivity  
**FR-1.8:** Support for multi-factor authentication (optional, future)

---

### FR-2: Mobile Assessment

**FR-2.1:** Mobile-optimized form with large touch targets (44px minimum)  
**FR-2.2:** Support for offline form completion and submission  
**FR-2.3:** Auto-save drafts every 30 seconds  
**FR-2.4:** Photo capture with device camera, up to 20 photos per assessment  
**FR-2.5:** GPS coordinate capture for job site location  
**FR-2.6:** Dropdown/picker controls for structured data entry  
**FR-2.7:** Form validation before submission  
**FR-2.8:** Sync queue for offline submissions  
**FR-2.9:** Sync status indicator visible to user  
**FR-2.10:** Automatic retry for failed syncs

---

### FR-3: Office Management

**FR-3.1:** Dashboard showing all assessments with filtering and search  
**FR-3.2:** Estimate calculator with suggested values based on assessment  
**FR-3.3:** Ability to override suggestions with required reason  
**FR-3.4:** Proposal generator creating PDF from estimate  
**FR-3.5:** Email delivery of proposals with tracking  
**FR-3.6:** Calendar view for job scheduling  
**FR-3.7:** Crew and equipment assignment with conflict detection  
**FR-3.8:** Job status tracking through lifecycle  
**FR-3.9:** Invoice generator with line item editing  
**FR-3.10:** Payment recording and tracking

---

### FR-4: Learning System

**FR-4.1:** Capture actual job outcomes (duration, cost, issues)  
**FR-4.2:** Calculate variances (actual vs estimated)  
**FR-4.3:** Store override reasons with adjustments  
**FR-4.4:** Pattern detection algorithm (runs weekly)  
**FR-4.5:** Similar job matching for suggestions  
**FR-4.6:** Suggestion display in assessment form  
**FR-4.7:** Track suggestion acceptance/rejection  
**FR-4.8:** Confidence scoring for patterns (based on sample size)

---

### FR-5: Reporting

**FR-5.1:** Job pipeline dashboard with stage breakdown  
**FR-5.2:** Estimator performance report  
**FR-5.3:** Profitability analysis by multiple dimensions  
**FR-5.4:** Export to PDF and Excel for all reports  
**FR-5.5:** Date range filtering for all reports  
**FR-5.6:** Real-time dashboard updates

---

### FR-6: Administration

**FR-6.1:** User management (add, edit, deactivate users)  
**FR-6.2:** Company profile management (name, logo, contact info)  
**FR-6.3:** Default pricing/rates configuration  
**FR-6.4:** Crew/team management  
**FR-6.5:** Equipment inventory tracking  
**FR-6.6:** Customer management (basic contact info)  
**FR-6.7:** Proposal template customization  
**FR-6.8:** Invoice template customization  
**FR-6.9:** Email notification settings

---

## Non-Functional Requirements

### NFR-1: Performance

**NFR-1.1:** Mobile forms must load in <2 seconds on 3G connection  
**NFR-1.2:** Desktop dashboard must load in <1 second  
**NFR-1.3:** Photo upload must complete within 5 seconds per photo (4G connection)  
**NFR-1.4:** Search results must return in <500ms  
**NFR-1.5:** Report generation must complete in <3 seconds  
**NFR-1.6:** System must handle 100 concurrent users without degradation  
**NFR-1.7:** Sync must complete within 30 seconds for typical assessment (with photos)

---

### NFR-2: Reliability

**NFR-2.1:** System uptime must be 99.5% or higher  
**NFR-2.2:** No data loss during offline operations  
**NFR-2.3:** Automatic retry for failed operations (max 3 attempts)  
**NFR-2.4:** Graceful degradation when services unavailable  
**NFR-2.5:** Database backups every 6 hours, retained for 30 days  
**NFR-2.6:** Point-in-time recovery capability

---

### NFR-3: Usability

**NFR-3.1:** New users can complete first assessment within 10 minutes (with minimal training)  
**NFR-3.2:** Mobile interface must work in bright sunlight (high contrast)  
**NFR-3.3:** All actions must provide clear feedback (success/error messages)  
**NFR-3.4:** Error messages must be actionable (tell user how to fix)  
**NFR-3.5:** Interface must be accessible (WCAG 2.1 Level AA compliance)  
**NFR-3.6:** Support for iOS Safari and Android Chrome (latest 2 versions)  
**NFR-3.7:** Desktop support for Chrome, Safari, Edge, Firefox (latest versions)

---

### NFR-4: Security

**NFR-4.1:** All data transmitted via HTTPS (TLS 1.3)  
**NFR-4.2:** Passwords hashed with bcrypt (cost factor 12)  
**NFR-4.3:** Session tokens expire after 8 hours  
**NFR-4.4:** API rate limiting (100 requests per minute per user)  
**NFR-4.5:** SQL injection protection (parameterized queries)  
**NFR-4.6:** XSS protection (input sanitization)  
**NFR-4.7:** CSRF protection for all state-changing operations  
**NFR-4.8:** Row-level security for multi-tenant data isolation  
**NFR-4.9:** Audit logging for sensitive operations (deletes, role changes)  
**NFR-4.10:** Regular security updates (dependency patching)

---

### NFR-5: Scalability

**NFR-5.1:** Database must handle 10,000 assessments per month  
**NFR-5.2:** Photo storage must support 100GB per customer  
**NFR-5.3:** System must support 500 organizations (multi-tenant)  
**NFR-5.4:** Architecture must allow horizontal scaling  
**NFR-5.5:** CDN for photo delivery (sub-100ms load times)

---

### NFR-6: Maintainability

**NFR-6.1:** Code coverage must be >70% for critical paths  
**NFR-6.2:** All APIs must be documented (OpenAPI spec)  
**NFR-6.3:** Database schema must use migrations (version controlled)  
**NFR-6.4:** Infrastructure must be defined as code  
**NFR-6.5:** Error tracking and logging (Sentry or similar)  
**NFR-6.6:** Performance monitoring (Vercel Analytics or similar)

---

### NFR-7: Compliance

**NFR-7.1:** GDPR compliance for data export/deletion  
**NFR-7.2:** Data residency options (US, EU)  
**NFR-7.3:** SOC 2 Type II certification path  
**NFR-7.4:** Privacy policy and terms of service  
**NFR-7.5:** Cookie consent management (GDPR/CCPA)

---

## Technical Requirements

### TR-1: Technology Stack

**Frontend:**
- Framework: Next.js 14 (App Router)
- Language: TypeScript (strict mode)
- UI: React 18
- Styling: Tailwind CSS 3.x
- Component Library: shadcn/ui
- State Management: Zustand + React Query
- Forms: React Hook Form + Zod validation
- PWA: next-pwa plugin

**Backend:**
- Database: Supabase (PostgreSQL 15+)
- Authentication: Supabase Auth
- Storage: Supabase Storage
- API: Next.js API Routes (Edge Runtime)
- Real-time: Supabase Realtime

**DevOps:**
- Hosting: Vercel (Edge Network)
- Domain: hazardos.app
- SSL: Automatic (Vercel)
- CI/CD: GitHub Actions
- Monitoring: Vercel Analytics + Sentry
- Error Tracking: Sentry

**Development:**
- Version Control: Git + GitHub
- Package Manager: pnpm
- Code Quality: ESLint + Prettier
- Testing: Vitest (unit) + Playwright (E2E)
- Documentation: Markdown + Storybook

---

### TR-2: Architecture Patterns

**Frontend Architecture:**
- App Router file-based routing
- Server Components for static content
- Client Components for interactivity
- API Routes for backend logic
- Edge Middleware for auth

**Data Architecture:**
- PostgreSQL as source of truth
- Row-Level Security (RLS) for multi-tenancy
- IndexedDB for offline storage
- Supabase Realtime for live updates

**Offline Architecture:**
- Service Worker for request interception
- IndexedDB for local data persistence
- Background Sync API for queue processing
- Optimistic UI updates

---

### TR-3: API Design

**REST API Principles:**
- RESTful resource naming
- JSON request/response bodies
- HTTP status codes (200, 201, 400, 401, 404, 500)
- Pagination for list endpoints (limit/offset)
- Filtering via query parameters
- Sorting via query parameters

**Endpoints (examples):**
```
POST   /api/assessments           Create assessment
GET    /api/assessments           List assessments
GET    /api/assessments/:id       Get assessment
PATCH  /api/assessments/:id       Update assessment
DELETE /api/assessments/:id       Delete assessment

POST   /api/estimates             Create estimate
GET    /api/estimates/:id         Get estimate

POST   /api/proposals             Generate proposal
PATCH  /api/proposals/:id/send    Send proposal

POST   /api/schedules             Create schedule
GET    /api/schedules             List schedules (calendar)
PATCH  /api/schedules/:id         Update schedule

POST   /api/invoices              Generate invoice
PATCH  /api/invoices/:id/paid     Mark paid

GET    /api/patterns              Get relevant patterns
GET    /api/analytics/pipeline    Pipeline dashboard
GET    /api/analytics/estimators  Estimator performance
```

---

### TR-4: Database Schema

*See HazardOS-Project-Overview.md for complete schema*

**Core Tables:**
- organizations
- users
- assessments (field data)
- estimates (cost calculations)
- proposals (customer-facing docs)
- schedules (job timeline)
- invoices (billing)
- learned_patterns (intelligence)
- override_reasons (tracking)
- pattern_applications (usage tracking)

**Key Relationships:**
- Organization → Users (1:many)
- Assessment → Estimate (1:1)
- Estimate → Proposal (1:1)
- Proposal → Schedule (1:1)
- Schedule → Invoice (1:1)
- Organization → Learned Patterns (1:many)

---

### TR-5: Security Implementation

**Authentication:**
- Supabase Auth (JWT tokens)
- Email/password authentication
- Session management (8-hour expiry)
- Secure password reset flow

**Authorization:**
- Row-Level Security (RLS) policies
- Role-based permissions (estimator/admin/owner)
- API middleware for route protection

**Data Protection:**
- TLS 1.3 in transit
- AES-256 at rest (Supabase default)
- Encrypted database backups
- Photo storage with signed URLs

**Application Security:**
- Input validation (Zod schemas)
- SQL injection prevention (parameterized queries)
- XSS prevention (React escaping + CSP headers)
- CSRF tokens for mutations
- Rate limiting (100 req/min per user)

---

## User Interface Requirements

### UI-1: Mobile Interface (Primary)

**Layout:**
- Single-column layout
- Full-width form fields
- Fixed header with back button
- Sticky submit button at bottom
- Bottom navigation bar (home/drafts/profile)

**Touch Targets:**
- Minimum 44×44px for all interactive elements
- 8px spacing between adjacent tap targets
- Large, clear labels
- Native mobile inputs (date pickers, number keyboards)

**Visual Hierarchy:**
- Clear section headers
- Required fields marked with asterisk
- Help text below fields (not tooltips)
- Error messages inline, below field

**Color Palette:**
```
Primary:   #FF6B35  (Orange - action, hazard theme)
Secondary: #1F2937  (Navy - professional)
Success:   #10B981  (Green - clearance, completion)
Error:     #EF4444  (Red - errors, warnings)
Gray:      #F3F4F6, #6B7280, #111827
```

**Typography:**
```
Headings:  Inter Bold, 20-32px
Body:      Inter Regular, 16px
Labels:    Inter Medium, 14px
Help Text: Inter Regular, 12px
```

---

### UI-2: Desktop Interface (Secondary)

**Layout:**
- Two-column layout (sidebar + main)
- Sidebar navigation (collapsible)
- Main content area (max 1200px width, centered)
- Header with user menu

**Dashboard:**
- Card-based layout
- Key metrics at top (pipeline, revenue)
- Table view for job lists
- Filters in sidebar or top bar

**Forms:**
- Two-column layout on wider screens
- Grouped related fields
- Inline validation
- Clear save/cancel actions

---

### UI-3: Components

**Priority Components:**
1. Assessment form (mobile)
2. Photo uploader
3. Dashboard job list
4. Estimate calculator
5. Schedule calendar
6. Proposal preview
7. Invoice template

**Component Library (shadcn/ui):**
- Button
- Input
- Select (dropdown)
- Textarea
- Checkbox
- Radio Group
- Date Picker
- Dialog (modal)
- Toast (notifications)
- Table
- Card
- Badge
- Tabs

---

### UI-4: Offline Indicators

**States:**
- **Online**: Green dot in header, "Connected"
- **Offline**: Orange dot, "Offline - data will sync later"
- **Syncing**: Blue spinner, "Syncing..."
- **Error**: Red dot, "Sync failed - tap to retry"

**Pending Items:**
- Badge count on drafts tab: "Drafts (3)"
- Yellow indicator on pending assessments
- Clear "Sync Now" button when online

---

### UI-5: Loading States

**Page Load:**
- Skeleton screens (not spinners)
- Show layout structure while loading data
- Progressive enhancement (show content as it arrives)

**Actions:**
- Button shows spinner when processing
- Disable button during processing
- Show success message on completion
- Auto-dismiss success after 3 seconds

---

### UI-6: Empty States

**No Data:**
- Illustration or icon
- Clear message: "No assessments yet"
- Call-to-action: "Create your first assessment"
- Help text if appropriate

**Examples:**
- No drafts: "All caught up! Your drafts will appear here."
- No jobs scheduled: "Schedule your first job from an accepted proposal."
- No patterns yet: "Patterns will appear once you've completed 10+ similar jobs."

---

## Data Model

### Assessment Model
```typescript
interface Assessment {
  id: string
  organization_id: string
  estimator_id: string
  created_at: string
  updated_at: string
  
  // Job Information
  job_name: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  site_address: string
  site_city: string
  site_state: string
  site_zip: string
  site_location?: { lat: number; lng: number }
  
  // Hazard Classification
  hazard_type: 'asbestos' | 'mold' | 'lead' | 'vermiculite' | 'other'
  hazard_subtype?: string // e.g., "friable pipe insulation"
  containment_level?: 1 | 2 | 3 | 4 // for asbestos
  
  // Area/Scope
  area_sqft?: number
  linear_ft?: number
  volume_cuft?: number
  material_type?: string
  
  // Site Conditions
  occupied: boolean
  access_issues: string[]
  special_conditions?: string
  
  // Risk Assessment
  clearance_required: boolean
  clearance_lab?: string
  regulatory_notifications_needed: boolean
  
  // Documentation
  photos: Photo[]
  notes?: string
  
  // Status
  status: 'draft' | 'submitted' | 'estimated' | 'quoted' | 'scheduled' | 'completed'
}

interface Photo {
  id: string
  url: string
  thumbnail_url: string
  caption?: string
  gps_coordinates?: { lat: number; lng: number }
  timestamp: string
}
```

### Estimate Model
```typescript
interface Estimate {
  id: string
  assessment_id: string
  created_at: string
  created_by: string
  
  // Duration
  estimated_duration_days: number
  estimated_labor_hours: number
  
  // Crew
  crew_type: string
  crew_size: number
  labor_rate_per_hour: number
  
  // Equipment
  equipment_needed: EquipmentItem[]
  equipment_cost: number
  
  // Materials
  materials_needed: MaterialItem[]
  materials_cost: number
  
  // Disposal
  disposal_method: string
  disposal_cost: number
  
  // Costs
  total_direct_cost: number
  markup_percentage: number
  total_price: number
  
  // Overrides (if admin changed suggestions)
  overrides?: Override[]
}

interface EquipmentItem {
  name: string
  quantity: number
  daily_rate: number
  days_needed: number
}

interface MaterialItem {
  name: string
  quantity: number
  unit: string
  unit_price: number
}

interface Override {
  field: string
  original_value: any
  new_value: any
  reason: string
  reason_category: string
  overridden_by: string
  overridden_at: string
}
```

### Schedule Model
```typescript
interface Schedule {
  id: string
  estimate_id: string
  created_at: string
  
  // Planned
  start_date: string
  end_date: string
  duration_days: number
  
  // Assignments
  assigned_crew: string[]
  assigned_equipment: string[]
  
  // Overrides
  override_reason?: string
  override_notes?: string
  
  // Actual (filled in during/after job)
  actual_start_date?: string
  actual_end_date?: string
  actual_duration_days?: number
  actual_labor_hours?: number
  
  // Clearance
  clearance_date?: string
  clearance_lab?: string
  clearance_result?: 'pass' | 'fail'
  
  // Issues
  issues_encountered: string[]
  delays: Delay[]
  
  // Status
  status: 'scheduled' | 'in_progress' | 'awaiting_clearance' | 'completed' | 'cancelled'
}

interface Delay {
  type: string
  days: number
  description: string
}
```

### Pattern Model
```typescript
interface LearnedPattern {
  id: string
  organization_id: string
  created_at: string
  updated_at: string
  
  // Pattern Classification
  pattern_type: 'duration_variance' | 'cost_variance' | 'estimator_tendency' | 'clearance_delay' | 'seasonal'
  
  // Characteristics
  job_characteristics: {
    hazard_type?: string
    containment_level?: number
    area_range?: [number, number]
    occupied?: boolean
    // ... other relevant filters
  }
  
  // Insight
  description: string // "Level 3 asbestos in occupied spaces typically +18% duration"
  average_variance: number // 0.18
  
  // Statistical Confidence
  sample_size: number // 23
  confidence_score: number // 0.85
  
  // Application
  suggested_adjustment?: {
    field: string
    adjustment: number | string
    reasoning: string
  }
}
```

---

## Integration Requirements

### INT-1: Email Service

**Provider:** SendGrid, Postmark, or AWS SES  
**Use Cases:**
- Send proposals to customers
- Send invoices
- Password reset emails
- Notification emails (job scheduled, job completed)

**Requirements:**
- Email templates (HTML + plain text)
- Tracking (opened, clicked)
- Bounce/spam handling
- Unsubscribe management

---

### INT-2: Payment Processing (Future)

**Provider:** Stripe  
**Use Cases:**
- Accept customer payments
- Subscription billing for SaaS

**Requirements:**
- PCI compliance (handled by Stripe)
- Payment links in invoices
- Automatic payment recording

---

### INT-3: Accounting Software (Future)

**Target:** QuickBooks Online  
**Use Cases:**
- Export invoices
- Sync customers
- Sync payments

**Requirements:**
- OAuth authentication
- Bidirectional sync
- Conflict resolution

---

### INT-4: SMS Notifications (Future)

**Provider:** Twilio  
**Use Cases:**
- Notify crew of job assignments
- Remind customers of scheduled jobs
- Alert on overdue invoices

---

## Security & Compliance

### SEC-1: Data Privacy

**Requirements:**
- GDPR compliance (EU users)
- CCPA compliance (California users)
- Data export functionality (user can download all their data)
- Data deletion functionality (right to be forgotten)
- Privacy policy (clear, accessible)
- Cookie consent banner

---

### SEC-2: Data Security

**In Transit:**
- TLS 1.3 minimum
- HSTS headers
- Secure cookie flags (HttpOnly, Secure, SameSite)

**At Rest:**
- Database encryption (Supabase default)
- Photo storage encryption
- Backup encryption

**Application:**
- Input validation on all user inputs
- Output encoding to prevent XSS
- Parameterized queries to prevent SQL injection
- CSRF tokens on all mutations
- Rate limiting on APIs
- Content Security Policy headers

---

### SEC-3: Authentication Security

**Password Requirements:**
- Minimum 8 characters
- Complexity not enforced (research shows this reduces security)
- Hashed with bcrypt (cost 12)
- Salted (automatic with bcrypt)

**Session Management:**
- Secure JWT tokens
- 8-hour expiry
- Refresh token rotation
- Logout on all devices capability

**Account Security:**
- Password reset via email (time-limited link)
- Email verification on signup (future)
- 2FA support (future)
- Login attempt limiting (5 attempts, 15-minute lockout)

---

### SEC-4: Regulatory Compliance

**Environmental Regulations:**
- System does not provide regulatory advice
- Disclaimer in all documents
- User responsible for compliance

**Industry Standards:**
- Follow OSHA asbestos standards (documentation)
- Follow EPA mold guidelines (documentation)
- Support for state-specific requirements (future)

**Data Compliance:**
- SOC 2 Type II (goal for Year 2)
- Data residency options (US, EU)
- Audit logs for sensitive operations

---

## Success Metrics

### Product Metrics

**Adoption:**
- Active users (weekly/monthly)
- Assessments created per user per week
- Assessment completion rate (started → submitted)
- Time to first assessment (from signup)

**Engagement:**
- % of users returning weekly
- Average session duration
- Features used per session
- Mobile vs desktop usage ratio

**Efficiency:**
- Time to create assessment (target: <10 min)
- Time from assessment to proposal (target: <1 hour)
- Proposal acceptance rate
- Estimate accuracy improvement (variance reduction over time)

**Business Impact:**
- Customer retention rate (target: 90% after 6 months)
- Net Promoter Score (target: 50+)
- Support ticket volume (target: <1 per customer per month)
- Revenue per customer (target: $300/mo)

---

### Technical Metrics

**Performance:**
- Page load time (target: <2s on mobile)
- Time to interactive (target: <3s)
- Lighthouse score (target: 90+ on all metrics)
- API response time (target: <200ms p95)

**Reliability:**
- Uptime (target: 99.5%)
- Error rate (target: <0.1%)
- Failed sync rate (target: <1%)
- Data loss incidents (target: 0)

**Quality:**
- Test coverage (target: >70%)
- Bug escape rate (bugs found in production)
- Critical bugs (target: <5 per release)
- Time to resolve critical bugs (target: <4 hours)

---

### Learning System Metrics

**Pattern Detection:**
- Patterns identified (count)
- Pattern confidence scores (average)
- Patterns acted upon (% of suggestions accepted)

**Estimate Improvement:**
- Duration variance (target: <10% after 6 months)
- Cost variance (target: <5% after 6 months)
- Estimator accuracy improvement (trend over time)

---

## Release Criteria

### MVP Release (Version 1.0)

**Must Have (P0):**
- [ ] User authentication (email/password)
- [ ] Mobile assessment form
- [ ] Photo capture and upload
- [ ] Offline capability (forms work without internet)
- [ ] Assessment submission and sync
- [ ] Office dashboard (view assessments)
- [ ] Basic estimate calculator
- [ ] Proposal generation (PDF)
- [ ] Email proposal delivery
- [ ] Job scheduling (calendar view)
- [ ] Invoice generation
- [ ] Actual outcome capture (for learning loop)
- [ ] Override tracking
- [ ] User roles (estimator, admin, owner)

**Should Have (P1):**
- [ ] GPS tagging for assessments
- [ ] Customer management
- [ ] Crew/equipment management
- [ ] Email notifications
- [ ] Basic reporting (pipeline dashboard)

**Quality Gates:**
- [ ] No P0 bugs
- [ ] <5 P1 bugs
- [ ] Load time <2s on 4G
- [ ] Works on iOS Safari and Android Chrome
- [ ] Successful beta test with 3 companies
- [ ] 90% test coverage on critical paths
- [ ] Security audit completed
- [ ] Privacy policy published
- [ ] Terms of service published

---

### V1.1 Release (Pattern Detection)

**Must Have:**
- [ ] Pattern detection algorithm
- [ ] Pattern display in assessment form
- [ ] Estimator performance report
- [ ] Suggestion acceptance tracking

**Quality Gates:**
- [ ] Patterns identified on 100+ job dataset
- [ ] Confidence scoring validated
- [ ] Suggestion acceptance >30%

---

### V1.2 Release (Integrations)

**Must Have:**
- [ ] QuickBooks integration
- [ ] SMS notifications
- [ ] Payment processing (Stripe)

---

## Future Considerations

### Phase 2 Features (6-12 Months)

**Mobile Enhancements:**
- Voice input for notes
- Barcode scanning for equipment
- Digital signatures
- Native mobile apps (iOS/Android) if PWA limitations encountered

**Office Enhancements:**
- Gantt chart for scheduling
- Resource utilization reports
- Customer portal (view proposals, pay invoices)
- Crew time tracking
- Equipment maintenance tracking

**Learning System:**
- Predictive scheduling (suggest optimal start dates)
- Price optimization (suggest pricing based on market)
- Customer lifetime value prediction
- Churn risk identification

**Integrations:**
- Accounting: Xero, FreshBooks
- Communication: Slack, Microsoft Teams
- Calendar: Google Calendar, Outlook
- Storage: Google Drive, Dropbox
- CRM: HubSpot, Salesforce

---

### Phase 3 Features (12-24 Months)

**Advanced Analytics:**
- Custom report builder
- Data warehouse and BI tool integration
- Predictive analytics (ML models)
- Benchmarking (compare to industry averages)

**Compliance:**
- Automated regulatory notifications (EPA, OSHA)
- Worker certification tracking
- Training management
- Compliance audit preparation

**White Label:**
- Custom branding for larger customers
- Custom domains
- API for external integrations

**Enterprise:**
- Multi-location support
- Franchise management
- Role-based dashboards
- Advanced permissions (field-level)

---

## Appendices

### Appendix A: Glossary

**Terms:**
- **Assessment**: On-site evaluation of hazardous materials, captured in field
- **Estimate**: Calculated cost and duration for remediation work
- **Proposal**: Customer-facing document with pricing and scope
- **Schedule**: Planned timeline with crew/equipment assignments
- **Containment Level**: OSHA classification for asbestos work (1-4, 4 being most restrictive)
- **Clearance**: Final air quality test to confirm successful remediation
- **Abatement**: Removal of hazardous materials
- **Remediation**: Broader term including removal, encapsulation, and other methods
- **Friable**: Asbestos material that can be crumbled by hand pressure

---

### Appendix B: Regulatory References

**OSHA Standards:**
- 29 CFR 1926.1101 (Asbestos in Construction)
- 29 CFR 1910.1200 (Hazard Communication)

**EPA Guidelines:**
- EPA 402-K-01-001 (Mold Remediation in Schools and Commercial Buildings)
- EPA 560/5-85-024 (Asbestos in Buildings)

**State Regulations:**
- Various state-specific licensing and notification requirements
- State-specific disposal requirements

---

### Appendix C: Competitive Analysis

**ServiceTitan:** ($500-2000/mo)
- Comprehensive field service management
- HVAC/plumbing focus
- Too expensive for target market
- Desktop-first

**Jobber:** ($49-229/mo)
- Generic field service software
- Good mobile app
- Not remediation-specific
- No learning capabilities

**Housecall Pro:** ($49-249/mo)
- Consumer service focus
- Easy to use
- Not commercial/industrial focused
- Limited compliance features

**HazardOS Differentiation:**
- Purpose-built for remediation
- Learning system (unique)
- Mobile-first PWA
- Mid-market pricing
- Compliance-aware

---

### Appendix D: Open Questions

**Questions to Resolve:**
1. Should we support multiple languages initially? (Decision: English only for MVP)
2. Do we need offline support for proposals/invoices, or only assessments? (Decision: Assessments only)
3. Should we build native mobile apps or is PWA sufficient? (Decision: PWA first, native if needed later)
4. Integration priority: QuickBooks, Stripe, or SMS first? (Decision: QuickBooks most requested)
5. How much customization of proposals/invoices should we allow? (Decision: Limited templates initially)

---

## Document Control

**Version:** 1.0  
**Last Updated:** January 31, 2026  
**Document Owner:** Mark Zweig  
**Reviewers:** Development Team, Beta Customers  
**Status:** Approved for Development

**Approval:**
- [ ] Product Owner: _________________ Date: _______
- [ ] Technical Lead: ________________ Date: _______
- [ ] UX Designer: ___________________ Date: _______

**Change Log:**
- v1.0 (2026-01-31): Initial PRD

**Next Review:** End of MVP development sprint

---

*This is a living document. Updates will be tracked in version control and communicated to the development team.*
