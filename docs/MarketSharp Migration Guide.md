# MarketSharp → HazardOS Migration Guide

**Version:** 1.0
**Date:** February 2, 2026
**Purpose:** Step-by-step guide to migrate client data from MarketSharp to HazardOS

---

## Overview

This guide covers migrating a hazmat remediation company from MarketSharp CRM to HazardOS, including:
- Customer records
- Contact information
- Job history
- Invoice history
- Document attachments

**Estimated time:** 2-4 hours (depending on data volume)

---

## Pre-Migration Checklist

### 1. MarketSharp Access
- [ ] Admin login credentials
- [ ] Export permissions verified
- [ ] List of custom fields in use

### 2. HazardOS Setup
- [ ] Organization created
- [ ] Admin user account active
- [ ] Pricing settings configured
- [ ] Team members invited

### 3. Data Audit
- [ ] Total customer count: _______
- [ ] Total job count: _______
- [ ] Total invoice count: _______
- [ ] Date range of historical data: _______
- [ ] Custom fields to map: _______

---

## Phase 1: Export from MarketSharp

### 1.1 Export Customers/Contacts

1. Navigate to **Contacts** → **All Contacts**
2. Click **Export** → **Export to CSV**
3. Select all fields (or at minimum):
   - Contact ID
   - First Name, Last Name
   - Company Name
   - Email, Phone, Mobile
   - Address, City, State, ZIP
   - Lead Source
   - Status
   - Created Date
   - Notes

4. Save as `marketsharp_contacts.csv`

### 1.2 Export Jobs/Projects

1. Navigate to **Jobs** → **All Jobs**
2. Click **Export** → **Export to CSV**
3. Select fields:
   - Job ID
   - Contact ID (for linking)
   - Job Name/Number
   - Job Type
   - Status
   - Scheduled Date
   - Completed Date
   - Total Amount
   - Notes
   - Assigned Crew

4. Save as `marketsharp_jobs.csv`

### 1.3 Export Invoices

1. Navigate to **Accounting** → **Invoices**
2. Click **Export** → **Export to CSV**
3. Select fields:
   - Invoice ID
   - Job ID (for linking)
   - Contact ID
   - Invoice Number
   - Invoice Date
   - Due Date
   - Total Amount
   - Amount Paid
   - Status
   - Line Items (if available)

4. Save as `marketsharp_invoices.csv`

### 1.4 Export Attachments (Optional)

1. Navigate to **Documents** or **Files**
2. Bulk download or export file list
3. Note the folder structure and naming conventions

---

## Phase 2: Data Mapping

### 2.1 Customer Field Mapping

| MarketSharp Field | HazardOS Field | Notes |
|-------------------|----------------|-------|
| Contact ID | (internal reference) | Used for linking only |
| First Name | `first_name` | Required |
| Last Name | `last_name` | Required |
| Company Name | `company_name` | Optional |
| Email | `email` | Primary contact |
| Phone | `phone` | |
| Mobile | `mobile` | |
| Address | `address` | |
| City | `city` | |
| State | `state` | |
| ZIP | `zip` | |
| Lead Source | `source` | Map to enum (see below) |
| Status | `status` | Map to enum (see below) |
| Created Date | `created_at` | |
| Notes | `notes` | |

**Lead Source Mapping:**
| MarketSharp | HazardOS |
|-------------|----------|
| Referral | `referral` |
| Website | `website` |
| Google | `google` |
| Phone Book / Yellow Pages | `other` |
| Home Show | `other` |
| Direct Mail | `other` |
| Other | `other` |

**Status Mapping:**
| MarketSharp | HazardOS |
|-------------|----------|
| Lead | `lead` |
| Prospect | `prospect` |
| Customer | `active` |
| Active | `active` |
| Inactive | `inactive` |
| Do Not Contact | `inactive` |

### 2.2 Job Field Mapping

