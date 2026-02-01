# HazardOS Features Documentation

**Complete feature reference for the HazardOS platform**

> **Last Updated**: February 1, 2026
> **Status**: Production Ready

---

## Table of Contents

1. [Job Completion System](#job-completion-system)
2. [Customer Feedback System](#customer-feedback-system)
3. [Analytics & Variance Tracking](#analytics--variance-tracking)
4. [QuickBooks Integration](#quickbooks-integration)
5. [Activity Logging](#activity-logging)
6. [Site Survey Mobile Wizard](#site-survey-mobile-wizard)
7. [Pricing Management](#pricing-management)
8. [Customer Management](#customer-management)
9. [Estimate Builder](#estimate-builder)
10. [Invoice Management](#invoice-management)

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

## Activity Logging

### Overview

Comprehensive audit trail of all user actions and system events.

### Logged Activities

**User Actions**:
- Login/Logout events
- Customer created/updated/deleted
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
  "changes": {
    "before": null,
    "after": {
      "name": "Acme Corporation",
      "email": "contact@acme.com",
      "status": "lead"
    }
  },
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2026-02-01T10:00:00Z"
}
```

### Activity Feed

Real-time activity feed on dashboard.

**Display**:
```
🆕 John Smith created customer "Acme Corporation"
   2 minutes ago

📝 Sarah Johnson updated estimate EST-2026-045
   15 minutes ago

✅ Mike Wilson completed job JOB-2026-012
   1 hour ago

📄 System generated invoice INV-2026-089
   2 hours ago
```

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

## Upcoming Features

### Q1 2026
- Advanced scheduling calendar
- Mobile app (iOS/Android native)
- Equipment tracking

### Q2 2026
- Customer portal
- Online payments (Stripe)
- Automated reminders

### Q3 2026
- Machine learning for estimate accuracy
- Predictive analytics
- White-label platform

---

**HazardOS Features** - Building the complete operating system for environmental remediation. 🚀
