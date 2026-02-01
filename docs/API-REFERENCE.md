# HazardOS API Reference

**Complete API documentation for HazardOS environmental remediation platform**

> **Status**: Production Ready ✅  
> **Last Updated**: January 31, 2026  
> **Base URL**: `https://hazardos.app/api`

---

## 🔐 Authentication

All API endpoints require authentication via Supabase Auth. Include the user's JWT token in the Authorization header:

```http
Authorization: Bearer <jwt_token>
```

**Multi-tenant Security**: All endpoints automatically filter data by the user's organization through Row Level Security (RLS) policies.

---

## 👥 Customers API

### `GET /api/customers`

List customers with optional filtering and pagination.

**Query Parameters:**
- `search` (string, optional) - Search by name, email, phone, or address
- `status` (string, optional) - Filter by customer status: `lead`, `prospect`, `customer`, `inactive`
- `source` (string, optional) - Filter by acquisition source: `referral`, `website`, `advertising`, `cold_call`, `trade_show`, `other`
- `page` (number, optional) - Page number for pagination (default: 1)
- `limit` (number, optional) - Results per page (default: 25, max: 100)

**Example Request:**
```http
GET /api/customers?search=john&status=prospect&page=1&limit=10
```

**Response:**
```json
{
  "customers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "organization_id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "(555) 123-4567",
      "address": "123 Main St",
      "city": "Anytown", 
      "state": "CA",
      "zip": "12345",
      "status": "prospect",
      "source": "website",
      "notes": "Interested in asbestos inspection for commercial building",
      "marketing_consent": true,
      "created_at": "2026-01-31T10:00:00.000Z",
      "updated_at": "2026-01-31T15:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 50,
    "page": 1,
    "limit": 10,
    "pages": 5
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid query parameters
- `401` - Unauthorized
- `500` - Server error

---

### `POST /api/customers`

Create a new customer.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "(555) 987-6543",
  "address": "456 Oak Ave",
  "city": "Springfield",
  "state": "IL", 
  "zip": "62701",
  "status": "lead",
  "source": "referral",
  "notes": "Referred by John Doe for mold inspection",
  "marketing_consent": false
}
```

**Required Fields:**
- `name` (string) - Customer name

**Optional Fields:**
- `email` (string) - Email address
- `phone` (string) - Phone number
- `address` (string) - Street address
- `city` (string) - City
- `state` (string) - State/province
- `zip` (string) - Postal code
- `status` (enum) - Customer status (default: `lead`)
- `source` (enum) - Acquisition source
- `notes` (text) - Additional notes
- `marketing_consent` (boolean) - Marketing consent (default: `false`)

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "(555) 987-6543",
  "address": "456 Oak Ave",
  "city": "Springfield",
  "state": "IL",
  "zip": "62701", 
  "status": "lead",
  "source": "referral",
  "notes": "Referred by John Doe for mold inspection",
  "marketing_consent": false,
  "created_at": "2026-01-31T16:00:00.000Z",
  "updated_at": "2026-01-31T16:00:00.000Z"
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Invalid request body or validation errors
- `401` - Unauthorized
- `500` - Server error

---

### `GET /api/customers/[id]`

Get a specific customer by ID.

**Path Parameters:**
- `id` (UUID) - Customer ID

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "address": "123 Main St",
  "city": "Anytown",
  "state": "CA", 
  "zip": "12345",
  "status": "customer",
  "source": "website",
  "notes": "Regular customer, prefers morning appointments",
  "marketing_consent": true,
  "created_at": "2026-01-31T10:00:00.000Z",
  "updated_at": "2026-01-31T15:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `404` - Customer not found
- `401` - Unauthorized
- `500` - Server error

---

### `PUT /api/customers/[id]`

Update an existing customer.

**Path Parameters:**
- `id` (UUID) - Customer ID

**Request Body:**
```json
{
  "name": "John Doe Jr.",
  "email": "john.jr@example.com",
  "status": "customer",
  "notes": "Updated contact information, now active customer"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "John Doe Jr.",
  "email": "john.jr@example.com",
  "phone": "(555) 123-4567",
  "address": "123 Main St",
  "city": "Anytown",
  "state": "CA",
  "zip": "12345",
  "status": "customer", 
  "source": "website",
  "notes": "Updated contact information, now active customer",
  "marketing_consent": true,
  "created_at": "2026-01-31T10:00:00.000Z",
  "updated_at": "2026-01-31T16:15:00.000Z"
}
```

