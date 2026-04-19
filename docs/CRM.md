# HazardOS CRM

The CRM is the primary hub of HazardOS. It is the first tab in the main navigation and serves as the source of truth for all customer relationships, sales pipeline, and job tracking.

## Navigation

When a user clicks **CRM** in the main nav, the main navigation bar is replaced by the CRM sub-navigation. A **Main Menu** link on the right returns the user to the standard navigation.

### CRM Sub-Tabs

| Tab | Route | Purpose |
|-----|-------|---------|
| Contacts | `/crm/contacts` | People — leads, prospects, customers |
| Companies | `/crm/companies` | Business accounts and organizations |
| Opportunities | `/crm/opportunities` | Sales opportunities (list view) |
| Pipeline | `/crm/pipeline` | Kanban board for drag-and-drop stage management |
| Jobs | `/crm/jobs` | Scheduled and completed work |
| Properties | `/crm/properties` | Physical addresses with work history tracking |

## Data Model

### Entity Relationships

```
Companies (1) ──── (many) Contacts
    │                        │
    │                        │
    └──── (many) ────────────┤
                             │
                      Opportunities
                             │
                         (converts to)
                             │
                           Jobs
```

- A **Company** has many **Contacts** and many **Opportunities**
- A **Contact** belongs to zero or one **Company** (residential contacts have no company)
- An **Opportunity** is linked to a Contact, optionally to a Company
- A **Job** is created when an Opportunity is won
- Companies cannot exist without at least one contact — they are created through the contact flow

### Contact Types

- **Residential** — Individual homeowner, no company association
- **Commercial** — Person at a business, linked to a Company record

When creating a commercial contact, the user can search for an existing company or type a new name. New companies are auto-created and linked.

### Multi-Touch Attribution

Every entity tracks marketing attribution with three touch points:

| Touch | Purpose |
|-------|---------|
| `first_touch_source/medium/campaign` | How they originally found us |
| `last_touch_source/medium/campaign` | What brought them back |
| `converting_touch_source/medium/campaign` | What closed the deal |

**Source inheritance** is handled by database triggers:
- Contact/Company attribution flows to Opportunities on create
- Opportunity attribution flows to Jobs on create
- All inherited values are overridable

The `attribution_touchpoints` table logs every interaction in the customer journey for full-funnel analysis.

### Revenue Attribution

The combination of `jobs.lead_source` + `jobs.actual_revenue` provides true marketing ROI — actual revenue tied back to the original lead source, not just lead counts.

## Contacts

### Database Table: `customers`

The contacts table (historically named `customers`) stores all person records.

**Core fields:** `first_name`, `last_name`, `title`, `email`, `mobile_phone`, `office_phone`, `preferred_contact_method`

**Relationship fields:** `company_id` (FK), `contact_type` (residential/commercial), `contact_role` (decision_maker, influencer, billing, property_manager, site_contact), `contact_status` (active, inactive, do_not_contact), `is_primary_contact`

**Opt-in tracking:** `opted_into_email`, `opted_into_email_date`, `opted_into_sms`, `opted_into_sms_date`

**Attribution:** `lead_source`, `lead_source_detail`, `first_touch_date`, `utm_source/medium/campaign`, `last_touch_source/medium/campaign`, `converting_touch_source/medium/campaign`, `referred_by_contact_id`

**Follow-up:** `last_contacted_date`, `next_followup_date`, `next_followup_note`

**Legacy fields:** `name` (computed from first+last), `status` (lead/prospect/customer/inactive), `source`, `marketing_consent`

### List View (`/crm/contacts`)

- **Search:** name, email, phone, company
- **Filters:** contact type (residential/commercial), status (lead/prospect/customer/inactive)
- **Columns:** Name (linked, with title), Company, Contact info (email + phone with icons), Type badge, Status badge, Last Contacted, Next Follow-up (overdue highlighted in red)
- **Actions:** New Contact button top-right

### Detail View (`/crm/contacts/[id]`)

Two-column layout:

**Left sidebar (static contact card):**
- Name, title, company (linked to company detail)
- Email (mailto link), mobile phone, office phone, preferred method
- Address
- Badges: contact type, status, role
- Email/SMS opt-in indicators

**Right content (tabbed):**
- **Overview** — Key dates (first touch, last contacted, next follow-up, created), attribution fields, notes, linked site surveys
- **Activity** — Chronological activity feed
- **Opportunities** — Linked opportunities (placeholder, to be wired)
- **Jobs** — Linked jobs (placeholder, to be wired)

### Create/Edit Form

