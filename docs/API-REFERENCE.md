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

## 📱 SMS API

### `POST /api/sms/send`

Send an SMS message to a customer.

**Request Body:**
```json
{
  "to": "+15551234567",
  "body": "Your appointment is tomorrow at 10am",
  "message_type": "appointment_reminder",
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "related_entity_type": "job",
  "related_entity_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

**Required Fields:**
- `to` (string) - Recipient phone number (E.164 format)
- `body` (string) - Message content
- `message_type` (enum) - Type of message: `appointment_reminder`, `job_status`, `lead_notification`, `payment_reminder`, `estimate_follow_up`, `general`

**Optional Fields:**
- `customer_id` (UUID) - Link to customer record
- `related_entity_type` (string) - Entity type (job, estimate, invoice)
- `related_entity_id` (UUID) - Entity ID

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "customer_id": "550e8400-e29b-41d4-a716-446655440000",
  "to_phone": "+15551234567",
  "message_type": "appointment_reminder",
  "body": "Your appointment is tomorrow at 10am",
  "twilio_message_sid": "SM1234567890abcdef",
  "status": "sent",
  "queued_at": "2026-02-01T10:00:00.000Z",
  "sent_at": "2026-02-01T10:00:01.000Z",
  "segments": 1
}
```

**Status Codes:**
- `201` - Message sent successfully
- `400` - Invalid phone number or missing required fields
- `401` - Unauthorized
- `403` - SMS not enabled or customer not opted in
- `500` - Twilio error or server error

---

### `GET /api/sms/messages`

Get SMS message history with filtering.

**Query Parameters:**
- `customer_id` (UUID, optional) - Filter by customer
- `status` (string, optional) - Filter by status: `queued`, `sending`, `sent`, `delivered`, `failed`, `undelivered`
- `message_type` (string, optional) - Filter by message type
- `limit` (number, optional) - Results limit (default: 50, max: 100)

**Example Request:**
```http
GET /api/sms/messages?customer_id=550e8400-e29b-41d4-a716-446655440000&status=delivered&limit=10
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "organization_id": "550e8400-e29b-41d4-a716-446655440001",
    "customer_id": "550e8400-e29b-41d4-a716-446655440000",
    "to_phone": "+15551234567",
    "message_type": "appointment_reminder",
    "body": "Your appointment is tomorrow at 10am",
    "twilio_message_sid": "SM1234567890abcdef",
    "status": "delivered",
    "queued_at": "2026-02-01T10:00:00.000Z",
    "sent_at": "2026-02-01T10:00:01.000Z",
    "delivered_at": "2026-02-01T10:00:05.000Z",
    "segments": 1,
    "cost": 0.0075
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

### `GET /api/sms/settings`

Get organization SMS settings.

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "sms_enabled": true,
  "appointment_reminders_enabled": true,
  "appointment_reminder_hours": 24,
  "job_status_updates_enabled": true,
  "lead_notifications_enabled": true,
  "payment_reminders_enabled": false,
  "quiet_hours_enabled": true,
  "quiet_hours_start": "21:00",
  "quiet_hours_end": "08:00",
  "timezone": "America/Chicago",
  "use_platform_twilio": true
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

### `PATCH /api/sms/settings`

Update organization SMS settings (admin only).

**Request Body:**
```json
{
  "sms_enabled": true,
  "appointment_reminders_enabled": true,
  "appointment_reminder_hours": 48,
  "quiet_hours_enabled": true,
  "quiet_hours_start": "20:00",
  "quiet_hours_end": "09:00",
  "timezone": "America/New_York"
}
```

**Optional Fields:**
- `sms_enabled` (boolean) - Master toggle for SMS
- `appointment_reminders_enabled` (boolean) - Enable appointment reminders
- `appointment_reminder_hours` (number) - Hours before appointment to send reminder
- `job_status_updates_enabled` (boolean) - Enable job status SMS
- `lead_notifications_enabled` (boolean) - Enable lead follow-up SMS
- `payment_reminders_enabled` (boolean) - Enable payment reminder SMS
- `quiet_hours_enabled` (boolean) - Enable quiet hours
- `quiet_hours_start` (time) - Quiet hours start time (HH:MM)
- `quiet_hours_end` (time) - Quiet hours end time (HH:MM)
- `timezone` (string) - Timezone for quiet hours
- `use_platform_twilio` (boolean) - Use platform Twilio account
- `twilio_account_sid` (string) - Custom Twilio account SID
- `twilio_auth_token` (string) - Custom Twilio auth token
- `twilio_phone_number` (string) - Custom Twilio phone number

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "sms_enabled": true,
  "appointment_reminders_enabled": true,
  "appointment_reminder_hours": 48,
  "quiet_hours_enabled": true,
  "quiet_hours_start": "20:00",
  "quiet_hours_end": "09:00",
  "timezone": "America/New_York",
  "use_platform_twilio": true,
  "updated_at": "2026-02-01T16:30:00.000Z"
}
```