**Status Codes:**
- `200` - Updated successfully
- `400` - Invalid request body or validation errors
- `404` - Customer not found
- `401` - Unauthorized
- `500` - Server error

---

### `DELETE /api/customers/[id]`

Delete a customer. This operation includes safety checks for linked site surveys.

**Path Parameters:**
- `id` (UUID) - Customer ID

**Response:**
```json
{
  "message": "Customer deleted successfully",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Response (if customer has linked surveys):**
```json
{
  "error": "Cannot delete customer with linked site surveys",
  "details": {
    "customer_id": "550e8400-e29b-41d4-a716-446655440000",
    "linked_surveys": 3
  }
}
```

**Status Codes:**
- `200` - Deleted successfully
- `400` - Cannot delete (has linked surveys)
- `404` - Customer not found
- `401` - Unauthorized
- `403` - Insufficient permissions (requires admin role)
- `500` - Server error

---

## 👥 Customer Contacts API

### `GET /api/customers/[id]/contacts`

List all contacts for a specific customer.

**Path Parameters:**
- `id` (UUID) - Customer ID

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440020",
    "organization_id": "550e8400-e29b-41d4-a716-446655440001",
    "customer_id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Smith",
    "title": "Project Manager",
    "email": "john@acmecorp.com",
    "phone": "(555) 123-4567",
    "mobile": "(555) 987-6543",
    "role": "primary",
    "is_primary": true,
    "preferred_contact_method": "email",
    "notes": "Main point of contact for all projects",
    "created_at": "2026-02-01T10:00:00.000Z",
    "updated_at": "2026-02-01T10:00:00.000Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - Customer not found
- `500` - Server error

---

### `POST /api/customers/[id]/contacts`

Create a new contact for a customer.

**Path Parameters:**
- `id` (UUID) - Customer ID

**Request Body:**
```json
{
  "name": "Jane Doe",
  "title": "Safety Officer",
  "email": "jane@acmecorp.com",
  "phone": "(555) 222-3333",
  "mobile": "(555) 444-5555",
  "role": "site",
  "is_primary": false,
  "preferred_contact_method": "phone",
  "notes": "On-site contact for inspections"
}
```

**Required Fields:**
- `name` (string) - Contact name

**Optional Fields:**
- `title` (string) - Job title
- `email` (string) - Email address
- `phone` (string) - Phone number
- `mobile` (string) - Mobile number
- `role` (enum) - Contact role: `primary`, `billing`, `site`, `scheduling`, `general`
- `is_primary` (boolean) - Primary contact flag (default: false, auto-set to true if first contact)
- `preferred_contact_method` (enum) - Preferred method: `email`, `phone`, `mobile`, `any`
- `notes` (text) - Additional notes

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440021",
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Jane Doe",
  "title": "Safety Officer",
  "email": "jane@acmecorp.com",
  "phone": "(555) 222-3333",
  "mobile": "(555) 444-5555",
  "role": "site",
  "is_primary": false,
  "preferred_contact_method": "phone",
  "notes": "On-site contact for inspections",
  "created_at": "2026-02-01T11:00:00.000Z",
  "updated_at": "2026-02-01T11:00:00.000Z"
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Invalid request body
- `401` - Unauthorized
- `404` - Customer not found
- `500` - Server error

---

### `GET /api/customers/[id]/contacts/[contactId]`

Get a specific contact by ID.

**Path Parameters:**
- `id` (UUID) - Customer ID
- `contactId` (UUID) - Contact ID

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Smith",
  "title": "Project Manager",
  "email": "john@acmecorp.com",
  "phone": "(555) 123-4567",
  "mobile": "(555) 987-6543",
  "role": "primary",
  "is_primary": true,
  "preferred_contact_method": "email",
  "notes": "Main point of contact for all projects",
  "created_at": "2026-02-01T10:00:00.000Z",
  "updated_at": "2026-02-01T10:00:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - Contact not found
- `500` - Server error

---

### `PATCH /api/customers/[id]/contacts/[contactId]`

Update an existing contact.

**Path Parameters:**
- `id` (UUID) - Customer ID
- `contactId` (UUID) - Contact ID

**Request Body:**
```json
{
  "title": "Senior Project Manager",
  "email": "john.smith@acmecorp.com",
  "preferred_contact_method": "mobile"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440020",
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Smith",
  "title": "Senior Project Manager",
  "email": "john.smith@acmecorp.com",
  "phone": "(555) 123-4567",
  "mobile": "(555) 987-6543",
  "role": "primary",
  "is_primary": true,
  "preferred_contact_method": "mobile",
  "notes": "Main point of contact for all projects",
  "created_at": "2026-02-01T10:00:00.000Z",
  "updated_at": "2026-02-01T12:00:00.000Z"
}
```

**Status Codes:**
- `200` - Updated successfully
- `400` - Invalid request body
- `401` - Unauthorized
- `404` - Contact not found
- `500` - Server error

---

### `DELETE /api/customers/[id]/contacts/[contactId]`

Delete a contact. If deleting the primary contact, another contact will be automatically promoted.

**Path Parameters:**
- `id` (UUID) - Customer ID
- `contactId` (UUID) - Contact ID

**Response:**
```json
{
  "message": "Contact deleted successfully"
}
```

**Status Codes:**
- `200` - Deleted successfully
- `401` - Unauthorized
- `404` - Contact not found
- `500` - Server error

---

### `POST /api/customers/[id]/contacts/[contactId]/set-primary`

Set a contact as the primary contact for the customer. This will automatically unset any existing primary contact.

**Path Parameters:**
- `id` (UUID) - Customer ID
- `contactId` (UUID) - Contact ID

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440021",
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Jane Doe",
  "title": "Safety Officer",
  "email": "jane@acmecorp.com",
  "phone": "(555) 222-3333",
  "mobile": "(555) 444-5555",
  "role": "site",
  "is_primary": true,
  "preferred_contact_method": "phone",
  "notes": "On-site contact for inspections",
  "created_at": "2026-02-01T11:00:00.000Z",
  "updated_at": "2026-02-01T13:00:00.000Z"
}
```