| MarketSharp Field | HazardOS Field | Notes |
|-------------------|----------------|-------|
| Job ID | (internal reference) | |
| Contact ID | `customer_id` | Must link to imported customer |
| Job Name | `title` | |
| Job Number | `job_number` | Auto-generated if blank |
| Job Type | `hazard_types` | Map to array (see below) |
| Status | `status` | Map to enum |
| Scheduled Date | `scheduled_start` | |
| Completed Date | `completed_at` | |
| Total Amount | `total_amount` | |
| Notes | `notes` | |

**Job Type Mapping:**
| MarketSharp | HazardOS |
|-------------|----------|
| Asbestos Removal | `["asbestos"]` |
| Mold Remediation | `["mold"]` |
| Lead Paint | `["lead_paint"]` |
| Multiple / Combo | `["asbestos", "mold"]` etc. |

**Job Status Mapping:**
| MarketSharp | HazardOS |
|-------------|----------|
| Scheduled | `scheduled` |
| In Progress | `in_progress` |
| Completed | `completed` |
| Cancelled | `cancelled` |
| On Hold | `on_hold` |

### 2.3 Invoice Field Mapping

| MarketSharp Field | HazardOS Field | Notes |
|-------------------|----------------|-------|
| Invoice ID | (internal reference) | |
| Job ID | `job_id` | Must link to imported job |
| Invoice Number | `invoice_number` | |
| Invoice Date | `invoice_date` | |
| Due Date | `due_date` | |
| Total Amount | `total` | |
| Amount Paid | `amount_paid` | |
| Status | `status` | Calculated from amounts |

---

## Phase 3: Data Transformation

### 3.1 Migration Script

Create a Node.js script to transform and import data:

**File:** `scripts/migrate-marketsharp.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import * as fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ORGANIZATION_ID = 'your-org-id-here';

// Track ID mappings for linking
const customerIdMap = new Map<string, string>(); // MarketSharp ID → HazardOS ID
const jobIdMap = new Map<string, string>();

// ============================================
// STEP 1: Import Customers
// ============================================
async function importCustomers() {
  const csv = fs.readFileSync('data/marketsharp_contacts.csv', 'utf-8');
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  console.log(`Importing ${records.length} customers...`);

  for (const record of records) {
    const customer = {
      organization_id: ORGANIZATION_ID,
      first_name: record['First Name']?.trim() || 'Unknown',
      last_name: record['Last Name']?.trim() || '',
      company_name: record['Company Name']?.trim() || null,
      email: record['Email']?.trim() || null,
      phone: record['Phone']?.trim() || null,
      mobile: record['Mobile']?.trim() || null,
      address: record['Address']?.trim() || null,
      city: record['City']?.trim() || null,
      state: record['State']?.trim() || null,
      zip: record['ZIP']?.trim() || null,
      source: mapSource(record['Lead Source']),
      status: mapCustomerStatus(record['Status']),
      notes: record['Notes']?.trim() || null,
      created_at: parseDate(record['Created Date']) || new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('customers')
      .insert(customer)
      .select()
      .single();

    if (error) {
      console.error(`Error importing customer ${record['Contact ID']}:`, error.message);
      continue;
    }

    // Store mapping
    customerIdMap.set(record['Contact ID'], data.id);
    console.log(`✓ Customer: ${customer.first_name} ${customer.last_name}`);
  }

  console.log(`Imported ${customerIdMap.size} customers`);
}

// ============================================
// STEP 2: Import Jobs
// ============================================
async function importJobs() {
  const csv = fs.readFileSync('data/marketsharp_jobs.csv', 'utf-8');
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  console.log(`Importing ${records.length} jobs...`);

  for (const record of records) {
    const customerId = customerIdMap.get(record['Contact ID']);

    if (!customerId) {
      console.warn(`Skipping job ${record['Job ID']} - customer not found`);
      continue;
    }

    const job = {
      organization_id: ORGANIZATION_ID,
      customer_id: customerId,
      title: record['Job Name']?.trim() || 'Imported Job',
      job_number: record['Job Number']?.trim() || null,
      status: mapJobStatus(record['Status']),
      hazard_types: mapHazardTypes(record['Job Type']),
      scheduled_start: parseDate(record['Scheduled Date']),
      completed_at: parseDate(record['Completed Date']),
      total_amount: parseAmount(record['Total Amount']),
      notes: record['Notes']?.trim() || null,
      // Mark as imported
      metadata: { imported_from: 'marketsharp', original_id: record['Job ID'] },
    };

    const { data, error } = await supabase
      .from('jobs')
      .insert(job)
      .select()
      .single();

    if (error) {
      console.error(`Error importing job ${record['Job ID']}:`, error.message);
      continue;
    }

    jobIdMap.set(record['Job ID'], data.id);
    console.log(`✓ Job: ${job.title}`);
  }

  console.log(`Imported ${jobIdMap.size} jobs`);
}

// ============================================
// STEP 3: Import Invoices
// ============================================
async function importInvoices() {
  const csv = fs.readFileSync('data/marketsharp_invoices.csv', 'utf-8');
  const records = parse(csv, { columns: true, skip_empty_lines: true });

  console.log(`Importing ${records.length} invoices...`);

  let imported = 0;

  for (const record of records) {
    const jobId = jobIdMap.get(record['Job ID']);
    const customerId = customerIdMap.get(record['Contact ID']);

    if (!customerId) {
      console.warn(`Skipping invoice ${record['Invoice ID']} - customer not found`);
      continue;
    }

    const total = parseAmount(record['Total Amount']) || 0;
    const amountPaid = parseAmount(record['Amount Paid']) || 0;

    const invoice = {
      organization_id: ORGANIZATION_ID,
      customer_id: customerId,
      job_id: jobId || null,
      invoice_number: record['Invoice Number']?.trim() || `IMP-${record['Invoice ID']}`,
      invoice_date: parseDate(record['Invoice Date']) || new Date().toISOString(),
      due_date: parseDate(record['Due Date']),
      subtotal: total,
      tax: 0,
      total: total,
      amount_paid: amountPaid,
      status: amountPaid >= total ? 'paid' : amountPaid > 0 ? 'partial' : 'sent',
      // Mark as imported
      notes: `Imported from MarketSharp (ID: ${record['Invoice ID']})`,
    };

    const { data, error } = await supabase
      .from('invoices')
      .insert(invoice)
      .select()
      .single();

    if (error) {
      console.error(`Error importing invoice ${record['Invoice ID']}:`, error.message);
      continue;
    }

    // If there was a payment, record it
    if (amountPaid > 0) {
      await supabase.from('invoice_payments').insert({
        invoice_id: data.id,
        amount: amountPaid,
        payment_date: parseDate(record['Paid Date']) || data.invoice_date,
        payment_method: 'other',
        notes: 'Imported payment from MarketSharp',
      });
    }

    imported++;
    console.log(`✓ Invoice: ${invoice.invoice_number}`);
  }

  console.log(`Imported ${imported} invoices`);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapSource(source: string): string {
  const map: Record<string, string> = {
    'Referral': 'referral',
    'Website': 'website',
    'Google': 'google',
    'Internet': 'google',
  };
  return map[source] || 'other';
}

function mapCustomerStatus(status: string): string {
  const map: Record<string, string> = {
    'Lead': 'lead',
    'Prospect': 'prospect',
    'Customer': 'active',
    'Active': 'active',
    'Inactive': 'inactive',
    'Do Not Contact': 'inactive',
  };
  return map[status] || 'active';
}

function mapJobStatus(status: string): string {
  const map: Record<string, string> = {
    'Scheduled': 'scheduled',
    'In Progress': 'in_progress',
    'Completed': 'completed',
    'Complete': 'completed',
    'Cancelled': 'cancelled',
    'Canceled': 'cancelled',
    'On Hold': 'on_hold',
  };
  return map[status] || 'completed';
}

function mapHazardTypes(type: string): string[] {
  const lower = (type || '').toLowerCase();
  const types: string[] = [];

  if (lower.includes('asbestos')) types.push('asbestos');
  if (lower.includes('mold')) types.push('mold');
  if (lower.includes('lead')) types.push('lead_paint');

  return types.length > 0 ? types : ['other'];
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;
  const cleaned = amountStr.replace(/[$,]/g, '');
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? null : amount;
}

// ============================================
// MAIN
// ============================================
async function main() {
  console.log('Starting MarketSharp → HazardOS migration...\n');

  await importCustomers();
  console.log('');

  await importJobs();
  console.log('');

  await importInvoices();
  console.log('');

  console.log('Migration complete!');
  console.log(`- Customers: ${customerIdMap.size}`);
  console.log(`- Jobs: ${jobIdMap.size}`);
}

main().catch(console.error);
```