Grouped into sections:
1. **Contact Type** — Residential/Commercial toggle
2. **Basic Info** — First name, last name, title, contact role (commercial only), company (commercial only, with search)
3. **Contact Methods** — Email, mobile phone, office phone, preferred method, email/SMS opt-in checkboxes
4. **Relationship** — Status, source
5. **Attribution** — Lead source, source detail
6. **Address** — Street, city, state, ZIP
7. **Notes & Follow-up** — Notes textarea, next follow-up date + note

## Companies

### Database Table: `companies`

**Core fields:** `name`, `company_type` (residential_property_mgr, commercial_property_mgr, general_contractor, industrial, hoa, government, direct_homeowner, other), `industry`, `website`, `primary_phone`, `primary_email`

**Addresses:** Separate billing (`billing_address_line1/2`, `billing_city/state/zip`) and service (`service_address_line1/2`, `service_city/state/zip`) addresses

**Relationship:** `account_owner_id` (FK to profiles), `account_status` (prospect/active/inactive/churned), `customer_since`, `preferred_contact_method`

**Attribution:** `lead_source`, `lead_source_detail`, `first_touch_date`, `utm_source/medium/campaign`, `referred_by_company_id`, `referred_by_contact_id`, multi-touch fields

**Financial:** `lifetime_value`, `total_jobs_completed`, `average_job_value`, `payment_terms`, `quickbooks_customer_id`

### List View (`/crm/companies`)

- **Search:** company name, phone, email
- **Filters:** account status (prospect/active/inactive/churned)
- **Columns:** Company name (linked, with industry), Type, Phone, Location, Status badge, Total Jobs, Lifetime Value
- Companies are created through the contact flow (no standalone create button)

### Detail View (`/crm/companies/[id]`)

**Left sidebar:**
- Account status badge
- Email, phone, website (external link)
- Billing address, service address (if different)
- Customer since, preferred contact method
- Financial summary: lifetime value, jobs completed, average job value, payment terms

**Right content (tabbed):**
- **Overview** — Attribution, QuickBooks ID, notes
- **Contacts** — All linked contacts with role badges, primary indicator, add contact button
- **Opportunities** — Placeholder
- **Jobs** — Placeholder
- **Activity** — Placeholder

## Opportunities

### Database Table: `opportunities`

**Core:** `name`, `customer_id` (FK), `company_id` (FK), `stage_id` (FK to pipeline_stages), `opportunity_status` (new/assessment_scheduled/estimate_sent/won/lost/no_decision), `primary_contact_id`, `site_contact_id`

**Property/Site:** `service_address_line1/2`, `service_city/state/zip`, `property_type` (residential_single_family, residential_multi_family, commercial, industrial, government), `property_age` (year built)

**Hazard Details:** `hazard_types[]` (multi-select), `estimated_affected_area_sqft`, `urgency` (routine/urgent/emergency), `regulatory_trigger` (inspection_required, sale_pending, tenant_complaint, insurance_claim, voluntary)

**Pipeline:** `estimated_value`, `weighted_value`, `probability_pct`, `expected_close_date`, `assessment_date`, `estimate_sent_date`, `follow_up_date`

**Loss tracking:** `loss_reason`, `lost_to_competitor`, `loss_notes`

**Attribution:** Three-touch fields, `lead_source`, `created_from_assessment_id` (FK to site_surveys)

### List View (`/crm/opportunities`)

- **Search:** opportunity name
- **Filters:** status, urgency
- **Stats cards:** Opportunity count, pipeline value, weighted value
- **Columns:** Name/location, Company/Contact, Hazard badges, Stage (color-coded), Value/weighted, Urgency, Expected close
- **Actions:** View Pipeline button, New Opportunity button

### Detail View (`/crm/opportunities/[id]`)

**Left sidebar:**
- Stage badge, status badge, urgency badge
- Contact link, company link, service address
- Hazard types, property type
- Value, weighted value, probability
- Key dates (expected close, actual close)
- Loss details card (shown when lost: reason, competitor, notes)

**Right content (tabbed):**
- **Overview** — Site details (regulatory trigger, year built, affected area), key dates (assessment, estimate sent, follow-up with overdue highlight), three-touch attribution, notes
- **Assessment** — Linked assessment or "Schedule Assessment" prompt
- **Estimate** — Linked estimate or "Create Estimate" prompt
- **Activity** — Placeholder
- **Jobs** — Linked job if won, "Create Job" prompt, or empty state

**Mark Won:** One-click button, sets outcome/status/close date.

**Mark Lost:** Opens modal with reason dropdown (price, competitor, no_decision, project_cancelled, timing), competitor name, notes, optional follow-up date.

