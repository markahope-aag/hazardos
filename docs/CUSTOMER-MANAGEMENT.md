# HazardOS Customer Management

**Complete customer relationship management for environmental remediation companies**

> **Status**: Production Ready ✅  
> **Last Updated**: January 31, 2026

---

## 🎯 Overview

The Customer Management system in HazardOS provides comprehensive customer relationship management (CRM) functionality specifically designed for environmental remediation companies. It tracks the complete customer lifecycle from initial lead through active customer relationships.

## 📊 Customer Lifecycle

```
Lead → Prospect → Customer → Inactive
  ↑        ↑         ↑         ↑
Initial  Qualified  Active   Former
Contact   Interest  Business Customer
```

### Customer Statuses

| Status | Description | Typical Actions |
|--------|-------------|-----------------|
| **Lead** | Initial contact, not yet qualified | Qualify interest, gather contact info |
| **Prospect** | Qualified lead with genuine interest | Send proposals, schedule site surveys |
| **Customer** | Active business relationship | Ongoing projects, repeat business |
| **Inactive** | Former customer, no current business | Reactivation campaigns, referrals |

## 🗄️ Database Schema

### `customers` Table

```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Contact Information
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    
    -- Address
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    
    -- Relationship Management
    status customer_status NOT NULL DEFAULT 'lead',
    source customer_source,
    notes TEXT,
    marketing_consent BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enums

```sql
-- Customer status in the sales pipeline
CREATE TYPE customer_status AS ENUM (
    'lead',      -- Initial contact
    'prospect',  -- Qualified interest
    'customer',  -- Active business
    'inactive'   -- Former customer
);

