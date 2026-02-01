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

## 📊 Data Types & Enums

### Customer Status
```typescript
type CustomerStatus = 'lead' | 'prospect' | 'customer' | 'inactive'
```

### Customer Source
```typescript
type CustomerSource = 'referral' | 'website' | 'advertising' | 'cold_call' | 'trade_show' | 'other'
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