## Pipeline

### Route: `/crm/pipeline`

Kanban drag-and-drop board showing opportunities organized by pipeline stage. Shares the same data as the Opportunities list but presented visually.

**Stats cards:** Opportunity count, pipeline value, weighted value

**Default stages:** New Lead (10%) → Qualified (25%) → Proposal Sent (50%) → Negotiation (75%) → Won (100%) / Lost (0%)

Stages are configurable per organization with custom names, colors, and probability percentages.

## Jobs

### Database Table: `jobs`

**Core:** `job_number` (auto-generated), `opportunity_id` (FK), `company_id` (FK), `customer_id` (FK), `primary_contact_id`, `site_contact_id`, `crew_lead_id`, `status` (scheduled/in_progress/on_hold/completed/invoiced/paid/cancelled)

**Site/Scope:** `hazard_types[]`, `containment_level` (OSHA Type I/II/III), `actual_affected_area_sqft`, `disposal_manifest_numbers[]`, `permit_numbers[]`, `air_monitoring_required`, `clearance_testing_required`

**Scheduling:** `scheduled_start_date/end_date`, `actual_start_at/end_at`, `estimated_labor_hours`, `actual_labor_hours`

**Financial:** `estimated_revenue`, `actual_revenue`, `estimated_cost`, `actual_cost`, `gross_margin_pct`, `deposit_amount`, `deposit_received_date`, `final_invoice_date`, `final_payment_date`, `invoice_id` (QB)


**Attribution:** `lead_source`, `first/last/converting_touch_source/medium/campaign`, `attributed_lead_source`, `is_repeat_customer`, `referral_job_id`

### List View (`/crm/jobs`)

- **Search:** job number, company, address
- **Filters:** status
- **Stats cards:** Total, scheduled, in progress, completed, revenue
- **Columns:** Job number/name, Company/Contact, Address, Hazard badges, Status, Scheduled dates, Revenue

### Detail View (`/crm/jobs/[id]`)

**Left sidebar:**
- Job number, status badge
- Company link, contact link, address
- Hazards, containment level
- Schedule dates, revenue

**Right content (tabbed):**
- **Overview** — Linked opportunity, compliance (air monitoring, clearance, permits, manifests), notes/special instructions
- **Financials** — Estimated vs actual revenue/cost, gross margin, deposit (amount + received date), invoice (date + payment date + QB ID)
- **Crew & Schedule** — Estimated vs actual hours, actual start/end timestamps
- **Documents** — Placeholder for permits, manifests, clearance reports, photos
- **Activity** — Placeholder

**Status Update Modal:** Status dropdown, actual hours prompt (when completing), notes field. Auto-sets `actual_start_at` on In Progress, `actual_end_at` on Complete.

## Properties

### Overview

Properties track the complete work history of physical addresses across different owners and contacts. This provides continuity when ownership changes but environmental hazards remain at the same location.

### Database Tables

#### `properties`
**Core fields:** `address_line1`, `address_line2`, `city`, `state`, `zip_code`, `property_type` (single_family, multi_family, commercial, industrial, mixed_use, vacant_land), `year_built`, `square_footage`

**Contact tracking:** `current_primary_contact_id` (FK to customers), `notes`

**Metadata:** `created_at`, `updated_at`, `organization_id`

#### `property_contacts`
Junction table linking properties to contacts with role-based relationships:

**Fields:** `property_id`, `contact_id`, `role` (owner, previous_owner, tenant, site_contact, billing_contact), `start_date`, `end_date`, `is_active`, `notes`

This allows tracking ownership history, tenant relationships, and designated contacts for different purposes.

### List View (`/crm/properties`)

- **Search:** Full address search (street, city, state, ZIP)
- **Columns:** Full Address, Property Type, Current Primary Contact (linked), Contact Count, Job Count, Year Built, Square Footage
- **Actions:** New Property button top-right

### Detail View (`/crm/properties/[id]`)

**Left sidebar (static property card):**
- Full address
- Property type and year built badges  
- Square footage
- Current primary contact (linked to contact detail)

**Right content (tabbed):**
- **Overview** — Property details, notes, contact counts, job counts
- **Contacts** — List of all associated contacts with roles and date ranges, "Mark as Moved Out" action for active contacts
- **Jobs** — Complete work history at this address (linked jobs from all contacts)
- **Activity** — Property-related activity feed

### Contact Roles

| Role | Purpose |
|------|---------|
| `owner` | Current property owner |
| `previous_owner` | Former owner (for continuity tracking) |
| `tenant` | Current tenant or lessee |
| `site_contact` | On-site contact for work coordination |
| `billing_contact` | Handles payments and invoicing |

