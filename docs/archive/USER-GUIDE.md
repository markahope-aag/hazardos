# HazardOS User Guide

**Guide for people using the HazardOS environmental remediation platform** (office staff, estimators, and field crews).

> **Last updated:** April 29, 2026  
> **App version:** 0.1.0

Screen names and menus match the current app. If your organization uses custom branding, labels may look slightly different, but navigation is the same.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [How navigation works](#how-navigation-works)
4. [CRM: Contacts, companies, and pipeline](#crm-contacts-companies-and-pipeline)
5. [Creating and Managing Site Surveys](#creating-and-managing-site-surveys)
6. [Proposals and Estimates](#proposals-and-estimates)
7. [Job Scheduling and Management](#job-scheduling-and-management)
8. [Invoicing](#invoicing)
9. [Work Orders](#work-orders)
10. [Messaging](#messaging)
11. [Notifications](#notifications)
12. [Using the Customer Portal](#using-the-customer-portal)
13. [Mobile Features](#mobile-features)
14. [Tips and Best Practices](#tips-and-best-practices)

---

## Getting Started

### First-Time Setup

Welcome to HazardOS! This guide will help you get started with your environmental remediation business management platform.

#### Accessing HazardOS

1. **Open your web browser** and navigate to:
   - Production: https://hazardos.app
   - Or use the URL provided by your administrator

2. **Login with your credentials**:
   - Email address
   - Password provided by your organization admin

3. **First login**: You will see the main dashboard

#### User Roles

Your access level depends on your assigned role:

| Role | Access Level | Typical Responsibilities |
|------|--------------|--------------------------|
| **Platform Owner** | Full system access | System administration |
| **Platform Admin** | Cross-organization admin | Platform management |
| **Tenant Owner** | Organization owner | Business operations, billing |
| **Admin** | Full organization access | User management, settings |
| **Estimator** | Create surveys & estimates | Field assessments, proposals |
| **Technician** | Execute jobs | Job completion, time tracking |
| **Viewer** | Read-only access | Reports, viewing data |

#### Profile and account settings

1. Click your **name or avatar** in the top-right to open the user menu.
2. Choose **Profile** or **Settings** — both go to **Settings**, where the sidebar lists every section (company, team, billing, security, and more).
3. Update **company profile**, **team**, **security** (password and session-related options), **notifications**, **email**, **SMS**, and other options from the sidebar.

Password changes live under **Settings → Security** (not a separate item on the user menu).

---

## Dashboard Overview

### Main Dashboard

When you log in, you land on the **Dashboard** with filters at the top and widgets below. Typical widgets include:

- **Key metrics** (stats cards) — revenue, jobs, and related KPIs for the period you select.
- **Upcoming jobs** — what is scheduled next.
- **Revenue** trend and **lead sources** — where work and leads come from.
- **Jobs by status** and **jobs by hazard** — breakdowns you can use to spot bottlenecks; hazard charts can tie into dashboard filters where supported.
- **Overdue invoices** — accounts receivable that need attention.
- **Recent activity** — latest actions in your organization.

Use the **filter bar** (period, hazard type, etc.) to focus the dashboard on a specific time range or type of work.

---

## How navigation works

### Main menu (always available)

The top navigation includes:

| Item | Purpose |
|------|---------|
| **Dashboard** | Home metrics and widgets |
| **CRM** | Sales pipeline: properties, **Contacts**, **Companies**, **Opportunities**, **Pipeline** (Kanban), **Jobs** (CRM context) |
| **Surveys** | Site survey list and mobile field workflow |
| **Estimates** | Estimates and pricing workflows |
| **Jobs** | Job list and job detail (operations view) |
| **Work Orders** | Crew dispatch sheets — site, crew, materials, equipment, vehicles |
| **Invoices** | Customer invoicing |
| **Calendar** | Scheduling |
| **Messaging** | Customer messaging threads |
| **Settings** | Organization, team, billing, integrations, email, SMS, notifications, security, branding |

### CRM mode

When you open **CRM**, the screen switches to a dedicated **CRM** layout: a dark banner at the top and tabs for **Properties**, **Contacts**, **Companies**, **Opportunities**, **Pipeline**, and **Jobs**. The main menu is hidden while you are inside CRM so you can focus on sales work. Use **Back to Main Menu** to return to the standard navigation.

---

## CRM: Contacts, companies, and pipeline

The database still uses the internal name `customers` in a few places, but the product treats these records as **contacts** (people) and **companies** (accounts). Day-to-day work starts in **CRM**.

### Contact list

Open the contact database:

1. Click **CRM** in the main navigation, then **Contacts** (or go to `/crm/contacts`).
2. View your **contact list** with key information:
   - Name and company
   - Contact information
   - Status (Lead, Prospect, Customer, Inactive)
   - Recent activity

#### Filtering contacts

Use filters to find specific people:

**By Status**:
- Lead: Initial contact, not yet qualified
- Prospect: Qualified, considering service
- Customer: Active or past customer
- Inactive: No longer active

**By source** (typical values in the app):
- Phone, Website, Mail, Referral, Other

**Search**: Use the search box to find names, email, or phone.

> **Note:** You may also see a **Customers** route in bookmarks (`/customers`). It shows the same contact records; **CRM → Contacts** is the primary path.

### Adding a new contact

1. From **CRM → Contacts**, click **New** (or equivalent) to open the contact form.
2. Choose **Residential** or **Commercial**. Commercial flows can tie the person to a **company** record.
3. Complete the form. The app expects a real **street address** and related fields for most contacts (used for jobs and documents).

**Common fields**:
- First and last name (used to build the display name)
- Status: Lead, Prospect, Customer, or Inactive
- Contact role (optional): e.g. Decision maker, Billing, Site contact, Property manager, Influencer, Other
- Phones, email, preferred contact method
- Lead source and marketing / SMS opt-in where your admin enables them

4. Save the record.

### Viewing Customer Details

Click on any customer to view their complete profile:

**Customer Information Tab**:
- Contact details
- Address information
- Status and source
- Marketing consent

**Activity Tab**:
- Site surveys for this customer
- Estimates and proposals
- Active and completed jobs
- Invoices and payments
- Communication history

**Documents Tab**:
- Uploaded files and documents
- Proposals sent
- Signed contracts
- Photos and videos

### Editing Customer Information

1. Open customer details
2. Click **Edit Customer** button
3. Update the information
4. Click **Save Changes**

### Managing Customer Status

Update customer status as they progress through your sales funnel:

**Lead → Prospect**:
- When you have qualified the lead
- Conducted initial consultation
- Determined they need your services

**Prospect → Customer**:
- When they accept a proposal
- Sign a contract
- First job is scheduled

**Customer → Inactive**:
- No activity for extended period
- Customer requests to be removed
- Service no longer needed

### Deleting Customers

**Warning**: Deleting customers is permanent and will remove all associated data.

1. Open customer details
2. Click **Delete Customer** button
3. Confirm deletion
4. All associated site surveys, estimates, and jobs will be marked as orphaned

**Best Practice**: Set customers to "Inactive" status instead of deleting them to preserve historical data.

### Companies and opportunities

- **CRM → Companies** — Business accounts (especially for commercial work). Companies are usually created in context when you add or convert commercial contacts.
- **CRM → Opportunities** — Deals linked to contacts (and optionally companies). Track stage, value, hazards, and related site surveys.
- **CRM → Pipeline** — Kanban view of opportunities across your organization’s pipeline stages.
- **CRM → Properties** — Properties tied to your sales and job workflow where your org uses that model.

Use **CRM → Jobs** for pipeline-centric job lists; use the main **Jobs** menu for the broader operations view—both connect to the same underlying jobs.

### Additional people on an account

Some accounts store **extra people** (e.g. additional `customer_contacts`) when your workflow uses them. If your screen shows a **Contacts** tab or sub-contacts on a detail page, use the actions there (add, edit, set primary). **Contact roles** in the app align with fields such as: Decision maker, Influencer, Billing, Property manager, Site contact, and Other—not the informal “Primary / Scheduling” labels used in older documentation.

**Preferred contact method** options include email, phone, text, and mail where enabled.

---

## Creating and Managing Site Surveys

Site surveys (formerly called assessments) are field inspection forms used to collect information about potential jobs.

### Creating a New Site Survey

#### Desktop Method

1. Click **Surveys** in the main navigation (site surveys)
2. Click **New Survey** button
3. Fill out the survey form:

**Customer Information**:
- Select existing customer or create new
- Site address (if different from customer address)
- Contact information

**Property Details**:
- Building type (Residential, Commercial, Industrial)
- Year built
- Square footage
- Occupied status

**Hazard Information**:
- Hazard type (Asbestos, Mold, Lead, Vermiculite, Other)
- Specific material types
- Estimated area/volume affected
- Access issues

**Special Considerations**:
- Occupied building requirements
- Clearance testing needed
- Regulatory notifications
- Special conditions

4. Click **Save as Draft** or **Submit Survey**

#### Mobile Method

Optimized for field use:

1. Open HazardOS on your mobile device
2. Tap **Surveys**
3. Tap **New Survey** (camera icon)
4. Use the mobile wizard:
   - Step 1: Property Info
   - Step 2: Hazard Details
   - Step 3: Photos & Videos
   - Step 4: Access & Conditions
   - Step 5: Review & Submit

### Mobile Survey Wizard

The mobile survey wizard is designed for quick, efficient field data collection:

**Property Section**:
- Quick address lookup
- GPS location capture
- Building type selection
- Occupancy status

**Hazards Section**:
- Visual hazard type selection
- Material identification
- Area measurements
- Containment level assessment

**Photos Section**:
- In-app camera
- Photo categorization:
  - Exterior
  - Interior
  - Hazard Materials
  - Access Points
  - Special Conditions
- Automatic GPS tagging
- Optional captions

**Access Section**:
- Access issues checklist
- Parking availability
- Utilities location
- Entry points

**Review Section**:
- Preview all entered data
- Review photos
- Add final notes
- Submit or save draft

### Adding Photos and Videos

**During Survey Creation**:
1. Navigate to Photos section
2. Click **Add Photo** or **Add Video**
3. Choose to:
   - Take photo/video with camera
   - Upload from device
4. Add caption (optional)
5. Photo automatically compressed for faster upload

**After Survey Creation**:
1. Open survey details
2. Go to Photos tab
3. Click **Add Photos**
4. Select files to upload

**Photo Best Practices**:
- Take clear, well-lit photos
- Include scale reference (ruler, tape measure)
- Capture multiple angles
- Document access points
- Show hazard materials clearly
- Include before/after contexts

### Survey status workflow

Surveys use statuses such as:

- **Draft** — Work in progress.
- **Scheduled** / **In progress** — Visit timing and field work.
- **Submitted** — Ready for office review.
- **Reviewed** — Reviewed internally.
- **Estimated** — Linked to an estimate or pricing step.
- **Quoted** — Proposal/quote stage where applicable.
- **Completed** — Closed out as a survey record.
- **Cancelled** — Will not proceed.

The **Surveys** list can group rows as **open**, **completed**, **converted** (e.g. tied to an estimate), or **cancelled** to match how your team works the pipeline.

### Scheduling Site Surveys

Set appointment for field inspection:

1. Open survey details
2. Click **Schedule** button
3. Set appointment:
   - Date and time
   - Duration (estimated)
   - Assigned estimator
   - Appointment status (Scheduled, Confirmed, In Progress)
4. Click **Save**

**Appointment Statuses**:
- Scheduled: Appointment set, awaiting confirmation
- Confirmed: Customer confirmed availability
- In Progress: Estimator on site
- Completed: Inspection finished
- Cancelled: Appointment cancelled
- Rescheduled: New time needed

### Viewing Survey Details

Click any survey to view complete information:

**Overview Tab**:
- Customer information
- Property details
- Hazard assessment
- Status and dates

**Photos Tab**:
- All uploaded photos
- Organized by category
- Click to view full size
- Download options

**Estimate Tab**:
- View associated estimate
- Pricing breakdown
- Material costs
- Labor estimates

**History Tab**:
- Status changes
- Who made changes
- Timestamps
- Notes and updates

---

## Proposals and Estimates

### Creating an Estimate

From a completed site survey:

1. Open the survey
2. Click **Create Estimate**
3. The estimate builder opens with:
   - Customer information pre-filled
   - Site survey data included
   - Pricing tables loaded

**Estimate Sections**:

**Labor Costs**:
- Select crew roles needed
- Estimate hours per role
- Rates automatically applied from pricing settings
- Regular vs. overtime rates

**Materials**:
- Select materials from catalog
- Enter estimated quantities
- Unit costs from pricing settings
- Automatic total calculation

**Equipment**:
- Select equipment needed
- Rental duration
- Daily/weekly rates applied
- Delivery and setup costs

**Disposal**:
- Select hazard waste type
- Estimated quantity
- Per-unit disposal fees
- Regulatory compliance costs

**Travel**:
- Distance to job site
- Travel time
- Mileage rates
- Per diem if applicable

**Additional Costs**:
- Permits and fees
- Clearance testing
- Contingency percentage
- Overhead markup

4. Review total estimate
5. Click **Save Estimate**

### Generating a Proposal

Convert estimate to professional proposal:

1. Open the estimate
2. Click **Generate Proposal**
3. Select proposal template
4. Customize proposal:
   - Introduction text
   - Scope of work description
   - Terms and conditions
   - Payment terms
   - Timeline
5. Review PDF preview
6. Click **Save Proposal**

### Sending Proposals to Customers

**Email Method**:
1. Open proposal
2. Click **Send to Customer**
3. Email dialog opens:
   - To: Customer email (pre-filled)
   - Subject: Customizable
   - Message: Template with customization
   - Attachment: PDF proposal
4. Click **Send**

**Manual Method**:
1. Open proposal
2. Click **Download PDF**
3. Save to computer
4. Email or print manually

### Proposal Status Tracking

Track proposal status:
- **Draft**: Being prepared
- **Sent**: Emailed to customer
- **Viewed**: Customer opened proposal
- **Accepted**: Customer accepted (verbal or written)
- **Declined**: Customer declined
- **Expired**: Proposal validity period ended

### Converting Proposals to Jobs

When customer accepts:

1. Open accepted proposal
2. Click **Convert to Job**
3. Job creation form opens with:
   - Customer information pre-filled
   - Estimate amounts included
   - Site survey linked
4. Add job-specific information:
   - Job number (auto-generated)
   - Start date
   - Estimated duration
   - Assigned crew
5. Click **Create Job**

---

## Job Scheduling and Management

### Creating a New Job

Jobs can be created:
- From accepted proposals (recommended)
- From estimates
- Manually from scratch

**Manual Job Creation**:
1. Click **Jobs** → **New Job**
2. Fill in job details:
   - Customer selection
   - Job number (auto-generated)
   - Site location
   - Hazard type
   - Scheduled start date
   - Estimated duration
   - Contract amount
3. Assign crew members
4. Click **Create Job**

### Job Calendar

View and manage all scheduled jobs:

1. Click **Calendar** in navigation
2. Calendar views:
   - Month view: Overview of all jobs
   - Week view: Detailed daily schedule
   - Day view: Hourly breakdown

**Calendar Features**:
- Color-coded by status
- Drag-and-drop rescheduling
- Quick job details on hover
- Filter by crew, status, hazard type

**Creating Job from Calendar**:
1. Click on date/time
2. Select "New Job"
3. Fill in job details
4. Job appears on calendar

### Managing Active Jobs

**Job Dashboard**:
- All active jobs listed
- Filter by status:
  - Scheduled: Not yet started
  - In Progress: Currently active
  - On Hold: Temporarily paused
  - Completed: Finished
  - Cancelled: Not proceeding

**Job Details View**:

Click any job to see complete information:

**Overview Tab**:
- Customer and site information
- Job specifications
- Contract amount
- Crew assignments
- Timeline and status

**Crew Tab**:
- Assigned team members
- Roles and rates
- Add/remove crew members
- Crew schedule

**Materials Tab**:
- Materials needed
- Estimated vs. actual quantities
- Cost tracking
- Inventory updates

**Equipment Tab**:
- Equipment assigned
- Rental periods
- Location tracking
- Maintenance schedule

**Time Entries Tab**:
- Daily time logs
- Crew hours tracking
- Work type (Regular, Overtime, Travel)
- Billable vs. non-billable

**Photos Tab**:
- Job progress photos
- Before/during/after documentation
- Issue documentation
- Organized by type and date

**Notes Tab**:
- Internal notes
- Customer communications
- Issues and resolutions
- Field observations

### Job Completion Workflow

#### For Technicians

When job is finished:

1. Open job details
2. Click **Complete Job** button
3. Job completion form:

**Time Entries**:
- Review all time entries
- Add missing time
- Mark billable hours

**Material Usage**:
- Enter actual quantities used
- Compare to estimates
- Note any variances

**Photos**:
- Upload completion photos
- Before/during/after documentation
- Issue photos if applicable

**Completion Checklist**:

**Safety** (All required):
- [ ] PPE used properly
- [ ] Safety perimeter maintained
- [ ] No incidents reported
- [ ] Air quality monitored

**Quality**:
- [ ] Work meets specifications
- [ ] Materials properly contained
- [ ] Area clearance testing (if required)

**Cleanup**:
- [ ] Work area cleaned
- [ ] Equipment decontaminated
- [ ] Waste properly bagged
- [ ] Disposal workOrders completed

**Documentation**:
- [ ] Before photos taken
- [ ] After photos taken
- [ ] Time entries complete
- [ ] Material usage recorded

**Field Notes**:
- Issues encountered
- Recommendations for customer
- Follow-up needed

**Customer Signature** (Optional):
- Digital signature capture
- Customer name and date

4. Click **Submit for Review**

#### For Managers

Review completed jobs:

1. Open job marked "Ready for Review"
2. Review tab shows:
   - Variance analysis (hours and costs)
   - Completion checklist status
   - Photos and documentation
   - Customer signature

3. Review each section:
   - Verify time entries are accurate
   - Check material usage is reasonable
   - Confirm all photos uploaded
   - Review checklist completion

4. Choose action:
   - **Approve**: Job marked complete, ready to invoice
   - **Reject**: Send back to technician with notes
   - **Request Changes**: Specific items need correction

### Variance Analysis

Automatically calculated when job is completed:

**Hours Variance**:
- Estimated hours vs. actual hours
- Variance percentage
- By crew member and work type

**Material Variance**:
- Estimated quantity vs. used
- Variance percentage
- Cost impact

**Cost Variance**:
- Estimated total vs. actual total
- Labor cost variance
- Material cost variance
- Overall profitability

**Example Variance Report**:
```
Job: Asbestos Abatement - 123 Main St

LABOR:
Estimated: 40 hours @ $45/hr = $1,800
Actual: 44 hours @ $45/hr = $1,980
Variance: +4 hours (+10%) = +$180

MATERIALS:
Poly Sheeting: 500 sq ft estimated, 550 used (+10%)
HEPA Filters: 10 estimated, 12 used (+20%)
Disposal Bags: 50 estimated, 48 used (-4%)
Total Material Variance: +$125

OVERALL:
Estimated Total: $5,000
Actual Total: $5,305
Variance: +$305 (+6.1%)
```

---

## Invoicing

### Creating Invoices

#### From Completed Jobs

Recommended method:

1. Navigate to completed job
2. Click **Create Invoice**
3. Invoice form pre-fills with:
   - Customer information
   - Job details
   - Actual labor costs
   - Actual material costs
   - Approved additional charges

4. Review line items
5. Add any manual adjustments
6. Click **Generate Invoice**

#### Manual Invoice Creation

For non-job billing:

1. Click **Invoices** → **New Invoice**
2. Select customer
3. Enter invoice details:
   - Invoice number (auto-generated)
   - Invoice date
   - Due date
   - Payment terms

**Add Line Items**:
- Description
- Quantity
- Unit price
- Total (auto-calculated)

4. Add optional sections:
   - Subtotal
   - Tax (if applicable)
   - Discounts
   - Total due

5. Click **Save Invoice**

### Invoice Details

**Header Information**:
- Your company logo and info
- Customer billing address
- Invoice number and date
- Due date and payment terms

**Line Items**:
- Itemized charges
- Labor by crew member/role
- Materials used
- Equipment rental
- Disposal fees
- Travel charges
- Additional costs

**Summary**:
- Subtotal
- Tax (if applicable)
- Discounts
- Total amount due
- Amount paid
- Balance remaining

**Payment Information**:
- Accepted payment methods
- Bank details or payment link
- Payment terms and late fees

### Sending Invoices

**Email Method**:
1. Open invoice
2. Click **Send Invoice**
3. Email dialog:
   - Customer email pre-filled
   - Subject customizable
   - Professional email template
   - PDF invoice attached
4. Click **Send**

**Print Method**:
1. Open invoice
2. Click **Download PDF**
3. Print from browser or save to computer

### Recording Payments

When customer pays:

1. Open invoice
2. Click **Record Payment**
3. Payment form:
   - Payment date
   - Amount paid
   - Payment method (Check, Cash, Credit Card, ACH, Other)
   - Check/transaction number
   - Notes
4. Click **Save Payment**

Invoice status updates automatically:
- **Unpaid**: No payments recorded
- **Partially Paid**: Some amount paid
- **Paid**: Fully paid
- **Overdue**: Past due date, unpaid

### Invoice Management

**Invoice List**:
- All invoices with key information
- Filter by:
  - Status (Unpaid, Partially Paid, Paid, Overdue)
  - Customer
  - Date range
  - Amount range

**Batch Actions**:
- Send multiple invoices
- Mark as paid
- Download statements
- Export to accounting software

### QuickBooks Integration

If QuickBooks integration is enabled:

**Sync Customers**:
1. Go to **Settings** → **Integrations** → **QuickBooks**
2. Click **Sync Customers**
3. Customers automatically sync to QuickBooks

**Sync Invoices**:
1. Open invoice
2. Click **Sync to QuickBooks**
3. Invoice created in QuickBooks
4. Status tracked in both systems

**Automatic Sync**:
- New customers automatically sync
- Invoices sync when finalized
- Payments sync when recorded
- Two-way sync keeps data current

---

## Work Orders

A **Work Order** is the dispatch sheet the field crew takes to a site — site location, scope of work, assigned crew, materials, equipment, vehicles, and any special instructions. Generate one from a job (the **Generate Work Order** button on the job page) and the system snapshots the relevant bits of the job, estimate, and crew assignments at that moment. Edit the snapshot while the work order is in **Draft**; once you press **Issue**, the contents are locked so the paper version the crew took to the field always matches what was dispatched, even if you later edit the job.

Open the **Work Orders** list to find any existing work order, attach vehicles, write dispatch notes, print a PDF, or email it to the crew lead. The end-of-job EPA **Waste Manifest** is a separate document attached to the job's disposal records — not the same as a Work Order.

---

## Messaging

**Messaging** (`/messages`) is for **SMS-style conversations** with customers where your org has enabled SMS (see **Settings → SMS**). You can open a thread by customer to read and send messages, subject to TCPA consent and your internal policies.

This is separate from **in-app notifications** (bell icon) and separate from **email** sent from proposals or invoices.

---

## Notifications

- **In-app:** Click the **bell** in the header to see alerts (job updates, approvals, billing issues, feedback, etc.). Unread items show a badge; the list refreshes periodically while the app is open.
- **Settings:** Go to **Settings → Notifications** to turn **in-app**, **email**, and (where available) **push** preferences on or off **per notification type**.
- **Email:** When email is enabled for a type, many alerts also send a message through your organization’s email configuration (**Settings → Email**).

Browser **push** preferences may appear in settings; full mobile-style push depends on your device and how your organization deploys the app. See [NOTIFICATIONS.md](./NOTIFICATIONS.md) for technical detail.

---

## Using the Customer Portal

### Customer Feedback Surveys

After job completion, customers receive feedback surveys:

**Survey Access**:
- Email with secure link
- No login required
- Mobile-friendly
- 30-day expiration

**Survey Sections**:

**Overall Rating** (1-5 stars):
- Overall satisfaction
- Quality of work
- Communication
- Timeliness
- Value for money

**Net Promoter Score** (0-10):
"How likely are you to recommend our services?"
- 0-6: Detractor
- 7-8: Passive
- 9-10: Promoter

**Written Feedback**:
- What went well
- Areas for improvement
- Specific comments

**Testimonial Request**:
- Permission to use feedback publicly
- Optional photo of completed work
- Social media sharing permission

**Review Request**:
- Links to review sites:
  - Google Reviews
  - Yelp
  - Facebook
  - BBB
  - HomeAdvisor
  - Angi

### Viewing responses inside HazardOS

Customers use a **public link** (`/feedback/...`) that does not require them to log in. Inside the app, your team may see new feedback through **in-app notifications** (bell), **email** alerts if enabled, and any **reports** or job-related screens your organization uses. There is not a single “Customer Feedback” tile on the home dashboard—use notifications, **Reports** (if configured), and job/CRM context to follow up.

**Testimonials** — When customers grant permission, use your internal approval or marketing workflow (and **Settings → Notifications** for `testimonial_pending`–style alerts if enabled) before quoting them publicly.

---

## Mobile Features

### Mobile-Optimized Design

HazardOS is built mobile-first for field technicians and estimators:

**Key Mobile Features**:
- Responsive layout for phones and tablets
- Touch-friendly controls
- **Surveys** mobile wizard for field capture
- **PWA** install for a home-screen shortcut (optional)

Offline behavior depends on what the browser has cached and what you have already opened; treat online access as required for syncing new work to the server.

### Installing as Mobile App (PWA)

**iOS (iPhone/iPad)**:
1. Open hazardos.app in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. Tap "Add"
5. HazardOS icon appears on home screen

**Android**:
1. Open hazardos.app in Chrome
2. Tap menu (three dots)
3. Select "Add to Home Screen"
4. Tap "Add"
5. HazardOS icon appears on home screen

**Benefits of PWA**:
- Home-screen icon and full-screen feel
- Often faster repeat visits (cached assets)
- No app store install required

**Push:** Browser push for HazardOS is limited by platform support and product settings; the **bell** in the web app is the reliable in-app notification surface.

### Offline and connectivity

- **Fully offline** operation is not guaranteed for all features—assume you need a connection to **submit** surveys, **upload** media, **send** email, or **refresh** lists.
- If you lose signal while in the field, keep working where the product allows drafts or queued uploads; reconnect to **sync** as soon as possible.

### Mobile Survey Workflow

Optimized for field efficiency:

1. **Arrive at site**
2. Open HazardOS in the browser (or from your home screen if you installed the PWA)
3. Tap **New Survey**
4. Quick info entry:
   - Customer selection (typeahead)
   - Address (GPS capture)
   - Hazard type (large touch buttons)
5. Take photos:
   - In-app camera
   - Automatic compression
   - GPS tagging
   - Categorization
6. Add notes with voice input
7. Save draft or submit immediately
8. Data syncs when online

### Mobile Time Tracking

For technicians on job sites:

1. Open job from dashboard
2. Tap **Clock In**
3. Select work type
4. Timer starts automatically
5. Take break: Tap **Pause**
6. Resume work: Tap **Resume**
7. End day: Tap **Clock Out**
8. Review hours
9. Tap **Submit Time Entry**

### Taking Photos in the Field

**Best Practices**:
- Use landscape orientation for wide shots
- Portrait for height documentation
- Natural lighting preferred
- Include scale reference (tape measure)
- Multiple angles of same area
- Document access points
- Before photos critical

**Photo Management**:
- Photos auto-compress to save data
- Upload immediately or queue for later
- Add captions on-site for context
- Organize by category as you shoot
- Review photos before submitting

---

## Tips and Best Practices

### General Usage Tips

**Stay Organized**:
- Update customer status regularly
- Complete surveys promptly after site visits
- Review and approve jobs quickly
- Send invoices immediately after completion

**Mobile Efficiency**:
- Install PWA on phone for quick access
- Take photos during inspections, not after
- Use voice input for notes
- Enable offline mode for field work

**Data Quality**:
- Enter complete information
- Use consistent naming conventions
- Add detailed notes for future reference
- Keep contact information current

### Customer Management

**Lead Management**:
- Follow up within 24 hours
- Track all communication in notes
- Update status as relationship progresses
- Set reminders for follow-ups

**Communication**:
- Use professional email templates
- Respond to inquiries promptly
- Document all customer interactions
- cc: office on field communications

**Relationship Building**:
- Note personal details (birthdays, preferences)
- Send thank-you notes after jobs
- Request referrals from satisfied customers
- Build testimonial library

### Site Survey Best Practices

**Preparation**:
- Review customer information before visit
- Bring measuring tools and camera
- Print site survey form as backup
- Arrive on time, call if delayed

**During Survey**:
- Introduce yourself professionally
- Explain what you're doing
- Take comprehensive photos
- Note all access issues
- Ask about customer's concerns
- Provide realistic timeline

**After Survey**:
- Complete survey same day
- Upload all photos
- Submit for estimating
- Follow up with customer

### Estimating Accuracy

**Detailed Measurements**:
- Measure carefully, document method
- Include safety margins
- Account for access difficulties
- Consider waste factors

**Material Estimates**:
- Review past jobs for accuracy
- Add contingency for unknowns
- Include all required materials
- Don't forget consumables

**Labor Estimates**:
- Account for setup/cleanup time
- Include travel time
- Consider crew skill levels
- Add time for difficult access

**Review Process**:
- Have experienced estimator review
- Compare to similar past jobs
- Check math and totals
- Verify pricing is current

### Job Management

**Pre-Job Planning**:
- Review estimate and survey thoroughly
- Order materials in advance
- Confirm crew assignments
- Verify access and logistics
- Call customer day before

**During Job**:
- Log time daily
- Track material usage
- Take progress photos
- Document any issues immediately
- Communicate with office

**Post-Job**:
- Complete all documentation same day
- Upload all photos
- Submit time entries
- Request feedback
- Follow up on any issues

### Invoicing

**Timely Invoicing**:
- Invoice immediately after job approval
- Don't wait for month-end
- Send reminders for overdue invoices
- Offer multiple payment methods

**Professional Invoices**:
- Detailed line items
- Clear payment terms
- Contact information prominent
- Professional appearance

**Payment Terms**:
- Net 30 for established customers
- Partial payment upfront for new customers
- Late fees clearly stated
- Incentives for early payment

### Reporting and Analytics

**Regular Reviews**:
- Weekly: Active jobs, upcoming schedule
- Monthly: Revenue, job completion rate
- Quarterly: Customer growth, profitability
- Annual: Year-over-year trends

**Key Metrics to Track**:
- Conversion rate (surveys to jobs)
- Average job value
- Profit margin by job type
- Customer satisfaction scores
- Employee productivity

**Using Data**:
- Identify profitable job types
- Improve estimating accuracy
- Recognize top performers
- Spot training opportunities

### Security Best Practices

**Password Security**:
- Use strong, unique passwords
- Change password regularly
- Never share login credentials
- Log out on shared devices

**Data Protection**:
- Don't email sensitive customer data
- Use secure methods to share documents
- Lock mobile device with PIN/biometric
- Report suspicious activity immediately

**Mobile Security**:
- Enable device encryption
- Use screen lock
- Keep app updated
- Don't access on public WiFi without VPN

### Getting Help

**In-App Help**:
- Hover over fields for tooltips
- Look for help icons (?)
- Check status messages

**Support Resources**:
- User documentation at /docs
- Video tutorials (coming soon)
- Email support: mark.hope@asymmetric.pro
- Response within 24 hours

**Training**:
- Request team training sessions
- Watch recorded webinars
- Practice in demo environment
- Share tips with team

### Common Questions

**Q: Can I use HazardOS offline?**
A: Partially. The PWA can cache some assets and previously viewed pages, but you should plan on having connectivity to submit surveys, upload photos, and sync data reliably.

**Q: How do I add team members?**
A: Organization admins use **Settings → Team Members** (and invitations, if your org uses them).

**Q: Can I export my data?**
A: Yes, most reports can be exported to CSV or PDF.

**Q: How long are photos stored?**
A: Photos are stored indefinitely in Supabase Storage.

**Q: Can customers see my notes?**
A: No, internal notes are never visible to customers.

**Q: What happens if I delete a customer?**
A: Better to mark as "Inactive" to preserve historical data.

**Q: How do I reschedule a job?**
A: Open job details, click Edit, update schedule, or drag in calendar.

**Q: Can I customize how invoices look?**
A: Branding and document behavior are controlled under **Settings** (e.g. company profile and branding). Specific template options depend on your organization’s configuration.

**Q: Is my data backed up?**
A: Yes, daily automated backups by Supabase.

**Q: Can I use this on multiple devices?**
A: Yes, login on any device. Changes sync automatically.

---

## Keyboard and browser shortcuts

HazardOS does not ship a global shortcut map inside the app. Your **browser** shortcuts apply (for example, **Esc** often closes dialogs built with accessible components). Use the **Tab** key to move between fields in forms.

---

## Glossary

**Assessment**: Legacy term for **site survey**

**CRM**: **Customer relationship management** area in the app (**CRM** menu): contacts, companies, opportunities, pipeline, and CRM-scoped jobs

**Contact**: A person record (stored internally as `customer` in some APIs)—see **CRM → Contacts**

**Containment Level**: The level of isolation required for hazardous material work

**Estimator**: Team member who conducts site surveys and creates estimates

**Job Completion**: The process of documenting completed work and gathering customer feedback

**NPS (Net Promoter Score)**: Customer loyalty metric (0-10 scale)

**Organization**: Your company within the multi-tenant platform

**RLS (Row Level Security)**: Database security that isolates your data from other organizations

**Site Survey**: Field inspection form to assess hazardous material removal needs

**Technician**: Team member who executes jobs in the field

**Tenant**: Another word for organization in multi-tenant systems

**Variance**: The difference between estimated and actual costs/hours

---

**Document version:** 1.1  
**Last review:** April 29, 2026

**Need help?** Contact your organization admin or **mark.hope@asymmetric.pro** for product support.
