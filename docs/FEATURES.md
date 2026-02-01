# HazardOS Features Documentation

**Complete feature reference for the HazardOS platform**

> **Last Updated**: February 1, 2026 (v0.1.1)
> **Status**: Production Ready with Comprehensive Testing

---

## Table of Contents

1. [API Standardization & Testing](#api-standardization--testing)
2. [Job Completion System](#job-completion-system)
3. [Customer Feedback System](#customer-feedback-system)
4. [Analytics & Variance Tracking](#analytics--variance-tracking)
5. [QuickBooks Integration](#quickbooks-integration)
6. [Multiple Contacts System](#multiple-contacts-system)
7. [Activity Logging](#activity-logging)
8. [Site Survey Mobile Wizard](#site-survey-mobile-wizard)
9. [Pricing Management](#pricing-management)
10. [Customer Management](#customer-management)
11. [Estimate Builder](#estimate-builder)
12. [Invoice Management](#invoice-management)

---

## API Standardization & Testing

### Overview

Comprehensive API standardization with secure error handling, consistent validation, and extensive test coverage across all critical endpoints.

### Features

#### Standardized Error Handling

All API routes return consistent, secure error responses.

**Error Response Structure**:
```json
{
  "error": "User-friendly error message",
  "type": "ERROR_TYPE"
}
```

**Error Types**:
- `UNAUTHORIZED` (401) - Missing or invalid authentication
- `FORBIDDEN` (403) - Insufficient permissions
- `VALIDATION_ERROR` (400) - Invalid input data
- `NOT_FOUND` (404) - Resource not found
- `INTERNAL_ERROR` (500) - Server error (details logged server-side only)

**Security Features**:
- No internal error details exposed to clients
- Stack traces logged server-side only
- Database error messages sanitized
- Generic error messages for production safety

**Example Error Response**:
```json
{
  "error": "Failed to fetch customers",
  "type": "INTERNAL_ERROR"
}
```

Internal logs contain full details for debugging, but clients receive only safe, generic messages.

#### Comprehensive Test Suite

**10 API Test Files** covering critical endpoints:

1. **Customers API** (`test/api/customers.test.ts` - 15 tests)
   - GET /api/customers - List, search, filter, pagination
   - POST /api/customers - Create with validation
   - Authentication checks
   - Input sanitization
   - Error handling

2. **Jobs API** (`test/api/jobs.test.ts` - 11 tests)
   - GET /api/jobs - List jobs with filtering
   - POST /api/jobs - Create new jobs
   - Status filtering
   - Secure error responses

3. **Jobs Operations** (`test/api/jobs-id.test.ts` - 9 tests)
   - GET /api/jobs/[id] - Retrieve by ID
   - PATCH /api/jobs/[id] - Update job
   - DELETE /api/jobs/[id] - Delete job
   - Permission checks

4. **Invoices API** (`test/api/invoices.test.ts` - 8 tests)
   - GET /api/invoices - List with pagination
   - POST /api/invoices - Create invoices
   - Database constraint handling

5. **Estimates API** (`test/api/estimates.test.ts` - 8 tests)
   - GET /api/estimates - List estimates
   - POST /api/estimates - Create estimates
   - Validation and foreign keys

6. **Proposals API** (`test/api/proposals.test.ts` - 8 tests)
   - GET /api/proposals - List proposals
   - POST /api/proposals - Create proposals
   - RPC function calls
   - Estimate linkage

7. **Proposal Operations** (`test/api/proposals-id.test.ts` - 6 tests)
   - GET /api/proposals/[id] - Retrieve proposal
   - PATCH /api/proposals/[id] - Update proposal
   - Status transitions

8. **Analytics API** (`test/api/analytics.test.ts` - 8 tests)
   - GET /api/analytics/jobs-by-status
   - GET /api/analytics/revenue
   - Date range filtering
   - Permission-based access

9. **Settings/Pricing** (`test/api/settings-pricing.test.ts` - 6 tests)
   - GET /api/settings/pricing
   - PATCH /api/settings/pricing
   - Multi-tenant isolation

10. **Integrations** (`test/api/integrations.test.ts` - 5 tests)
    - QuickBooks OAuth
    - Sync operations
    - Connection status

**Total**: 84+ comprehensive test cases

#### Test Quality Standards

All tests follow these standards:

**Security Testing**:
- Authentication required for protected routes
- Authorization checks for multi-tenant data
- No internal details in error responses
- Input validation with Zod schemas
- SQL injection prevention verified

**Error Scenarios Tested**:
- Unauthenticated requests (401)
- Insufficient permissions (403)
- Invalid input data (400)
- Missing resources (404)
- Database errors (500)
- Malformed JSON (400)

**Test Structure**:
- Descriptive test names
- AAA pattern (Arrange, Act, Assert)
- Proper mock cleanup
- Edge case coverage

#### Validation Schemas

Consistent validation using Zod across all API routes.

**Example Customer Validation**:
```typescript
const customerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  status: z.enum(['lead', 'prospect', 'customer', 'inactive'])
})
```

**Benefits**:
- Type-safe validation
- Automatic error messages
- Runtime type checking
- Consistent validation logic

#### Multi-Tenant Security

All API routes enforce multi-tenant data isolation.

**Implementation**:
```typescript
// 1. Get authenticated user
const user = await supabase.auth.getUser()
if (!user) return unauthorized()

// 2. Get user's organization
const profile = await getProfile(user.id)

// 3. Filter by organization
const data = await supabase
  .from('customers')
  .select()
  .eq('organization_id', profile.organization_id)
```

**Security Guarantees**:
- Users can only access their organization's data
- Row-Level Security (RLS) policies enforce isolation
- API routes verify organization ownership
- Tests verify multi-tenant separation

#### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npm run test test/api/customers.test.ts

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

#### Test Coverage Metrics

Current coverage (as of v0.1.1):
- API Routes: ~22% (10/46 routes tested)
- Total Test Cases: 84+
- Components: ~5% (pending)
- Services: ~15% (pending)
- Overall: ~12% (target: 80%)

See [TESTING.md](./TESTING.md) for complete testing documentation.

---

---

## Job Completion System

### Overview

Comprehensive job completion tracking with time entries, material usage, photos, checklists, and variance analysis.

### Features

#### Time Entry Tracking
Track crew time for accurate billing and variance analysis.

**Work Types**:
- Regular hours
- Overtime
- Travel time
- Setup time
- Cleanup time
- Supervision

**Capabilities**:
- Multiple crew members per job
- Daily time entry logging
- Billable/non-billable flag
- Hourly rate tracking
- Automatic total calculation

**Example Usage**:
```typescript
// Add time entry
POST /api/jobs/[id]/time-entries
{
  "work_date": "2026-02-15",
  "hours": 8.5,
  "work_type": "regular",
  "profile_id": "crew-member-uuid",
  "hourly_rate": 45.00,
  "billable": true,
  "description": "Asbestos removal - main area"
}
```

#### Material Usage Tracking

Compare estimated vs. actual material consumption.

**Features**:
- Link to estimated materials
- Track actual quantities used
- Calculate variance (quantity and percentage)
- Cost tracking per material
- Automatic total calculation

**Variance Metrics**:
- Quantity variance: `actual - estimated`
- Percentage variance: `(actual - estimated) / estimated * 100`

**Example**:
```
Material: Poly Sheeting (6mil)
Estimated: 500 sq ft
Actual Used: 550 sq ft
Variance: +50 sq ft (+10%)
Unit Cost: $0.50/sq ft
Total Cost: $275.00
```

#### Completion Photos

Categorized photo documentation with metadata.

**Photo Types**:
- **Before**: Pre-work condition
- **During**: Work in progress
- **After**: Completed work
- **Issue**: Problems encountered
- **Documentation**: Permits, signs, etc.

**Metadata Captured**:
- GPS coordinates
- Timestamp
- Camera make/model
- Image dimensions
- File size
- EXIF data

**Storage**:
- Supabase Storage bucket: `job-completion-photos`
- CDN-distributed for fast access
- RLS policies for security

#### Completion Checklists

Ensure all required tasks are completed before job closure.

**Categories**:
1. **Safety** (Red)
   - PPE used properly
   - Safety perimeter maintained
   - No incidents reported
   - Air quality monitored

2. **Quality** (Blue)
   - Work meets specifications
   - Materials properly contained
   - Area clearance testing

3. **Cleanup** (Green)
   - Work area cleaned
   - Equipment decontaminated
   - Waste properly bagged
   - Disposal manifests completed

4. **Documentation** (Purple)
   - Before photos taken
   - After photos taken
   - Time entries complete
   - Material usage recorded

5. **Custom** (Gray)
   - Organization-specific items

**Checklist Item**:
```typescript
{
  "item_name": "PPE Used Properly",
  "category": "safety",
  "is_required": true,
  "is_completed": true,
  "completed_by": "uuid",
  "completed_at": "2026-02-15T16:00:00Z",
  "completion_notes": "All crew wore respirators and suits",
  "evidence_photo_ids": ["photo-uuid-1", "photo-uuid-2"]
}
```

#### Completion Workflow

```
1. JOB IN PROGRESS
   - Crew logs time daily
   - Materials tracked as used
   - Photos uploaded during work
   ↓
2. JOB FINISHING
   - Complete checklist items
   - Upload final photos
   - Add field notes
   ↓
3. SUBMIT FOR REVIEW (Technician)
   - Review all entries
   - Add issues encountered
   - Add recommendations
   - Get customer signature (optional)
   - Submit completion
   ↓
4. MANAGER REVIEW
   - Review variance
   - Check checklist completion
   - Verify photos
   - Approve or Reject
   ↓
5. APPROVED
   - Job marked complete
   - Invoice can be generated
   - Feedback survey triggered
```

#### Variance Analysis

Automatic calculation of estimated vs. actual.

**Metrics Calculated**:
- Hours variance (hours & percentage)
- Material cost variance (dollars & percentage)
- Labor cost variance
- Total cost variance

**Dashboard View**:
```
Job: JOB-2026-001 - Asbestos Removal Building A

HOURS
Estimated: 40.0 hrs
Actual: 42.5 hrs
Variance: +2.5 hrs (+6.25%)

COSTS
Estimated Labor: $1,800
Actual Labor: $1,912.50
Estimated Materials: $500
Actual Materials: $550
Total Variance: +$162.50 (+7.13%)

STATUS: ⚠️ Slightly Over Budget
```

#### Customer Sign-Off

Digital signature capture for job completion.

**Features**:
- Canvas-based signature drawing
- Signature name entry
- Timestamp capture
- Base64 encoding for storage
- PDF inclusion for records

---

## Customer Feedback System

### Overview

Automated post-job feedback collection with NPS scoring, testimonials, and review requests.

### Features

#### Feedback Surveys

Token-based public surveys for customer feedback.

**Survey Flow**:
```
Job Completed
    ↓
Create Survey (API)
    ↓
Generate Access Token (64-char unique)
    ↓
Send Email with Survey Link
    ↓
Customer Clicks Link
    ↓
Public Survey Page (No Login)
    ↓
Customer Completes Survey
    ↓
Submit Feedback
    ↓
Optional: Request Review on Platform
```

**Survey Questions**:
1. **Overall Rating** (1-5 stars)
2. **Quality Rating** (1-5 stars)
3. **Communication Rating** (1-5 stars)
4. **Timeliness Rating** (1-5 stars)
5. **Value Rating** (1-5 stars)
6. **Would Recommend?** (Yes/No)
7. **Net Promoter Score** (0-10)
   - 0-6: Detractor
   - 7-8: Passive
   - 9-10: Promoter
8. **Feedback Text** (Open-ended)
9. **Improvement Suggestions** (Open-ended)
10. **Testimonial** (Optional with permission checkbox)

**Public Survey URL**:
```
https://hazardos.app/feedback/[token]
```

**Security**:
- Token expires after 30 days
- One-time use tracking
- Rate limiting on submissions
- IP address logging
- User agent tracking

#### Testimonial Management

Collect and manage customer testimonials.

**Testimonial Workflow**:
```
Customer Completes Survey
    ↓
Writes Testimonial
    ↓
Grants Permission to Use
    ↓
Saved as "Pending Approval"
    ↓
Manager Reviews
    ↓
Approve or Reject
    ↓
If Approved: Available for Marketing
```

**Testimonial Display**:
```
"Professional and thorough. They completed the asbestos
removal ahead of schedule and left the building spotless."

- John Doe, Acme Corporation
  Rating: 5/5 stars
  Job: JOB-2026-001
  Completed: February 1, 2026
```

#### Review Requests

Encourage positive reviews on external platforms.

**Supported Platforms**:
- Google (Primary)
- Yelp
- Facebook
- Better Business Bureau (BBB)
- HomeAdvisor
- Angi (formerly Angie's List)

**Review Request Flow**:
```
Customer Completes Survey
    ↓
If Rating >= 4 stars
    ↓
Show Review Request CTA
    ↓
Customer Clicks Platform Icon
    ↓
Track Click Event
    ↓
Redirect to Platform Review URL
    ↓
(Optional) Track Review Completion
```

**Metrics Tracked**:
- Requests sent
- Click-through rate
- Completion rate (if trackable)

#### Feedback Statistics

Organization-wide feedback analytics.

**Metrics Available**:
```json
{
  "total_surveys": 156,
  "completed_surveys": 98,
  "response_rate": 62.8,

  "avg_overall_rating": 4.7,
  "avg_quality_rating": 4.8,
  "avg_communication_rating": 4.6,
  "avg_timeliness_rating": 4.5,
  "avg_value_rating": 4.7,

  "nps_score": 72.5,
  "promoters_count": 78,
  "passives_count": 14,
  "detractors_count": 6,

  "would_recommend_count": 92,
  "would_recommend_percent": 93.9,

  "testimonials_count": 45,
  "testimonials_approved": 32
}
```

**NPS Calculation**:
```
NPS = (% Promoters) - (% Detractors)
NPS = (78/98 * 100) - (6/98 * 100)
NPS = 79.6 - 6.1
NPS = 73.5 (Excellent)
```

**NPS Benchmarks**:
- Above 70: Excellent
- 50-70: Great
- 30-50: Good
- 0-30: Needs Improvement
- Below 0: Critical

---

## Analytics & Variance Tracking

### Overview

Comprehensive analytics for job performance, cost variance, and business insights.

### Variance Analysis

Track estimated vs. actual performance across all jobs.

**Available Reports**:

#### 1. Jobs by Status
Current distribution of jobs by status.

```
Scheduled: 15 jobs
In Progress: 8 jobs
On Hold: 2 jobs
Completed: 127 jobs
Cancelled: 3 jobs
```

#### 2. Variance Summary
Aggregate variance metrics.

```
Total Completed Jobs: 127
Over Budget: 32 (25%)
Under Budget: 28 (22%)
On Target: 67 (53%)

Average Hours Variance: +3.2 hours (+8.1%)
Average Cost Variance: +$450 (+6.8%)

Total Hours Variance: +406 hours
Total Cost Variance: +$57,150
```

#### 3. Variance by Job Type
Breakdown by hazard type.

```
ASBESTOS JOBS
- Jobs: 78
- Avg Hours Variance: +4.1 hrs (+10.3%)
- Avg Cost Variance: +$580 (+8.2%)

MOLD JOBS
- Jobs: 32
- Avg Hours Variance: +1.8 hrs (+4.5%)
- Avg Cost Variance: +$220 (+3.8%)

LEAD JOBS
- Jobs: 17
- Avg Hours Variance: +2.1 hrs (+5.3%)
- Avg Cost Variance: +$310 (+5.1%)
```

#### 4. Top Variance Jobs
Jobs with highest variance (positive or negative).

```
Job: JOB-2026-015 - Asbestos School Renovation
Estimated: 80 hrs | Actual: 96 hrs | Variance: +16 hrs (+20%)
Cost Variance: +$2,400 (+18%)
Reason: Unexpected additional contamination found

Job: JOB-2026-022 - Mold Residential
Estimated: 24 hrs | Actual: 18 hrs | Variance: -6 hrs (-25%)
Cost Variance: -$540 (-15%)
Reason: Smaller affected area than estimated
```

#### 5. Material Variance Analysis
Material-specific variance tracking.

```
POLYETHYLENE SHEETING (6mil)
- Total Jobs: 78
- Avg Estimated: 450 sq ft
- Avg Actual: 495 sq ft
- Variance: +45 sq ft (+10%)
- Common Reason: Coverage overlap requirements

HEPA FILTERS
- Total Jobs: 78
- Avg Estimated: 12 filters
- Avg Actual: 14 filters
- Variance: +2 filters (+16.7%)
- Common Reason: Extended job duration
```

### Revenue Analytics

Track revenue, collections, and financial performance.

**Metrics**:
- Total contract value (by period)
- Invoiced amount
- Collected amount
- Outstanding receivables
- Average job value
- Revenue by customer
- Revenue by hazard type

---

## QuickBooks Integration

### Overview

Bi-directional sync with QuickBooks Online for customers and invoices.

### Features

#### OAuth Connection
Secure OAuth 2.0 connection to QuickBooks.

**Connection Flow**:
```
1. Admin clicks "Connect QuickBooks"
   ↓
2. Redirect to Intuit OAuth page
   ↓
3. User authorizes HazardOS
   ↓
4. Callback to HazardOS with auth code
   ↓
5. Exchange code for access/refresh tokens
   ↓
6. Store encrypted tokens in database
   ↓
7. Test connection with company info API
   ↓
8. Display: "Connected to [Company Name]"
```

#### Customer Sync
Sync customers between HazardOS and QuickBooks.

**Sync Options**:
- **Push to QuickBooks**: Create QB customers from HazardOS
- **Pull from QuickBooks**: Import QB customers to HazardOS
- **Two-way sync**: Keep both systems in sync

**Mapping**:
```
HazardOS → QuickBooks
----------------------------------------
name            → DisplayName
email           → PrimaryEmailAddr.Address
phone           → PrimaryPhone.FreeFormNumber
address         → BillAddr.Line1
city            → BillAddr.City
state           → BillAddr.CountrySubDivisionCode
zip             → BillAddr.PostalCode
notes           → Notes
```

**Conflict Resolution**:
- Last updated wins
- Manual review for major conflicts
- Audit log of all changes

#### Invoice Sync
Sync invoices for seamless accounting.

**HazardOS Invoice → QB Invoice**:
```
Invoice Number
Customer (matched or created)
Line Items:
  - Description
  - Quantity
  - Rate
  - Amount
Subtotal
Tax (if applicable)
Total Amount
Due Date
```

**Sync Status Tracking**:
```
✓ Synced - Invoice created in QB
⚠️ Pending - Queued for sync
❌ Failed - Sync error (with details)
🔄 Updated - QB invoice modified
```

#### Sync Logs
Detailed logging of all sync operations.

**Log Entry**:
```json
{
  "timestamp": "2026-02-01T10:30:00Z",
  "operation": "customer_sync",
  "direction": "hazardos_to_qb",
  "entity_type": "customer",
  "entity_id": "uuid",
  "qb_id": "123",
  "status": "success",
  "details": {
    "customer_name": "Acme Corp",
    "action": "created"
  }
}
```

---

## Multiple Contacts System

### Overview

Manage multiple contacts per customer with role-based organization and communication preferences. Ideal for enterprise customers with different decision-makers, billing contacts, and on-site coordinators.

### Features

#### Contact Roles

Each contact can have a specific role:

**Primary Contact**:
- Main point of contact for the customer
- Automatically synced to customer record
- Only one primary contact per customer
- When set as primary, updates customer's main contact info

**Billing Contact**:
- Receives invoices and payment communications
- Handles financial matters
- Multiple billing contacts allowed

**Site Contact**:
- On-site coordinator for job execution
- Receives scheduling notifications
- Multiple site contacts allowed

**Scheduling Contact**:
- Handles appointment scheduling
- Receives calendar updates
- Multiple scheduling contacts allowed

**General Contact**:
- General purpose contact
- No specific role assignment

#### Primary Contact Management

**Automatic Primary Assignment**:
- First contact created is automatically set as primary
- Primary contact syncs to customer record fields
- Customer name, email, and phone updated from primary contact

**Setting Primary Contact**:
```
1. Open customer details
2. Navigate to Contacts tab
3. Click menu on contact card
4. Select "Set as Primary"
5. Previous primary contact automatically demoted
6. Customer record updated with new primary info
```

**Primary Contact Deletion**:
- When primary contact is deleted, system automatically promotes another contact
- Priority order: primary role → billing role → site role → scheduling role → oldest contact
- Customer record updated with new primary contact info

#### Contact Information

Each contact stores:

**Personal Information**:
- Name (required)
- Job title
- Email address
- Phone number
- Mobile number

**Communication Preferences**:
- Preferred contact method (email, phone, mobile, any)
- Notes about communication preferences

**Contact Notes**:
- Internal notes about the contact
- Access restrictions
- Special instructions

#### Contact List UI

**Features**:
- Visual contact cards with role badges
- Primary contact highlighted with star icon
- Quick access to email and phone
- Role-based color coding:
  - Primary: Blue
  - Billing: Green
  - Site: Orange
  - Scheduling: Purple
  - General: Gray

**Actions Per Contact**:
- Edit contact information
- Set as primary
- Delete contact
- View activity history

#### Add/Edit Contact Dialog

**Form Fields**:
```
Name * (required)
Title
Email
Phone
Mobile
Role (dropdown: Primary, Billing, Site, Scheduling, General)
Preferred Contact Method (dropdown: Email, Phone, Mobile, Any)
Set as Primary Contact (checkbox)
Notes (textarea)
```

**Validation**:
- Name is required
- Email format validated
- Phone numbers validated
- Duplicate prevention within same customer

#### Database Schema

```sql
CREATE TABLE customer_contacts (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  name TEXT NOT NULL,
  title TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  role TEXT NOT NULL, -- primary, billing, site, scheduling, general
  is_primary BOOLEAN NOT NULL DEFAULT false,
  preferred_contact_method TEXT, -- email, phone, mobile, any
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Indexes**:
- customer_id (for fast lookups)
- customer_id + is_primary (for primary contact queries)
- customer_id + role (for role-based queries)

#### Sync to Customer Table

**Automatic Sync Trigger**:
```sql
-- When contact is set as primary
-- Customer table is automatically updated with:
UPDATE customers SET
  name = contact.name,
  email = contact.email,
  phone = COALESCE(contact.phone, contact.mobile)
WHERE id = contact.customer_id;
```

#### Service Methods

**ContactsService Methods**:
```typescript
// List all contacts for a customer
ContactsService.list(customerId)

// Get single contact
ContactsService.get(contactId)

// Create new contact
ContactsService.create(input)

// Update contact
ContactsService.update(contactId, input)

// Delete contact
ContactsService.delete(contactId)

// Set as primary contact
ContactsService.setPrimary(contactId)

// Get contacts by role
ContactsService.getByRole(customerId, role)

// Get primary contact
ContactsService.getPrimary(customerId)
```

#### Activity Logging

All contact operations are logged:
- Contact created
- Contact updated
- Contact deleted
- Contact set as primary

**Example Activity Log**:
```
Jane Doe created contact "John Smith (Acme Corp)"
Mike Wilson set "Sarah Jones" as primary contact (XYZ Industries)
Admin User deleted contact "Bob Johnson (ABC Company)"
```

#### Use Cases

**Enterprise Customer**:
```
Customer: Acme Corporation

Contacts:
1. John Smith (Primary, Scheduling)
   - Project Manager
   - john@acme.com
   - Handles all project coordination

2. Jane Doe (Billing)
   - Accounts Payable Manager
   - jane@acme.com
   - Receives all invoices

3. Bob Wilson (Site)
   - Facilities Manager
   - bob@acme.com, (555) 123-4567
   - On-site contact during jobs
```

**Residential Customer**:
```
Customer: Smith Family

Contacts:
1. Mary Smith (Primary)
   - Homeowner
   - mary@example.com
   - Main decision maker

2. John Smith (General)
   - Spouse
   - john@example.com
   - Backup contact
```

#### Integration Points

**Email Communications**:
- Proposals sent to primary contact
- Invoices sent to billing contacts
- Scheduling notifications to scheduling contacts
- Job updates to site contacts

**Activity Feed**:
- Contact creation logged
- Contact role changes tracked
- Communication history linked to specific contacts

**QuickBooks Sync**:
- Primary contact synced as QB customer contact
- Additional contacts stored in QB customer notes

---

## Activity Logging

### Overview

Comprehensive audit trail of all user actions and system events with support for manual activity logging.

### Logged Activities

**User Actions**:
- Login/Logout events
- Customer created/updated/deleted
- Contact created/updated/deleted/set as primary
- Site survey created/updated
- Estimate approved
- Job status changed
- Invoice generated/sent
- Settings modified
- User invited/removed

**System Events**:
- Scheduled jobs started
- Automatic notifications sent
- Sync operations completed
- Background tasks executed

**Manual Activities**:
- Notes added
- Phone calls logged
- Customer communications

### Activity Log Entry

```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "user_id": "uuid",
  "user_name": "John Smith",
  "action": "customer_created",
  "entity_type": "customer",
  "entity_id": "uuid",
  "entity_name": "Acme Corporation",
  "old_values": null,
  "new_values": {
    "name": "Acme Corporation",
    "email": "contact@acme.com",
    "status": "lead"
  },
  "description": null,
  "created_at": "2026-02-01T10:00:00Z"
}
```

### Manual Activity Logging

#### Adding Notes

Add contextual notes to any entity (customer, job, estimate, etc.):

**Via UI**:
```
1. Navigate to entity (customer, job, etc.)
2. Click "Add Activity" button
3. Select "Note" tab
4. Enter note content
5. Click "Log Activity"
```

**Note Entry**:
```json
{
  "action": "note",
  "entity_type": "customer",
  "entity_id": "uuid",
  "entity_name": "Acme Corporation",
  "description": "Customer requested follow-up call next week to discuss additional services"
}
```

#### Logging Phone Calls

Track all customer phone interactions:

**Via UI**:
```
1. Navigate to entity
2. Click "Add Activity" button
3. Select "Phone Call" tab
4. Choose direction: Outbound or Inbound
5. Enter duration (optional)
6. Add call notes
7. Click "Log Activity"
```

**Call Direction Options**:
- **Outbound**: Call made to customer
- **Inbound**: Call received from customer

**Call Entry**:
```json
{
  "action": "call",
  "entity_type": "customer",
  "entity_id": "uuid",
  "entity_name": "Acme Corporation",
  "description": "Discussed project timeline and budget constraints",
  "new_values": {
    "direction": "outbound",
    "duration": 15
  }
}
```

#### Activity Types

**Notes**:
- General customer communications
- Follow-up reminders
- Important information
- Meeting summaries
- Customer requests

**Calls**:
- Outbound sales calls
- Inbound customer inquiries
- Follow-up discussions
- Support calls
- Appointment confirmations

### Activity Timeline UI

Real-time activity feed on dashboard and entity pages.

**Display Format**:
```
🆕 John Smith created customer "Acme Corporation"
   2 minutes ago

📝 Sarah Johnson updated estimate EST-2026-045
   15 minutes ago

📞 Mike Wilson called "Acme Corporation" (outbound, 15 min)
   30 minutes ago
   Note: Discussed project timeline and budget

📋 Jane Doe added note to "XYZ Industries"
   1 hour ago
   Note: Customer requested follow-up next week

✅ System completed job JOB-2026-012
   2 hours ago

📄 System generated invoice INV-2026-089
   3 hours ago
```

**Activity Icons**:
- 🆕 Created
- 📝 Updated
- 🗑️ Deleted
- ✅ Completed
- 📞 Phone call
- 📋 Note added
- 📄 Document generated
- 📧 Email sent
- ⭐ Status changed

### Add Activity Dialog

**User Interface**:
```
┌─────────────────────────────────────┐
│ Log Activity                    ✕   │
├─────────────────────────────────────┤
│ Add a note or log a phone call      │
│                                     │
│ [Note] [Phone Call]                 │
│                                     │
│ Note *                              │
│ ┌─────────────────────────────────┐ │
│ │ Enter your note here...         │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│         [Cancel] [Log Activity]     │
└─────────────────────────────────────┘
```

**Phone Call Tab**:
```
┌─────────────────────────────────────┐
│ Log Activity                    ✕   │
├─────────────────────────────────────┤
│ Add a note or log a phone call      │
│                                     │
│ [Note] [Phone Call]                 │
│                                     │
│ Call Direction                      │
│ [📞 Outbound] [📞 Inbound]          │
│                                     │
│ Duration (minutes)                  │
│ [15                    ]            │
│                                     │
│ Call Notes                          │
│ ┌─────────────────────────────────┐ │
│ │ Summary of conversation...      │ │
│ └─────────────────────────────────┘ │
│                                     │
│         [Cancel] [Log Activity]     │
└─────────────────────────────────────┘
```

### Activity Service Methods

```typescript
// Automatic activity logging
Activity.created(entityType, entityId, entityName)
Activity.updated(entityType, entityId, entityName, changes)
Activity.deleted(entityType, entityId, entityName)
Activity.statusChanged(entityType, entityId, entityName, oldStatus, newStatus)
Activity.sent(entityType, entityId, entityName)
Activity.signed(entityType, entityId, entityName)
Activity.paid(entityType, entityId, entityName, amount)

// Manual activity logging
Activity.note(entityType, entityId, entityName, noteText)
Activity.call(entityType, entityId, entityName, {
  direction: 'inbound' | 'outbound',
  duration?: number,
  notes?: string
})
```

### Integration with Other Features

**Customer Management**:
- All customer interactions logged
- Contact changes tracked
- Status progression visible

**Job Management**:
- Job lifecycle tracked
- Status changes logged
- Crew communications recorded

**Sales Process**:
- Proposal sent tracked
- Follow-up calls logged
- Customer communications centralized

**Invoicing**:
- Invoice generation logged
- Payment tracking
- Collection calls recorded

---

## Site Survey Mobile Wizard

### Overview

Multi-step mobile-optimized wizard for field data collection.

### Wizard Steps

#### 1. Property Information
- Property name
- Address (with autocomplete)
- GPS coordinates (auto-captured)
- Property type (residential, commercial, industrial)
- Access instructions

#### 2. Hazard Assessment
- Hazard type selection
- Affected areas
- Estimated square footage
- Severity level
- Visible damage description

#### 3. Photo Documentation
- Before photos (required)
- Hazard photos with annotations
- Access points
- Adjacent areas
- Auto-categorization by context

#### 4. Environmental Conditions
- Temperature
- Humidity
- Ventilation
- Occupancy status
- Weather conditions

#### 5. Safety Concerns
- Access issues
- Utilities status
- Structural concerns
- Special precautions needed

#### 6. Scope of Work
- Work description
- Equipment needed
- Crew size estimate
- Duration estimate

#### 7. Customer Information
- Link to existing customer or create new
- On-site contact name
- Contact phone/email
- Preferred contact method

#### 8. Review & Submit
- Review all entered data
- Make edits if needed
- Add final notes
- Submit survey

### Offline Support

**Capabilities**:
- Complete surveys offline
- Photos queued for upload
- Auto-sync when online
- Conflict resolution
- Sync status indicators

**Storage**:
- IndexedDB for form data
- Service Worker for app shell
- Queue management for uploads

---

## Pricing Management

### Overview

Centralized pricing configuration for accurate estimates.

### Pricing Tables

#### 1. Labor Rates
Define hourly rates by role.

```
Role: Lead Abatement Technician
  Regular Rate: $55.00/hr
  Overtime Rate: $82.50/hr (1.5x)

Role: Asbestos Worker
  Regular Rate: $45.00/hr
  Overtime Rate: $67.50/hr (1.5x)

Role: Helper
  Regular Rate: $25.00/hr
  Overtime Rate: $37.50/hr (1.5x)
```

#### 2. Equipment Rates
Rental and usage rates for equipment.

```
Negative Air Machine
  Type: Daily Rental
  Rate: $75.00/day

Decontamination Unit
  Type: Weekly Rental
  Rate: $450.00/week

HEPA Vacuum
  Type: Daily Rental
  Rate: $35.00/day
```

#### 3. Material Costs
Material pricing with supplier info.

```
Polyethylene Sheeting (6mil)
  Unit: sq ft
  Cost: $0.50/sq ft
  Supplier: ABC Supply Co
  SKU: POLY-6MIL-CLR

HEPA Filter
  Unit: each
  Cost: $45.00/each
  Supplier: XYZ Industrial
  SKU: HEPA-20X20
```

#### 4. Disposal Fees
Hazardous waste disposal costs.

```
Asbestos Waste
  Type: Bagged Material
  Unit: cubic yard
  Fee: $125.00/cy
  Facility: State-Approved Landfill

Lead Paint Waste
  Type: Contained Material
  Unit: cubic yard
  Fee: $95.00/cy
  Facility: EPA-Certified Disposal
```

#### 5. Travel Rates
Mileage and travel time.

```
Mileage Rate: $0.67/mile (IRS standard)
Travel Time: $35.00/hr
Minimum Trip Charge: $75.00
```

### Pricing Settings

**Organization-level markup**:
- Labor markup: 20%
- Materials markup: 35%
- Equipment markup: 15%
- Disposal markup: 10%

**Discount Options**:
- Volume discounts
- Repeat customer discounts
- Emergency service premiums

---

## Customer Management

Comprehensive CRM for customer relationships.

### Features

- Contact management
- Lead tracking
- Status workflow (Lead → Prospect → Customer)
- Communication history
- Linked site surveys
- Linked jobs
- Revenue tracking
- Custom notes
- Marketing consent

See [Customer Management Guide](./CUSTOMER-MANAGEMENT.md) for details.

---

## Estimate Builder

**Status**: Schema ready, UI in development

Create detailed cost estimates from site surveys.

### Planned Features

- Visual estimate builder
- Line item management
- Automatic pricing lookup
- Material quantity calculator
- Labor hour calculator
- Subtotal/tax/total calculations
- Multiple estimate versions
- Estimate comparison
- PDF export

---

## Invoice Management

**Status**: Production ready

Generate and track invoices.

### Features

- Invoice generation from jobs
- Line item management
- Payment tracking
- Partial payments
- Payment history
- Send invoices to customers
- PDF generation
- QuickBooks sync
- Aging reports

---

## Advanced Reporting System

### Overview

Comprehensive reporting and analytics with Excel/CSV export capabilities for business intelligence and decision-making.

### Features

#### Report Types

**Sales Performance Report**:
- Monthly sales metrics
- Revenue by sales rep
- Conversion rates
- Pipeline velocity
- Year-over-year comparisons

**Job Cost Report**:
- Estimated vs. actual costs
- Profit margins by job
- Material cost analysis
- Labor efficiency metrics
- Cost variance trends

**Lead Source ROI Report**:
- Lead count by source
- Conversion rates by source
- Customer acquisition cost
- Revenue per source
- ROI calculations

#### Report Configuration

**Date Range Options**:
- Today
- Yesterday
- Last 7 days
- Last 30 days
- This month
- Last month
- This quarter
- This year
- Custom date range

**Report Settings**:
```typescript
{
  "date_range": {
    "type": "this_month",
    "start": "2026-02-01",
    "end": "2026-02-28"
  },
  "filters": {
    "customer_id": "optional-uuid",
    "status": "completed",
    "hazard_type": "asbestos"
  }
}
```

#### Excel Export Service

**Features**:
- Professional Excel formatting with branded headers
- Color-coded columns and rows
- Auto-filters on all data tables
- Frozen header rows
- Automatic column width adjustment
- Cell formatting (currency, percentage, dates)
- Alternating row colors for readability
- Border styling

**CSV Export**:
- RFC 4180 compliant CSV format
- Proper escaping of special characters
- UTF-8 encoding
- Compatible with Excel, Google Sheets, and other tools

**Export Tracking**:
```sql
CREATE TABLE report_exports (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  exported_by UUID NOT NULL,
  report_id UUID,
  report_name TEXT NOT NULL,
  export_format TEXT NOT NULL, -- xlsx, csv
  file_size INTEGER,
  parameters JSONB,
  created_at TIMESTAMPTZ
);
```

#### Saved Reports

**Features**:
- Save report configurations
- Schedule recurring reports
- Share reports with team
- Report versioning
- Export history

**Report Scheduling**:
```json
{
  "schedule_enabled": true,
  "schedule_frequency": "weekly",
  "schedule_recipients": ["email@example.com"],
  "schedule_day": "monday",
  "schedule_time": "09:00"
}
```

#### Materialized Views

Performance optimization using PostgreSQL materialized views:

```sql
-- Sales Performance View
CREATE MATERIALIZED VIEW mv_sales_performance AS
SELECT
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_opportunities,
  SUM(estimated_value) as total_value,
  AVG(estimated_value) as avg_value
FROM opportunities
GROUP BY month;

-- Refresh strategy
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_performance;
```

**Automatic Refresh**:
- Scheduled hourly refresh
- Manual refresh via API
- Concurrent refresh to avoid locking

---

## Sales Pipeline Management

### Overview

Visual Kanban-style sales pipeline with drag-and-drop functionality for tracking opportunities through the sales process.

### Features

#### Pipeline Stages

**Default Stages**:
1. **Lead** (0% probability)
   - Initial contact
   - Qualification needed

2. **Qualified** (20% probability)
   - Budget confirmed
   - Decision maker identified

3. **Proposal** (40% probability)
   - Proposal sent
   - Awaiting response

4. **Negotiation** (60% probability)
   - Active discussions
   - Terms being finalized

5. **Verbal Commit** (80% probability)
   - Verbal agreement
   - Paperwork pending

6. **Won** (100% probability)
   - Contract signed
   - Job scheduled

7. **Lost** (0% probability)
   - Opportunity lost
   - Reason tracked

**Custom Stages**:
- Organizations can create custom stages
- Configurable probability percentages
- Color coding for visual differentiation
- Sort order customization

**Stage Configuration**:
```typescript
{
  "name": "Proposal Sent",
  "color": "#3b82f6",
  "stage_type": "open", // open, won, lost
  "probability": 40,
  "sort_order": 3
}
```

#### Opportunity Management

**Opportunity Fields**:
- Name and description
- Customer linkage
- Estimated value
- Expected close date
- Owner assignment
- Stage position
- Probability-weighted value
- Custom notes

**Weighted Value Calculation**:
```
Weighted Value = Estimated Value × (Stage Probability / 100)

Example:
Opportunity: $10,000
Stage: Proposal (40%)
Weighted Value: $10,000 × 0.40 = $4,000
```

#### Kanban Board

**Visual Features**:
- Drag-and-drop cards between stages
- Real-time stage updates
- Stage-level totals (count and value)
- Opportunity cards with key metrics
- Color-coded by age or priority
- Quick actions menu on cards

**Card Display**:
```
┌──────────────────────────┐
│ Acme Corp - Office Reno  │
│ $15,000                  │
│ Close: Feb 28            │
│ Owner: John Smith        │
│ 📅 14 days in stage      │
└──────────────────────────┘
```

**Drag-and-Drop Behavior**:
- Click and drag to move between stages
- Automatic probability update
- History logging of stage changes
- Optional notes on stage change
- Activity timeline update

#### Pipeline Metrics

**Dashboard Metrics**:
```json
{
  "total_value": 125000,
  "weighted_value": 58000,
  "count": 23,
  "by_stage": [
    {
      "stage_name": "Proposal",
      "count": 5,
      "value": 45000
    }
  ]
}
```

**Stage Analytics**:
- Average time in stage
- Conversion rate to next stage
- Drop-off analysis
- Stage velocity metrics

#### Opportunity History

**Change Tracking**:
```sql
CREATE TABLE opportunity_history (
  id UUID PRIMARY KEY,
  opportunity_id UUID NOT NULL,
  from_stage_id UUID,
  to_stage_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ
);
```

**History Display**:
```
Feb 15, 2026 - Moved to Proposal by John Smith
  Note: "Sent comprehensive proposal via email"

Feb 10, 2026 - Moved to Qualified by Sarah Johnson
  Note: "Budget confirmed, decision maker identified"

Feb 5, 2026 - Created by Mike Wilson
```

---

## Commission Tracking System

### Overview

Automated commission calculation and tracking system for sales team compensation management.

### Features

#### Commission Plans

**Plan Types**:

1. **Percentage Commission**
   - Fixed percentage of sale amount
   - Example: 5% of total invoice value

2. **Flat Rate Commission**
   - Fixed dollar amount per sale
   - Example: $500 per completed job

3. **Tiered Commission**
   - Variable rates based on thresholds
   - Example:
     ```
     $0 - $10,000: 3%
     $10,001 - $25,000: 5%
     $25,001+: 7%
     ```

**Plan Configuration**:
```typescript
{
  "name": "Standard Sales Commission",
  "commission_type": "tiered",
  "tiers": [
    { "min": 0, "max": 10000, "rate": 3 },
    { "min": 10001, "max": 25000, "rate": 5 },
    { "min": 25001, "max": null, "rate": 7 }
  ],
  "applies_to": "won" // won, paid, completed
}
```

#### Commission Earnings

**Automatic Calculation**:
- Triggered when opportunity is marked as "Won"
- Or when invoice is marked as "Paid" (configurable)
- Calculates based on assigned commission plan
- Links to opportunity, job, or invoice

**Earning Record**:
```typescript
{
  "user_id": "sales-rep-uuid",
  "plan_id": "plan-uuid",
  "opportunity_id": "opp-uuid",
  "base_amount": 15000,
  "commission_rate": 5,
  "commission_amount": 750,
  "status": "pending", // pending, approved, paid
  "earning_date": "2026-02-15"
}
```

#### Commission Workflow

```
Sale Closed/Invoice Paid
    ↓
Create Commission Earning (Status: Pending)
    ↓
Manager Review
    ↓
Approve Earning (Status: Approved)
    ↓
Payment Processing
    ↓
Mark as Paid (Status: Paid)
```

#### Commission Dashboard

**Summary Metrics**:
```json
{
  "total_pending": 2500,
  "total_approved": 5000,
  "total_paid": 25000,
  "this_month": 3500,
  "this_quarter": 12000
}
```

**Earnings Table**:
- Date of sale
- Sales rep name
- Commission plan
- Base amount
- Commission rate
- Commission amount
- Payment status
- Actions (approve, mark paid)

#### Bulk Operations

**Bulk Approval**:
- Select multiple pending earnings
- Approve all at once
- Optional approval notes

**Bulk Payment**:
- Select approved earnings
- Mark as paid in batch
- Integration with payroll systems

#### Commission Reports

**Sales Rep Performance**:
- Total earnings by period
- Commission by product/service
- Average commission per sale
- Trend analysis

**Organization-wide**:
- Total commission expense
- Commission as % of revenue
- Top performers
- Commission plan effectiveness

---

## Two-Level Approval Workflow

### Overview

Hierarchical approval system for estimates, discounts, and proposals requiring manager sign-off based on configurable thresholds.

### Features

#### Approval Thresholds

**Threshold Configuration**:
```typescript
{
  "entity_type": "estimate", // estimate, discount, proposal
  "threshold_amount": 10000,
  "approval_level": 1, // 1 or 2
  "approver_role": "manager" // optional
}
```

**Example Thresholds**:
```
Estimates:
  $0 - $5,000: No approval required
  $5,001 - $15,000: Level 1 approval (Manager)
  $15,001+: Level 2 approval (Director)

Discounts:
  0% - 10%: No approval required
  11% - 20%: Level 1 approval
  21%+: Level 2 approval
```

#### Approval Levels

**Level 1 Approval**:
- Required for moderate-value items
- Typically approved by manager/supervisor
- Can be approved/rejected independently
- If rejected, no further levels needed

**Level 2 Approval**:
- Required for high-value items
- Only proceeds if Level 1 approved
- Typically approved by director/owner
- Final approval authority

#### Approval Request Flow

```
1. User Creates Estimate/Proposal
   ↓
2. System Checks Thresholds
   ↓
3. If No Approval Needed: Auto-Approve
   ↓
4. If Approval Needed: Create Request
   ↓
5. Level 1 Approver Notified
   ↓
6. Level 1 Review:
   - Approve → Continue
   - Reject → Stop (Request Rejected)
   ↓
7. If Requires Level 2:
   - Level 2 Approver Notified
   - Level 2 Review:
     * Approve → Request Approved
     * Reject → Request Rejected
```

#### Approval Request Details

**Request Fields**:
```typescript
{
  "entity_type": "estimate",
  "entity_id": "uuid",
  "amount": 12500,
  "requested_by": "user-uuid",
  "requested_at": "2026-02-15T10:00:00Z",

  // Level 1
  "level1_status": "pending", // pending, approved, rejected
  "level1_approver": null,
  "level1_at": null,
  "level1_notes": null,

  // Level 2 (if required)
  "requires_level2": true,
  "level2_status": "pending",
  "level2_approver": null,
  "level2_at": null,
  "level2_notes": null,

  // Final
  "final_status": "pending" // pending, approved, rejected
}
```

#### Approval Queue Page

**Pending Approvals Section**:
- Table of items awaiting user's approval
- Filter by entity type (estimates, discounts, proposals)
- Key details visible (requester, amount, date)
- Status badges for each level
- Quick approve/reject actions

**Approval History**:
- All past approval requests
- Status indicators
- Audit trail of decisions
- Approver names and timestamps

**Actions**:
- Approve with optional notes
- Reject with required notes
- View full entity details
- Add comments/questions

#### Notifications

**Approval Request Created**:
- Email to Level 1 approver
- In-app notification
- Optional SMS

**Level 1 Approved**:
- Notification to requester
- If Level 2 required: Notification to Level 2 approver

**Final Decision**:
- Notification to requester
- Email summary
- Activity log update

#### Integration Points

**Estimates**:
- Automatically check thresholds on create/update
- Block estimate approval until approval granted
- Link to approval request from estimate detail

**Proposals**:
- Check before sending to customer
- Display approval status on proposal
- Require approval before customer sign-off

**Discounts**:
- Validate discount % against thresholds
- Request approval for over-threshold discounts
- Track discount approval history

---

## Win/Loss Tracking

### Overview

Systematic tracking and analysis of won and lost opportunities to improve sales effectiveness and identify trends.

### Features

#### Win Tracking

**Won Opportunities**:
- Automatic tracking when deal closes
- Actual close date captured
- Final deal value recorded
- Win reason (optional)
- Customer testimonial request triggered

**Win Metrics**:
```json
{
  "won_count": 45,
  "won_value": 675000,
  "avg_deal_size": 15000,
  "win_rate": 68.2,
  "avg_sales_cycle": 21 // days
}
```

#### Loss Tracking

**Loss Reasons**:
- Price too high
- Lost to competitor
- Timeline didn't work
- Budget cut
- Project cancelled
- No decision made
- Went with internal solution
- Other (with notes)

**Loss Details**:
```typescript
{
  "loss_reason": "lost_to_competitor",
  "loss_notes": "Competitor bid $2,000 lower",
  "competitor": "ABC Remediation",
  "actual_close_date": "2026-02-15"
}
```

**Loss Metrics**:
```json
{
  "lost_count": 21,
  "lost_value": 315000,
  "loss_rate": 31.8,
  "top_loss_reasons": [
    { "reason": "Price too high", "count": 8 },
    { "reason": "Lost to competitor", "count": 6 }
  ]
}
```

#### Loss Reason Analysis

**Visual Breakdown**:
```
Loss Reasons Distribution:

Price Too High          ████████ 38% (8 deals)
Lost to Competitor      ██████ 29% (6 deals)
Timeline Issues         ███ 14% (3 deals)
Budget Cut             ██ 9% (2 deals)
Other                  ██ 10% (2 deals)
```

**Insights**:
- Identify patterns in losses
- Compare loss reasons by period
- Competitor analysis
- Pricing sensitivity analysis
- Win/loss ratio by sales rep

#### Win/Loss Analysis Page

**Summary Cards**:
- Won deals count and value
- Lost deals count and value
- Win rate percentage
- Average deal size (won deals)

**Loss Reasons Chart**:
- Bar chart of loss reasons
- Percentage breakdown
- Drill-down to specific opportunities

**Tabs**:

1. **Won Opportunities**
   - Table of all won deals
   - Customer name
   - Deal value
   - Close date
   - Sales rep

2. **Lost Opportunities**
   - Table of all lost deals
   - Loss reason badge
   - Competitor info
   - Notes

**Filters**:
- Date range
- Sales rep
- Customer
- Deal value range
- Loss reason

#### Competitor Intelligence

**Competitor Tracking**:
```sql
CREATE TABLE competitors (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  website TEXT,
  strengths JSONB,
  weaknesses JSONB,
  pricing_strategy TEXT,
  notes TEXT
);
```

**Loss to Competitor Analysis**:
- Most common competitors
- Win rate against each competitor
- Average price differential
- Service comparison notes

#### Action Items from Losses

**Follow-up Tasks**:
- Re-engage in 6 months
- Add to nurture campaign
- Request feedback
- Update competitive intelligence

---

## Upcoming Features

### Q2 2026
- Advanced scheduling calendar with resource optimization
- Mobile app (iOS/Android native)
- Equipment tracking and maintenance scheduling

### Q3 2026
- Customer portal enhancements
- Online payments (Stripe integration)
- Automated marketing campaigns

### Q4 2026
- Machine learning for estimate accuracy
- Predictive analytics dashboard
- White-label platform option

---

**HazardOS Features** - Building the complete operating system for environmental remediation. 🚀