**Status Codes:**
- `200` - Updated successfully
- `401` - Unauthorized
- `404` - Contact not found
- `500` - Server error

---

## 📝 Activity API

### `POST /api/activity/manual`

Manually log a note or phone call for any entity (customer, job, estimate, etc.).

**Request Body:**
```json
{
  "type": "note",
  "entity_type": "customer",
  "entity_id": "550e8400-e29b-41d4-a716-446655440000",
  "entity_name": "Acme Corporation",
  "content": "Discussed project timeline and additional requirements"
}
```

**For Call Logging:**
```json
{
  "type": "call",
  "entity_type": "customer",
  "entity_id": "550e8400-e29b-41d4-a716-446655440000",
  "entity_name": "Acme Corporation",
  "call_direction": "outbound",
  "call_duration": 15,
  "content": "Follow-up call about proposal. Customer has questions about timeline."
}
```

**Required Fields:**
- `type` (enum) - Activity type: `note`, `call`
- `entity_type` (string) - Type of entity (customer, job, estimate, proposal, etc.)
- `entity_id` (UUID) - ID of the entity
- `content` (string) - Note content (required for notes)

**For Calls:**
- `call_direction` (enum) - Call direction: `inbound`, `outbound` (required for calls)
- `call_duration` (number) - Duration in minutes (optional)
- `content` (string) - Call notes (optional)