Multiple contacts can have the same role (e.g., multiple owners, multiple tenants). Date ranges track when relationships were active.

### Create/Edit Form

Grouped into sections:
1. **Property Details** — Address fields, property type, year built, square footage
2. **Primary Contact** — Current primary contact selection (required)
3. **Notes** — Property-specific notes and observations

### Business Logic

- **Contact Assignment**: Properties require a primary contact but can have multiple associated contacts through `property_contacts`
- **Work History Continuity**: Jobs remain linked to properties even when ownership changes
- **Role Management**: "Mark as Moved Out" action sets `end_date` and `is_active = false` for contact relationships
- **Attribution**: Properties inherit marketing attribution from their primary contact

## File Structure

```
app/(dashboard)/crm/
  layout.tsx                    # CRM sub-navigation with Main Menu link
  page.tsx                      # Redirects to /crm/contacts
  contacts/
    page.tsx                    # Contact list
    [id]/page.tsx               # Contact detail
  companies/
    page.tsx                    # Company list
    [id]/page.tsx               # Company detail
  opportunities/
    page.tsx                    # Opportunity list
    new/page.tsx                # Create opportunity form
    [id]/page.tsx               # Opportunity detail
  pipeline/
    page.tsx                    # Kanban board
  jobs/
    page.tsx                    # Job list
    [id]/page.tsx               # Job detail
  properties/
    page.tsx                    # Property list
    [id]/page.tsx               # Property detail

components/
  customers/
    customer-list.tsx           # Contact list with search/filters
    customer-list-item.tsx      # Contact list row
    customer-detail.tsx         # Contact detail (sidebar + tabs)
    customer-form.tsx           # Contact create/edit form
    create-customer-modal.tsx   # Create contact dialog
    edit-customer-modal.tsx     # Edit contact dialog
    customer-search.tsx         # Search input component
    customer-status-badge.tsx   # Status badge component
    customer-info-card.tsx      # Info card for detail view
    customer-surveys-list.tsx   # Linked surveys
    customer-invoices-list.tsx  # Linked invoices
    customer-activity-feed.tsx  # Activity feed
    delete-customer-dialog.tsx  # Delete confirmation
  companies/
    company-list.tsx            # Company list with search/filters
  pipeline/
    pipeline-kanban.tsx         # Kanban board
    pipeline-kanban-lazy.tsx    # Lazy-loaded kanban
    opportunity-actions.tsx     # Opportunity action buttons

lib/
  supabase/
    customers.ts                # CustomersService (CRUD, search)
    companies.ts                # CompaniesService (CRUD, search)
  hooks/
    use-customers.ts            # TanStack Query hooks for contacts
    use-companies.ts            # TanStack Query hooks for companies
    use-properties.ts           # TanStack Query hooks for properties
  services/
    pipeline-service.ts         # Pipeline/opportunity service (server-side)
    properties-service.ts       # PropertiesService (CRUD, contact assignment)
  validations/
    customer.ts                 # Zod schema, form types, option constants
    properties.ts               # Property validation schemas

types/
  database.ts                   # All DB types (Company, Customer, enums)
  sales.ts                      # Opportunity, PipelineStage, etc.
```

## Database Migrations

| Migration | Purpose |
|-----------|---------|
| `20260403000001_crm_companies.sql` | Create companies table, add company_id/contact_type to customers |
| `20260403000002_repair_sales_tables.sql` | Create pipeline_stages and opportunities tables |
| `20260403000003_enhance_companies.sql` | Full company model (type, addresses, attribution, financials) |
| `20260403000004_enhance_contacts.sql` | Full contact model (first/last name, roles, opt-in, attribution, follow-up) |
| `20260403000005_enhance_opportunities.sql` | Full opportunity model (property, hazards, urgency, dates, attribution) |
| `20260403000006_enhance_jobs.sql` | Full job model (containment, compliance, financials, attribution) |
| `20260403000007_multi_touch_attribution.sql` | Three-touch attribution, source inheritance triggers, touchpoints log |
| `20260418000001_properties.sql` | Properties and property_contacts tables for address-based work history |

## API Routes

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/v1/companies` | GET, POST | List/create companies |
| `/api/v1/companies/[id]` | GET, PATCH, DELETE | Company CRUD |
| `/api/invitations` | GET, POST | Team invitations |
| `/api/invitations/[id]` | DELETE | Revoke invitation |

Existing customer and pipeline API routes continue to work. Old routes (`/customers`, `/pipeline`) redirect to the CRM equivalents.