-- How the customer was acquired
CREATE TYPE customer_source AS ENUM (
    'referral',     -- Referred by existing customer
    'website',      -- Website contact form
    'advertising',  -- Paid advertising (Google, Facebook, etc.)
    'cold_call',    -- Cold outreach
    'trade_show',   -- Industry events
    'other'         -- Other sources
);
```

## 🚀 Features

### ✅ Implemented Features

#### Customer List Management
- **Search & Filter**: Find customers by name, email, phone, or address
- **Status Filtering**: Filter by lead, prospect, customer, or inactive status
- **Source Filtering**: Filter by acquisition channel
- **Pagination**: Handle large customer databases efficiently
- **Quick Actions**: View, edit, create survey, change status, delete

#### Customer CRUD Operations
- **Create Customer**: Add new customers with full contact information
- **View Customer**: Detailed customer profile with contact info and history
- **Edit Customer**: Update customer information and relationship status
- **Delete Customer**: Remove customers with safety checks for linked surveys
- **Status Management**: Easy status updates with visual badges

#### Customer-Survey Relationship
- **Link Surveys**: Associate site surveys with specific customers
- **Survey History**: View all surveys for a customer
- **Customer Context**: See customer info when viewing surveys

#### Data Validation
- **Form Validation**: Zod schemas ensure data quality
- **Required Fields**: Name is required, other fields optional
- **Email Validation**: Proper email format validation
- **Phone Formatting**: Flexible phone number handling

### 🚧 Planned Features

| Feature | Priority | Description |
|---------|----------|-------------|
| **Communication History** | High | Track emails, calls, and meetings |
| **Follow-up Reminders** | High | Automated reminders for customer follow-up |
| **Customer Portal** | Medium | Self-service portal for customers |
| **Integration with Email** | Medium | Sync with email providers |
| **Advanced Reporting** | Low | Customer analytics and insights |

## 🎨 User Interface

### Customer List Page (`/customers`)

**Features:**
- Search bar with real-time filtering
- Status and source filter dropdowns
- Sortable table with customer info
- Action buttons for each customer
- Create new customer button

**Columns:**
- Customer name and contact info
- Status badge (color-coded)
- Source badge
- Creation date
- Quick actions dropdown

### Customer Detail Page (`/customers/[id]`)

**Sections:**
- **Customer Info Card**: Contact details, address, status
- **Site Surveys List**: All surveys associated with the customer
- **Activity Feed**: Recent activity and interactions (planned)
- **Action Buttons**: Edit, delete, create survey, change status

### Customer Forms

**Create/Edit Modal:**
- Basic information (name, email, phone)
- Address fields (street, city, state, zip)
- Relationship fields (status, source)
- Notes and marketing consent
- Form validation with error messages

## 🔧 Technical Implementation

### Frontend Components

```
components/customers/
├── CustomerList.tsx           # Main list view with search/filters
├── CustomerListItem.tsx       # Individual customer row
├── CustomerSearch.tsx         # Search input with debouncing
├── CustomerFilters.tsx        # Status and source filters
├── CustomerStatusBadge.tsx    # Color-coded status display
├── CustomerForm.tsx           # Reusable create/edit form
├── CreateCustomerModal.tsx    # New customer modal
├── EditCustomerModal.tsx      # Edit customer modal
├── DeleteCustomerDialog.tsx   # Delete confirmation
├── CustomerDetail.tsx         # Customer detail page
├── CustomerInfoCard.tsx       # Customer information display
├── CustomerSurveysList.tsx    # Associated surveys list
└── CustomerActivityFeed.tsx   # Activity history (planned)
```

### API Endpoints

#### `GET /api/customers`
List customers with optional filtering.

**Query Parameters:**
- `search` - Search by name, email, phone
- `status` - Filter by customer status
- `source` - Filter by acquisition source
- `page` - Pagination page number
- `limit` - Results per page

**Response:**
```json
{
  "customers": [
    {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "(555) 123-4567",
      "address": "123 Main St",
      "city": "Anytown",
      "state": "CA",
      "zip": "12345",
      "status": "prospect",
      "source": "website",
      "notes": "Interested in asbestos inspection",
      "marketing_consent": true,
      "created_at": "2026-01-31T10:00:00Z",
      "updated_at": "2026-01-31T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 25
}
```

#### `POST /api/customers`
Create a new customer.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "(555) 123-4567",
  "address": "123 Main St",
  "city": "Anytown",
  "state": "CA",
  "zip": "12345",
  "status": "lead",
  "source": "website",
  "notes": "Initial contact from website form",
  "marketing_consent": true
}
```

#### `GET /api/customers/[id]`
Get a specific customer by ID.

#### `PUT /api/customers/[id]`
Update a customer.

#### `DELETE /api/customers/[id]`
Delete a customer (with safety checks for linked surveys).

### Data Services

#### `CustomersService`
Located in `lib/supabase/customers.ts`, provides:
- `getCustomers()` - List with filtering and pagination
- `getCustomer()` - Get single customer by ID
- `createCustomer()` - Create new customer
- `updateCustomer()` - Update existing customer
- `deleteCustomer()` - Delete customer
- `getCustomerStats()` - Get customer statistics
- `updateCustomerStatus()` - Quick status updates

### React Hooks

#### `useCustomers()`
TanStack Query hook for customer list with caching.

#### `useCustomer(id)`
Hook for single customer with real-time updates.

#### `useCreateCustomer()`
Mutation hook for creating customers.

#### `useUpdateCustomer()`
Mutation hook for updating customers.

#### `useDeleteCustomer()`
Mutation hook for deleting customers.

## 🔐 Security & Permissions

### Row Level Security (RLS)

All customer data is protected by organization-level RLS:

```sql
-- Users can only access customers in their organization
CREATE POLICY "Users can view customers in their organization" ON customers
    FOR SELECT USING (organization_id = get_user_organization_id());

-- Users can create customers in their organization
CREATE POLICY "Users can create customers in their organization" ON customers
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

-- Users can update customers in their organization
CREATE POLICY "Users can update customers in their organization" ON customers
    FOR UPDATE USING (organization_id = get_user_organization_id());

-- Only admins can delete customers
CREATE POLICY "Admins can delete customers in their organization" ON customers
    FOR DELETE USING (
        organization_id = get_user_organization_id() 
        AND get_user_role() IN ('admin', 'tenant_owner')
    );
```

### Role-Based Access

| Role | Permissions |
|------|-------------|
| **Admin/Tenant Owner** | Full CRUD access to all customers |
| **Estimator** | Create, read, update customers |
| **Technician** | Read-only access to assigned customers |
| **Viewer** | Read-only access to all customers |

## 📈 Business Impact

### Key Metrics

- **Lead Conversion Rate**: Track leads → prospects → customers
- **Customer Acquisition Cost**: Cost per customer by source
- **Customer Lifetime Value**: Revenue per customer over time
- **Source Performance**: Which channels bring the best customers

### Workflow Integration

1. **Lead Capture**: New leads from website, referrals, advertising
2. **Qualification**: Convert leads to prospects through initial contact
3. **Site Survey**: Schedule surveys for qualified prospects
4. **Proposal**: Generate proposals for surveyed prospects
5. **Conversion**: Convert prospects to customers with signed contracts
6. **Relationship Management**: Ongoing service for active customers

## 🚀 Getting Started

### For Estimators

1. **Add New Customers**: Use the "New Customer" button on `/customers`
2. **Update Status**: Move customers through the pipeline as they progress
3. **Link Surveys**: Associate site surveys with customer records
4. **Track Notes**: Add notes about interactions and preferences

### For Admins

1. **Review Pipeline**: Monitor customer status distribution
2. **Manage Sources**: Track which acquisition channels work best
3. **Data Quality**: Ensure customer information is complete and accurate
4. **Team Access**: Manage who can access and modify customer data

---

**Customer Management in HazardOS** - Building lasting relationships with environmental remediation clients. 🏢✨