**Optional Fields:**
- `entity_name` (string) - Name of the entity for display

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200` - Activity logged successfully
- `400` - Invalid request body or missing required fields
- `401` - Unauthorized
- `500` - Server error

**Activity Types:**
- `note` - General note about an entity
- `call` - Phone call log with direction and duration

**Entity Types:**
- `customer` - Customer record
- `contact` - Customer contact
- `site_survey` - Site survey
- `estimate` - Estimate
- `proposal` - Proposal
- `job` - Job
- `invoice` - Invoice

---

## 📄 Proposals API

### `POST /api/proposals/generate`

Generate a PDF proposal from an estimate.

**Request Body:**
```json
{
  "estimateId": "550e8400-e29b-41d4-a716-446655440003",
  "customTerms": {
    "paymentTerms": "50% deposit required, balance due upon completion",
    "validDays": 30,
    "exclusions": [
      "Structural repairs not included",
      "Permit fees are customer responsibility"
    ]
  }
}
```

**Required Fields:**
- `estimateId` (UUID) - ID of the estimate to generate proposal from

**Optional Fields:**
- `customTerms` (object) - Custom terms and conditions
  - `paymentTerms` (string) - Payment terms text
  - `validDays` (number) - Proposal validity period in days
  - `exclusions` (array) - List of exclusions

**Response:**
Binary PDF file download with headers:
```http
Content-Type: application/pdf
Content-Disposition: attachment; filename="proposal-{estimate-id}.pdf"
```

**PDF Contents:**
- Company header with HazardOS branding
- Customer and site information
- Project details (hazard type, containment level, estimated duration)
- Itemized cost breakdown:
  - Labor costs (hours × rates)
  - Equipment costs (rental/usage)
  - Material costs (quantities × prices)
  - Disposal fees (by hazard type)
  - Travel costs (mileage/time)
- Subtotal, markup percentage, grand total
- Terms & conditions with custom exclusions
- Signature lines for customer acceptance

**Status Codes:**
- `200` - PDF generated successfully
- `400` - Invalid estimate ID or request body
- `404` - Estimate not found
- `401` - Unauthorized
- `500` - PDF generation error

---

## 📋 Jobs API

### `GET /api/jobs`

List jobs with filtering and pagination.

**Query Parameters:**
- `status` (string, optional) - Filter by status: `scheduled`, `in_progress`, `on_hold`, `completed`, `cancelled`
- `customer_id` (uuid, optional) - Filter by customer
- `start_date` (date, optional) - Filter jobs after this date
- `end_date` (date, optional) - Filter jobs before this date
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Results per page (default: 25)

**Response:**
```json
{
  "jobs": [{
    "id": "uuid",
    "job_number": "JOB-2026-001",
    "customer_id": "uuid",
    "customer_name": "Acme Corp",
    "status": "in_progress",
    "scheduled_start_date": "2026-02-15",
    "estimated_duration_hours": 40,
    "contract_amount": 15000.00
  }],
  "pagination": { /* ... */ }
}
```

---

### `POST /api/jobs/[id]/complete`

Submit job completion with time entries, material usage, and photos.

**Request Body:**
```json
{
  "field_notes": "Job completed successfully",
  "issues_encountered": "Minor access delay on day 2",
  "customer_signed": true,
  "customer_signature_name": "John Doe",
  "customer_signature_data": "data:image/png;base64,..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "job_id": "uuid",
  "status": "submitted",
  "actual_hours": 42.5,
  "hours_variance": 2.5,
  "hours_variance_percent": 6.25
}
```

---

### `GET /api/jobs/[id]/time-entries`

List time entries for a job.

**Response:**
```json
{
  "entries": [{
    "id": "uuid",
    "profile_id": "uuid",
    "work_date": "2026-02-15",
    "hours": 8.5,
    "work_type": "regular",
    "hourly_rate": 45.00,
    "billable": true
  }]
}
```

---

### `POST /api/jobs/[id]/time-entries`

Add a time entry to a job.

**Request Body:**
```json
{
  "work_date": "2026-02-15",
  "hours": 8.5,
  "work_type": "regular",
  "profile_id": "uuid",
  "description": "Site preparation and setup"
}
```

---

## 📊 Analytics API

### `GET /api/analytics/variance`

Get variance analysis for completed jobs.

**Query Parameters:**
- `start_date` (date, optional)
- `end_date` (date, optional)
- `customer_id` (uuid, optional)
- `variance_threshold` (number, optional) - Only return jobs with variance > threshold%

**Response:**
```json
{
  "summary": {
    "total_jobs": 45,
    "over_budget_count": 12,
    "under_budget_count": 8,
    "on_target_count": 25,
    "avg_hours_variance": 3.2,
    "avg_cost_variance": 450.00
  },
  "jobs": [{
    "job_id": "uuid",
    "job_number": "JOB-2026-001",
    "customer_name": "Acme Corp",
    "estimated_hours": 40,
    "actual_hours": 42.5,
    "hours_variance": 2.5,
    "hours_variance_percent": 6.25
  }]
}
```

---

## 📨 Feedback API

### `GET /api/feedback`

List feedback surveys for the organization (authenticated).

**Query Parameters:**
- `status` (string, optional) - Filter by status
- `job_id` (uuid, optional) - Filter by job

**Response:**
```json
{
  "surveys": [{
    "id": "uuid",
    "job_id": "uuid",
    "customer_id": "uuid",
    "status": "completed",
    "rating_overall": 5,
    "rating_quality": 5,
    "likelihood_to_recommend": 10,
    "completed_at": "2026-02-01T10:00:00Z"
  }]
}
```

---

### `POST /api/feedback`

Create a feedback survey for a completed job.

**Request Body:**
```json
{
  "job_id": "uuid",
  "send_immediately": true,
  "recipient_email": "customer@example.com"
}
```

**Response:**
```json
{
  "id": "uuid",
  "access_token": "abc123...",
  "token_expires_at": "2026-03-01T00:00:00Z",
  "status": "sent",
  "sent_at": "2026-02-01T10:00:00Z"
}
```

---

### `GET /api/feedback/[token]` (Public)

Get feedback survey by public token (no authentication required).

**Response:**
```json
{
  "id": "uuid",
  "job_number": "JOB-2026-001",
  "job_name": "Asbestos Removal - Building A",
  "organization_name": "ABC Remediation",
  "customer_name": "John Doe",
  "status": "pending",
  "completed_at": null
}
```

---

### `POST /api/feedback/[token]` (Public)

Submit feedback survey (no authentication required).

**Request Body:**
```json
{
  "rating_overall": 5,
  "rating_quality": 5,
  "rating_communication": 5,
  "rating_timeliness": 4,
  "rating_value": 5,
  "likelihood_to_recommend": 10,
  "would_recommend": true,
  "feedback_text": "Excellent service!",
  "testimonial_text": "Professional and thorough",
  "testimonial_permission": true
}
```

---

### `GET /api/feedback/stats`

Get aggregated feedback statistics for the organization.

**Response:**
```json
{
  "total_surveys": 156,
  "completed_surveys": 98,
  "avg_overall_rating": 4.7,
  "avg_quality_rating": 4.8,
  "avg_communication_rating": 4.6,
  "avg_timeliness_rating": 4.5,
  "nps_score": 72.5,
  "testimonials_count": 45,
  "response_rate": 62.8
}
```

---

## 🔗 Integrations API

### `GET /api/integrations/quickbooks`

Get QuickBooks integration status.

**Response:**
```json
{
  "is_connected": true,
  "is_active": true,
  "company_name": "ABC Remediation Inc",
  "realm_id": "123456789",
  "last_sync_at": "2026-02-01T08:00:00Z"
}
```

---

### `POST /api/integrations/quickbooks/connect`

Initiate QuickBooks OAuth connection.

**Response:**
```json
{
  "auth_url": "https://appcenter.intuit.com/connect/oauth2?..."
}
```

---

### `POST /api/integrations/quickbooks/sync/customers`

Sync customers to QuickBooks.

**Request Body:**
```json
{
  "customer_ids": ["uuid1", "uuid2"]  // Optional, syncs all if omitted
}
```

**Response:**
```json
{
  "synced_count": 15,
  "failed_count": 0,
  "details": [{
    "customer_id": "uuid",
    "qb_id": "123",
    "status": "success"
  }]
}
```

---

### `POST /api/integrations/quickbooks/sync/invoices`

Sync invoices to QuickBooks.

**Request Body:**
```json
{
  "invoice_ids": ["uuid1", "uuid2"]
}
```

---

## 📊 Reports API

### `GET /api/reports`

List all saved reports for the organization.

**Response:**
```json
[
  {
    "id": "uuid",
    "organization_id": "uuid",
    "name": "Monthly Sales Report",
    "description": "Sales performance by month",
    "report_type": "sales",
    "config": {
      "date_range": { "type": "this_month" }
    },
    "is_shared": true,
    "schedule_enabled": false,
    "created_at": "2026-02-01T10:00:00Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

### `POST /api/reports`

Create a new saved report.

**Request Body:**
```json
{
  "name": "Q1 Sales Performance",
  "description": "Quarterly sales analysis",
  "report_type": "sales",
  "config": {
    "date_range": {
      "type": "custom",
      "start": "2026-01-01",
      "end": "2026-03-31"
    }
  },
  "is_shared": false
}
```

**Required Fields:**
- `name` (string) - Report name
- `report_type` (enum) - Report type: `sales`, `jobs`, `leads`
- `config` (object) - Report configuration

**Response:**
```json
{
  "id": "uuid",
  "organization_id": "uuid",
  "name": "Q1 Sales Performance",
  "report_type": "sales",
  "config": { /* ... */ },
  "created_at": "2026-02-01T10:00:00Z"
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Invalid request body
- `401` - Unauthorized
- `500` - Server error

---

### `POST /api/reports/[type]/run`

Run a report and return data.

**Path Parameters:**
- `type` (string) - Report type: `sales`, `jobs`, `leads`

**Request Body:**
```json
{
  "date_range": {
    "type": "last_30_days"
  },
  "filters": {
    "status": "completed"
  }
}
```

**Response:**
```json
{
  "data": [
    {
      "month": "2026-02-01",
      "total_opportunities": 25,
      "total_value": 125000,
      "avg_value": 5000
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid report type
- `401` - Unauthorized
- `500` - Server error

---

### `POST /api/reports/export`

Export report data to Excel or CSV.

**Request Body:**
```json
{
  "format": "xlsx",
  "title": "Sales Performance Report",
  "data": [/* report data */],
  "columns": [
    { "field": "month", "label": "Month", "format": "date", "visible": true },
    { "field": "total_value", "label": "Revenue", "format": "currency", "visible": true }
  ],
  "report_id": "optional-uuid"
}
```

**Required Fields:**
- `format` (enum) - Export format: `xlsx`, `csv`
- `data` (array) - Report data rows
- `columns` (array) - Column definitions

**Response:**
Binary file download with headers:
```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="sales_performance_report_2026-02-01.xlsx"
```

**Status Codes:**
- `200` - File generated successfully
- `400` - Invalid format or missing data
- `401` - Unauthorized
- `500` - Export generation error

---

## 🎯 Pipeline API

### `GET /api/pipeline`

Get sales pipeline with stages, opportunities, and metrics.

**Response:**
```json
{
  "stages": [
    {
      "id": "uuid",
      "name": "Qualified",
      "color": "#3b82f6",
      "stage_type": "open",
      "probability": 20,
      "sort_order": 1
    }
  ],
  "opportunities": [
    {
      "id": "uuid",
      "name": "Acme Corp - Office Renovation",
      "customer_id": "uuid",
      "stage_id": "uuid",
      "estimated_value": 15000,
      "weighted_value": 3000,
      "expected_close_date": "2026-03-15",
      "owner_id": "uuid"
    }
  ],
  "metrics": {
    "total_value": 125000,
    "weighted_value": 58000,
    "count": 23,
    "by_stage": [/* stage metrics */]
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

### `POST /api/pipeline`

Create a new opportunity.

**Request Body:**
```json
{
  "customer_id": "uuid",
  "name": "XYZ Industries - Asbestos Removal",
  "description": "3-story building asbestos abatement",
  "stage_id": "uuid",
  "estimated_value": 25000,
  "expected_close_date": "2026-04-01",
  "owner_id": "uuid"
}
```

**Required Fields:**
- `customer_id` (UUID) - Customer ID
- `name` (string) - Opportunity name
- `stage_id` (UUID) - Initial pipeline stage

**Response:**
```json
{
  "id": "uuid",
  "customer_id": "uuid",
  "name": "XYZ Industries - Asbestos Removal",
  "stage_id": "uuid",
  "estimated_value": 25000,
  "weighted_value": 5000,
  "created_at": "2026-02-01T10:00:00Z"
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Invalid request body
- `401` - Unauthorized
- `500` - Server error

---

### `POST /api/pipeline/[id]/move`

Move opportunity to a different stage (drag-and-drop).

**Path Parameters:**
- `id` (UUID) - Opportunity ID

**Request Body:**
```json
{
  "stage_id": "uuid",
  "notes": "Customer requested revised proposal"
}
```

**Required Fields:**
- `stage_id` (UUID) - New stage ID

**Response:**
```json
{
  "id": "uuid",
  "stage_id": "uuid",
  "weighted_value": 6000,
  "outcome": null,
  "updated_at": "2026-02-01T11:00:00Z"
}
```

**Status Codes:**
- `200` - Moved successfully
- `400` - Invalid stage_id
- `401` - Unauthorized
- `404` - Opportunity not found
- `500` - Server error

---

## ✅ Approvals API

### `GET /api/approvals`

List approval requests with filtering.

**Query Parameters:**
- `entity_type` (string, optional) - Filter by type: `estimate`, `discount`, `proposal`
- `status` (string, optional) - Filter by status: `pending`, `approved`, `rejected`
- `pending_only` (boolean, optional) - Only show pending approvals

**Response:**
```json
[
  {
    "id": "uuid",
    "entity_type": "estimate",
    "entity_id": "uuid",
    "amount": 12500,
    "requested_by": "uuid",
    "requester": { "full_name": "John Smith" },
    "level1_status": "approved",
    "level2_status": "pending",
    "requires_level2": true,
    "final_status": "pending",
    "requested_at": "2026-02-01T10:00:00Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

### `POST /api/approvals`

Create a new approval request.

**Request Body:**
```json
{
  "entity_type": "estimate",
  "entity_id": "uuid",
  "amount": 12500
}
```

**Required Fields:**
- `entity_type` (enum) - Type: `estimate`, `discount`, `proposal`
- `entity_id` (UUID) - ID of the entity requiring approval

**Response:**
```json
{
  "id": "uuid",
  "entity_type": "estimate",
  "entity_id": "uuid",
  "amount": 12500,
  "level1_status": "pending",
  "requires_level2": true,
  "level2_status": "pending",
  "final_status": "pending"
}
```

**Status Codes:**
- `200` - Created successfully
- `400` - Invalid request body
- `401` - Unauthorized
- `500` - Server error

---

### `GET /api/approvals/pending`

Get approvals pending for the current user.

**Response:**
```json
[
  {
    "id": "uuid",
    "entity_type": "estimate",
    "amount": 12500,
    "requester": { "full_name": "Sarah Johnson" },
    "requested_at": "2026-02-01T09:00:00Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

## 💰 Commissions API

### `GET /api/commissions`

List commission earnings with filtering.

**Query Parameters:**
- `user_id` (uuid, optional) - Filter by sales rep
- `status` (string, optional) - Filter by status: `pending`, `approved`, `paid`
- `pay_period` (string, optional) - Filter by pay period

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "user": { "full_name": "John Smith" },
    "plan_id": "uuid",
    "plan": { "name": "Standard Sales Commission" },
    "base_amount": 15000,
    "commission_rate": 5,
    "commission_amount": 750,
    "status": "approved",
    "earning_date": "2026-02-15"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

### `POST /api/commissions`

Create a new commission earning.

**Request Body:**
```json
{
  "user_id": "uuid",
  "plan_id": "uuid",
  "opportunity_id": "uuid",
  "base_amount": 15000
}
```

**Required Fields:**
- `user_id` (UUID) - Sales rep ID
- `plan_id` (UUID) - Commission plan ID
- `base_amount` (number) - Sale amount

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "plan_id": "uuid",
  "base_amount": 15000,
  "commission_rate": 5,
  "commission_amount": 750,
  "status": "pending"
}
```

**Status Codes:**
- `200` - Created successfully
- `400` - Invalid request body
- `401` - Unauthorized
- `500` - Server error

---

### `GET /api/commissions/summary`

Get commission summary for current user or organization.

**Query Parameters:**
- `user_id` (uuid, optional) - Get summary for specific user

**Response:**
```json
{
  "total_pending": 2500,
  "total_approved": 5000,
  "total_paid": 25000,
  "this_month": 3500,
  "this_quarter": 12000
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

### `GET /api/commissions/plans`

List all commission plans.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "Standard Sales Commission",
    "commission_type": "percentage",
    "base_rate": 5,
    "tiers": null,
    "applies_to": "won",
    "is_active": true
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

## 📊 Data Types & Enums

### Customer Status
```typescript
type CustomerStatus = 'lead' | 'prospect' | 'customer' | 'inactive'
```

### Customer Source
```typescript
type CustomerSource = 'referral' | 'website' | 'advertising' | 'cold_call' | 'trade_show' | 'other'
```

### Contact Role
```typescript
type ContactRole = 'primary' | 'billing' | 'site' | 'scheduling' | 'general'
```

**Role Descriptions:**
- `primary` - Main point of contact for the customer
- `billing` - Contact for invoices and payments
- `site` - On-site contact for job execution
- `scheduling` - Contact for appointment scheduling
- `general` - General purpose contact

### Contact Method
```typescript
type ContactMethod = 'email' | 'phone' | 'mobile' | 'any'
```

### Hazard Type
```typescript
type HazardType = 'asbestos' | 'mold' | 'lead' | 'vermiculite' | 'other'
```

### Job Status
```typescript
type JobStatus = 'scheduled' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
```

### Completion Status
```typescript
type CompletionStatus = 'draft' | 'submitted' | 'approved' | 'rejected'
```

### Work Type
```typescript
type WorkType = 'regular' | 'overtime' | 'travel' | 'setup' | 'cleanup' | 'supervision'
```

### Photo Type
```typescript
type PhotoType = 'before' | 'during' | 'after' | 'issue' | 'documentation'
```

### Checklist Category
```typescript
type ChecklistCategory = 'safety' | 'quality' | 'cleanup' | 'documentation' | 'custom'
```

### Feedback Survey Status
```typescript
type FeedbackSurveyStatus = 'pending' | 'sent' | 'viewed' | 'completed' | 'expired'
```

### Review Platform
```typescript
type ReviewPlatform = 'google' | 'yelp' | 'facebook' | 'bbb' | 'homeadvisor' | 'angi'
```

### Site Survey Status
```typescript
type SiteSurveyStatus = 'draft' | 'submitted' | 'estimated' | 'quoted' | 'scheduled' | 'completed'
```

### Appointment Status
```typescript
type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled'
```

### Report Type
```typescript
type ReportType = 'sales' | 'jobs' | 'leads'
```

### Export Format
```typescript
type ExportFormat = 'xlsx' | 'csv'
```

### Pipeline Stage Type
```typescript
type StageType = 'open' | 'won' | 'lost'
```

### Opportunity Outcome
```typescript
type OpportunityOutcome = 'won' | 'lost' | null
```

### Loss Reason
```typescript
type LossReason =
  | 'price_too_high'
  | 'lost_to_competitor'
  | 'timeline_issues'
  | 'budget_cut'
  | 'project_cancelled'
  | 'no_decision'
  | 'internal_solution'
  | 'other'
```

### Approval Entity Type
```typescript
type ApprovalEntityType = 'estimate' | 'discount' | 'proposal'
```

### Approval Status
```typescript
type ApprovalStatus = 'pending' | 'approved' | 'rejected'
```

### Commission Type
```typescript
type CommissionType = 'percentage' | 'flat' | 'tiered'
```

### Commission Status
```typescript
type CommissionStatus = 'pending' | 'approved' | 'paid'
```

### Commission Applies To
```typescript
type CommissionAppliesTo = 'won' | 'paid' | 'completed'
```

---

## 🔒 Security & Permissions

### Row Level Security (RLS)

All API endpoints enforce organization-level data isolation through PostgreSQL RLS policies:

- **Users can only access data from their organization**
- **Platform users** (platform_owner, platform_admin) can access all organizations
- **Role-specific permissions** for create/update/delete operations

### User Roles & API Permissions

| Role | Customers API | Proposals API |
|------|---------------|---------------|
| **platform_owner** | Full access to all orgs | Full access |
| **platform_admin** | Full access to all orgs | Full access |
| **tenant_owner** | Full CRUD in org | Full access |
| **admin** | Full CRUD in org | Full access |
| **estimator** | Create, Read, Update | Full access |
| **technician** | Read assigned customers | Read only |
| **viewer** | Read only | Read only |

---

## 📈 Rate Limits & Usage

### Rate Limits
- **General API**: 1000 requests per hour per user
- **PDF Generation**: 100 requests per hour per organization
- **Search endpoints**: 500 requests per hour per user

### Best Practices

1. **Use pagination** for large datasets
2. **Cache responses** when appropriate
3. **Use specific filters** to reduce response size
4. **Implement retry logic** with exponential backoff
5. **Monitor rate limit headers** in responses

### Response Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1643723400
```

---

## 🐛 Error Handling

### Standard Error Response Format
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "Specific field error",
    "timestamp": "2026-01-31T16:30:00.000Z"
  }
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `UNAUTHORIZED` | Invalid or missing authentication | 401 |
| `FORBIDDEN` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Request validation failed | 400 |
| `RATE_LIMITED` | Rate limit exceeded | 429 |
| `SERVER_ERROR` | Internal server error | 500 |

---

## 🧪 Testing

### Example API Calls

#### Create a Customer
```bash
curl -X POST https://hazardos.app/api/customers \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Customer",
    "email": "test@example.com",
    "status": "lead",
    "source": "website"
  }'
```

#### Search Customers
```bash
curl -X GET "https://hazardos.app/api/customers?search=test&status=lead" \
  -H "Authorization: Bearer <jwt_token>"
```

#### Generate Proposal
```bash
curl -X POST https://hazardos.app/api/proposals/generate \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "estimateId": "550e8400-e29b-41d4-a716-446655440003"
  }' \
  --output proposal.pdf
```

---

**HazardOS API** - Powering environmental remediation business management through robust, secure APIs. 🚀✨