**Status Codes:**
- `200` - Updated successfully
- `400` - Invalid settings
- `401` - Unauthorized
- `403` - Requires admin role
- `500` - Server error

---

### `GET /api/sms/templates`

Get all SMS templates (system and organization-specific).

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440004",
    "organization_id": null,
    "name": "Appointment Reminder",
    "message_type": "appointment_reminder",
    "body": "Hi {{customer_name}}! Reminder: {{company_name}} is scheduled for {{job_date}} at {{job_time}}. Reply STOP to opt out.",
    "is_active": true,
    "is_system": true,
    "created_at": "2026-01-01T00:00:00.000Z",
    "updated_at": "2026-01-01T00:00:00.000Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

### `POST /api/sms/templates`

Create a custom SMS template (admin only).

**Request Body:**
```json
{
  "name": "Holiday Greeting",
  "message_type": "general",
  "body": "Happy holidays from {{company_name}}! We appreciate your business."
}
```

**Required Fields:**
- `name` (string) - Template name
- `message_type` (enum) - Message type
- `body` (string) - Template body with {{variables}}

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440005",
  "organization_id": "550e8400-e29b-41d4-a716-446655440001",
  "name": "Holiday Greeting",
  "message_type": "general",
  "body": "Happy holidays from {{company_name}}! We appreciate your business.",
  "is_active": true,
  "is_system": false,
  "created_at": "2026-02-01T16:45:00.000Z",
  "updated_at": "2026-02-01T16:45:00.000Z"
}
```

**Status Codes:**
- `201` - Created successfully
- `400` - Invalid template
- `401` - Unauthorized
- `403` - Requires admin role
- `500` - Server error

---

## 💳 Billing API

### `POST /api/billing/checkout`

Create a Stripe checkout session for subscription signup.

**Request Body:**
```json
{
  "planId": "price_1234567890",
  "successUrl": "https://hazardos.app/success",
  "cancelUrl": "https://hazardos.app/cancel"
}
```

**Required Fields:**
- `planId` (string) - Stripe price ID
- `successUrl` (string) - Redirect URL on success
- `cancelUrl` (string) - Redirect URL on cancel

**Response:**
```json
{
  "sessionId": "cs_test_1234567890",
  "url": "https://checkout.stripe.com/pay/cs_test_1234567890"
}
```

**Status Codes:**
- `200` - Checkout session created
- `400` - Invalid plan ID
- `401` - Unauthorized
- `500` - Server error

---

### `GET /api/billing/subscription`

Get current organization subscription status.

**Response:**
```json
{
  "status": "active",
  "planSlug": "professional",
  "currentPeriodEnd": "2026-03-01T00:00:00.000Z",
  "cancelAtPeriodEnd": false,
  "stripeCustomerId": "cus_1234567890",
  "stripeSubscriptionId": "sub_1234567890"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `404` - No active subscription
- `500` - Server error

---

### `POST /api/billing/portal`

Create a Stripe customer portal session for subscription management.

**Request Body:**
```json
{
  "returnUrl": "https://hazardos.app/settings/billing"
}
```

**Response:**
```json
{
  "url": "https://billing.stripe.com/session/1234567890"
}
```

**Status Codes:**
- `200` - Portal session created
- `401` - Unauthorized
- `404` - No Stripe customer
- `500` - Server error

---

### `GET /api/billing/plans`

Get available subscription plans.

**Response:**
```json
[
  {
    "id": "starter",
    "name": "Starter",
    "description": "Perfect for small teams",
    "price": 49,
    "interval": "month",
    "stripePriceId": "price_1234567890",
    "features": [
      "Up to 5 users",
      "100 jobs per month",
      "Basic reporting"
    ]
  },
  {
    "id": "professional",
    "name": "Professional",
    "description": "For growing businesses",
    "price": 99,
    "interval": "month",
    "stripePriceId": "price_0987654321",
    "features": [
      "Up to 15 users",
      "Unlimited jobs",
      "Advanced reporting",
      "QuickBooks integration"
    ]
  }
]
```

**Status Codes:**
- `200` - Success
- `500` - Server error

---

### `GET /api/billing/features`

Get feature availability for current organization.

**Response:**
```json
{
  "quickbooks": true,
  "sms": true,
  "aiEstimates": false,
  "advancedReporting": true,
  "maxUsers": 15,
  "maxJobs": -1
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `500` - Server error

---

## 🤖 AI API

### `POST /api/ai/estimate`

Generate AI-powered estimate from site survey data.

**Request Body:**
```json
{
  "surveyId": "550e8400-e29b-41d4-a716-446655440000",
  "options": {
    "includeContingency": true,
    "contingencyPercent": 10
  }
}
```

**Required Fields:**
- `surveyId` (UUID) - Site survey ID

**Optional Fields:**
- `options` (object) - AI configuration options
  - `includeContingency` (boolean) - Add contingency buffer
  - `contingencyPercent` (number) - Contingency percentage

**Response:**
```json
{
  "estimateId": "550e8400-e29b-41d4-a716-446655440001",
  "totalCost": 5250.00,
  "laborHours": 40,
  "confidence": 0.87,
  "lineItems": [
    {
      "category": "labor",
      "description": "Lead abatement technician",
      "quantity": 40,
      "unit": "hours",
      "rate": 55.00,
      "amount": 2200.00
    }
  ],
  "aiInsights": {
    "complexity": "medium",
    "riskFactors": ["confined space", "high contamination"],
    "recommendations": ["Additional PPE recommended", "Consider air quality monitoring"]
  }
}
```

**Status Codes:**
- `200` - Estimate generated
- `400` - Invalid survey data
- `401` - Unauthorized
- `403` - Feature not available on plan
- `404` - Survey not found
- `500` - AI service error

---

### `POST /api/ai/photo-analysis`

Analyze photos using AI for hazard detection.

**Request Body:**
```json
{
  "photoUrls": [
    "https://storage.hazardos.app/photos/photo1.jpg",
    "https://storage.hazardos.app/photos/photo2.jpg"
  ],
  "analysisType": "hazard_detection"
}
```

**Required Fields:**
- `photoUrls` (array) - URLs of photos to analyze
- `analysisType` (enum) - Type of analysis: `hazard_detection`, `material_identification`, `area_measurement`

**Response:**
```json
{
  "results": [
    {
      "photoUrl": "https://storage.hazardos.app/photos/photo1.jpg",
      "detections": [
        {
          "type": "asbestos_tile",
          "confidence": 0.92,
          "location": {
            "x": 120,
            "y": 45,
            "width": 200,
            "height": 150
          }
        }
      ],
      "measurements": {
        "estimatedArea": 450,
        "unit": "sq_ft"
      }
    }
  ],
  "summary": {
    "totalHazardsDetected": 3,
    "averageConfidence": 0.89,
    "recommendedActions": [
      "Sample testing recommended",
      "Professional assessment required"
    ]
  }
}
```

**Status Codes:**
- `200` - Analysis complete
- `400` - Invalid photo URLs
- `401` - Unauthorized
- `403` - Feature not available on plan
- `500` - AI service error

---

## 🔔 Webhooks API

### `POST /api/webhooks/stripe`

Stripe webhook endpoint for subscription events.

**Request Body:**
Stripe webhook event payload (validated with signature)

**Supported Events:**
- `checkout.session.completed` - Subscription created
- `customer.subscription.updated` - Subscription modified
- `customer.subscription.deleted` - Subscription cancelled
- `invoice.paid` - Payment received
- `invoice.payment_failed` - Payment failed

**Response:**
```json
{
  "received": true
}
```

**Status Codes:**
- `200` - Event processed
- `400` - Invalid signature
- `500` - Processing error

**Note:** This endpoint validates Stripe webhook signatures for security.

---

### `POST /api/webhooks/twilio/status`

Twilio delivery status callback webhook (internal use).

**Request Body (Form Data):**
- `MessageSid` - Twilio message SID
- `MessageStatus` - Message status
- `ErrorCode` - Error code (if failed)
- `ErrorMessage` - Error message (if failed)

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200` - Always returns 200 to prevent Twilio retries

**Note:** This endpoint is called by Twilio automatically. No authentication required (validated by Twilio signature).

---

### `POST /api/webhooks/twilio/inbound`

Twilio inbound SMS webhook for opt-out handling (internal use).

**Request Body (Form Data):**
- `From` - Sender phone number
- `Body` - Message body

**Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response></Response>
```

**Supported Keywords:**
- **Opt-Out**: STOP, UNSUBSCRIBE, CANCEL, END, QUIT
- **Opt-In**: START, SUBSCRIBE, YES, UNSTOP

**Status Codes:**
- `200` - Always returns TwiML response

**Note:** This endpoint is called by Twilio for inbound messages. Automatically handles opt-out/opt-in keywords.

---

## ⏰ Cron Jobs API

### `GET /api/cron/appointment-reminders`

Send appointment reminders for jobs in the reminder window.

**Authentication:**
- Requires `CRON_SECRET` in Authorization header
- Or `x-vercel-cron` header from Vercel

**Example Request:**
```http
GET /api/cron/appointment-reminders
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "sent": 15,
  "failed": 2,
  "errors": [
    {
      "jobId": "550e8400-e29b-41d4-a716-446655440006",
      "error": "Customer has not opted in to SMS"
    }
  ],
  "timestamp": "2026-02-01T10:00:00.000Z"
}
```

**Status Codes:**
- `200` - Job completed (includes sent/failed counts)
- `401` - Unauthorized (missing or invalid CRON_SECRET)
- `500` - Server error

**Cron Schedule:**
```json
{
  "crons": [{
    "path": "/api/cron/appointment-reminders",
    "schedule": "0 * * * *"
  }]
}
```

**How It Works:**
1. Runs every hour
2. Queries organizations with SMS enabled and appointment reminders enabled
3. For each organization, finds jobs in the reminder window (based on `appointment_reminder_hours`)
4. Sends reminder SMS to customer if:
   - Customer has opted in to SMS
   - Job hasn't been reminded yet
   - Not during quiet hours
5. Marks job as reminded
6. Returns summary of sent/failed messages

---

## 🏢 Platform Admin API

### `GET /api/platform/organizations`

List all organizations (platform admin only).

**Query Parameters:**
- `search` (string, optional) - Search by name
- `status` (string, optional) - Filter by status
- `planSlug` (string, optional) - Filter by subscription plan
- `sortBy` (string, optional) - Sort field: `created_at`, `name`, `user_count`, `job_count`
- `sortOrder` (string, optional) - Sort order: `asc`, `desc`
- `page` (number, optional) - Page number (default: 1)
- `limit` (number, optional) - Results per page (default: 20)

**Example Request:**
```http
GET /api/platform/organizations?search=acme&sortBy=created_at&sortOrder=desc&page=1&limit=10
```

**Response:**
```json
{
  "organizations": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Acme Remediation",
      "status": "active",
      "plan_slug": "professional",
      "user_count": 5,
      "job_count": 127,
      "created_at": "2026-01-01T00:00:00.000Z"
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
- `401` - Unauthorized
- `403` - Requires platform admin role
- `500` - Server error

---

### `GET /api/platform/stats`

Get platform-wide statistics (platform admin only).

**Response:**
```json
{
  "stats": {
    "total_organizations": 50,
    "active_organizations": 45,
    "total_users": 250,
    "total_jobs": 5000,
    "total_revenue": 2500000
  },
  "growth": {
    "new_orgs_this_month": 5,
    "new_users_this_month": 25,
    "mrr": 50000,
    "mrr_growth": 10.5
  },
  "planDistribution": [
    {
      "plan_slug": "starter",
      "count": 20,
      "percentage": 40
    },
    {
      "plan_slug": "professional",
      "count": 25,
      "percentage": 50
    },
    {
      "plan_slug": "enterprise",
      "count": 5,
      "percentage": 10
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Requires platform admin role
- `500` - Server error

---

**HazardOS API** - Powering environmental remediation business management through robust, secure APIs. 🚀✨