### 3.2 Running the Migration

```bash
# 1. Install dependencies
npm install csv-parse dotenv

# 2. Create data directory
mkdir -p data

# 3. Copy CSV files to data/
cp ~/Downloads/marketsharp_*.csv data/

# 4. Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 5. Run migration
npx ts-node scripts/migrate-marketsharp.ts
```

---

## Phase 4: Validation

### 4.1 Record Count Verification

| Entity | MarketSharp | HazardOS | Match? |
|--------|-------------|----------|--------|
| Customers | | | ☐ |
| Jobs | | | ☐ |
| Invoices | | | ☐ |

### 4.2 Spot Check Samples

Pick 5-10 random records and verify:

**Customer Spot Check:**
- [ ] Name matches
- [ ] Contact info matches
- [ ] Address matches
- [ ] Notes preserved

**Job Spot Check:**
- [ ] Linked to correct customer
- [ ] Status correct
- [ ] Dates correct
- [ ] Amount correct

**Invoice Spot Check:**
- [ ] Linked to correct job/customer
- [ ] Invoice number matches
- [ ] Amounts correct
- [ ] Payment status correct

### 4.3 Financial Reconciliation

```sql
-- Total revenue in HazardOS
SELECT SUM(total) as total_invoiced,
       SUM(amount_paid) as total_collected
FROM invoices
WHERE organization_id = 'your-org-id';
```

Compare with MarketSharp totals.

---

## Phase 5: Cutover

### 5.1 Pre-Cutover (1 week before)

- [ ] Complete test migration with sample data
- [ ] Train users on HazardOS
- [ ] Set up email/notification settings
- [ ] Configure QuickBooks integration
- [ ] Test complete workflow (lead → paid)

### 5.2 Cutover Day

- [ ] Final data export from MarketSharp
- [ ] Run migration script
- [ ] Validate record counts
- [ ] Spot check samples
- [ ] Financial reconciliation
- [ ] Switch DNS (if applicable)
- [ ] Send team "go live" notification

### 5.3 Post-Cutover (1 week after)

- [ ] Monitor for issues daily
- [ ] Keep MarketSharp read-only for reference
- [ ] Document any data corrections needed
- [ ] Collect user feedback
- [ ] Plan MarketSharp cancellation

---

## Troubleshooting

### Common Issues

**1. Duplicate customers**
```sql
-- Find duplicates by email
SELECT email, COUNT(*)
FROM customers
WHERE organization_id = 'your-org-id'
GROUP BY email
HAVING COUNT(*) > 1;
```

**2. Orphaned jobs (no customer)**
```sql
-- Find jobs without customers
SELECT j.id, j.title
FROM jobs j
LEFT JOIN customers c ON j.customer_id = c.id
WHERE j.organization_id = 'your-org-id'
AND c.id IS NULL;
```

**3. Invoice amount mismatches**
```sql
-- Find invoices where paid > total
SELECT invoice_number, total, amount_paid
FROM invoices
WHERE amount_paid > total;
```

### Rollback Plan

If critical issues arise:
1. Document the issue
2. Continue using MarketSharp temporarily
3. Fix migration script
4. Clear HazardOS data: `DELETE FROM customers WHERE organization_id = 'your-org-id' CASCADE;`
5. Re-run migration

---

## Support

For migration assistance:
- Email: support@hazardos.com
- Documentation: docs.hazardos.com
- Status: status.hazardos.com

---

*Last updated: February 2, 2026*
