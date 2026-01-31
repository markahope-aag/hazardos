# HazardOS Architecture Decisions

**Date:** January 31, 2026  
**Status:** Approved

---

## Summary

These decisions define how key features will be implemented in HazardOS.

| # | Area | Decision |
|---|------|----------|
| 1 | Lead/Customer Data | Single `customers` table with status progression |
| 2 | Calendar/Scheduling | Custom built-in calendar (no external integration) |
| 3 | Approval Workflow | Configurable per organization; build single-level first |
| 4 | E-Signature | Embedded solution (SignWell or similar) |
| 5 | Proposal Delivery | Email + SMS + physical mail tracking |
| 6 | Date Selection | Manual (office enters options, customer selects) |
| 7 | Pricing Rules | Per-organization settings; algorithm calculates from survey |
| 8 | Invoicing Model | Fixed price + change orders (default); T&M optional |
| 9 | Payment Processing | Manual recording + Stripe online; deposit/partial payments |
| 10 | Marketing Integration | Optional Mailchimp sync; CSV export fallback |

---

## Decision Details

### 1. Lead/Customer Data Model

**Decision:** Single `customers` table with status field

**Implementation:**
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  
  -- Contact info
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  
  -- Status tracking
  status TEXT DEFAULT 'lead' CHECK (
    status IN ('lead', 'prospect', 'customer', 'inactive')
  ),
  source TEXT CHECK (
    source IN ('phone', 'website', 'mail', 'referral', 'other')
  ),
  
  -- Marketing
  marketing_consent BOOLEAN DEFAULT false,
  marketing_consent_date TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  external_marketing_id TEXT,  -- Mailchimp subscriber ID
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
```

**Status Progression:**
- `lead` → Initial contact, no site survey scheduled
- `prospect` → Site survey scheduled or completed
- `customer` → Has signed a proposal / completed a job
- `inactive` → No activity for 12+ months or opted out

---

### 2. Calendar/Scheduling

**Decision:** Custom built-in calendar

**Rationale:**
- Full control over UI and job-specific features
- Works offline for field users
- No external dependencies or OAuth complexity
- All data stays within HazardOS

**Features to Build:**
- Month/week/day views
- Drag-and-drop scheduling
- Crew availability overlay
- Equipment availability overlay
- Conflict detection and warnings
- Job duration visualization
- Color coding by job type/status

**Future Consideration:** One-way sync to Google/Outlook as optional enhancement for technicians who want calendar notifications on their personal devices.

---

### 3. Approval Workflow

**Decision:** Configurable per organization

**Phase 1 (MVP):** Single-level approval
- Office manager reviews and approves
- No additional approval required

**Phase 2:** Two-level approval (optional)
- Office manager reviews → pending owner approval
- Owner approves → ready to send
- Configurable in organization settings

**Phase 3:** Threshold-based approval
- Auto-approve under $X amount
- Require owner approval above $X
- Configurable threshold per organization

**Settings Schema:**
```sql
-- Add to organizations table
approval_settings JSONB DEFAULT '{
  "require_owner_approval": false,
  "approval_threshold": null,
  "notify_owner_on_approval": true
}'
```

---

### 4. E-Signature

**Decision:** Embedded solution (SignWell or similar)

**Rationale:**
- Professional, legally compliant signatures
- Embedded experience (looks native to HazardOS)
- Per-signature pricing (~$1-2 per envelope) vs. monthly subscription
- Faster to implement than custom solution
- Better than DIY for legal defensibility

**Implementation:**
- Integrate SignWell API (or Dropbox Sign, PandaDoc)
- Embed signature flow in customer portal
- Store signed document in Supabase Storage
- Record audit trail (timestamp, IP, signature data)

**Evaluation Criteria for Vendor:**
- API quality and documentation
- Pricing (per-envelope vs. monthly)
- Embedding capabilities
- Audit trail / legal compliance
- White-label options

---

### 5. Proposal Delivery

**Decision:** Email + SMS + physical mail tracking

**Email:**
- Primary delivery method
- Professional template with company branding
- PDF attached or link to view online
- "View & Sign" call-to-action button
- Tracking: sent, opened, clicked

**SMS:**
- Secondary notification channel
- Short message with link to proposal
- Requires Twilio integration
- Opt-in required (capture phone + consent)
- Template: "Your proposal from [Company] is ready. View and sign here: [link]"

**Physical Mail:**
- For customers who request paper
- Office downloads PDF, prints, mails manually
- System tracks "sent by mail" status
- Optional: tracking number field
- No automation—just record keeping

**Delivery Preferences:**
```sql
-- Add to customers table
communication_preferences JSONB DEFAULT '{
  "email": true,
  "sms": false,
  "mail": false
}'
```

---

### 6. Date Selection

**Decision:** Manual (office enters options, customer selects)

**Workflow:**
1. Customer signs proposal
2. System sends thank you + "we'll contact you to schedule"
3. Office manager reviews calendar, identifies 3-5 available dates
4. Office enters dates in system
5. System sends date options to customer (email + SMS)
6. Customer clicks preferred date
7. Office confirms and finalizes schedule

**UI Components:**
- Office: Date picker to select available slots
- Customer: Simple selection page (mobile-friendly)
- Confirmation flow for both parties

**Future Enhancement:** Automated availability checking based on crew/equipment calendars.

---

### 7. Pricing Rules

**Decision:** Per-organization settings with calculation algorithm

**Settings Page Structure:**

**Labor Rates:**
| Rate Type | Unit | Example |
|-----------|------|---------|
| Standard labor | per hour | $65/hr |
| Certified asbestos worker | per hour | $85/hr |
| Supervisor/lead | per hour | $95/hr |
| Overtime multiplier | factor | 1.5x |

**Equipment Rates:**
| Equipment | Unit | Example |
|-----------|------|---------|
| Negative air machine | per day | $150/day |
| Decontamination unit | per day | $200/day |
| HEPA vacuum | per day | $75/day |
| Scaffolding | per day | $100/day |

**Material Costs:**
| Material | Unit | Example |
|----------|------|---------|
| 6-mil poly sheeting | per roll | $45 |
| Disposable suits | each | $12 |
| Respirator cartridges | pair | $18 |
| Warning signs/tape | per job | $25 |

**Disposal Fees:**
| Hazard Type | Unit | Example |
|-------------|------|---------|
| Asbestos (friable) | per cubic yard | $350 |
| Asbestos (non-friable) | per cubic yard | $250 |
| Mold debris | per cubic yard | $150 |
| Lead paint waste | per cubic yard | $275 |

**Travel/Distance:**
| Distance Band | Fee |
|---------------|-----|
| 0-25 miles | Included |
| 26-50 miles | $75 |
| 51-100 miles | $150 |
| 100+ miles | $2.50/mile |

**Markup:**
| Setting | Value |
|---------|-------|
| Default markup % | 25% |
| Minimum markup % | 10% |
| Maximum markup % | 50% |

**Algorithm Calculates:**
1. Parse site survey quantities (sq ft, linear ft, cubic yards, etc.)
2. Estimate labor hours based on quantities and containment level
3. Determine equipment needs based on scope
4. Calculate material requirements
5. Estimate disposal volume
6. Calculate distance from organization address to site
7. Apply all rates → subtotal
8. Apply markup → total
9. Generate line-item estimate

**Office Manager Then:**
- Reviews calculated estimate
- Adjusts line items as needed
- Adds/removes items
- Modifies quantities or prices
- Approves and generates proposal

---

### 8. Invoicing Model

**Decision:** Fixed price with change orders (default); T&M optional per job

**Fixed Price (Default):**
- Proposal states fixed amount
- Invoice = proposal amount
- Variance absorbed by company
- Simple for customer

**Change Orders:**
- If scope changes during job, create change order
- Change order describes additional work and cost
- Requires customer approval (e-signature or email confirmation)
- Final invoice = original proposal + approved change orders

**Time & Materials (Optional):**
- Selected per-job when creating proposal
- Proposal states hourly rates and estimated range
- Invoice based on actual time and materials used
- Requires detailed time/material tracking during job
- Customer sees itemized breakdown

**Proposal Schema Addition:**
```sql
-- Add to estimates table
pricing_type TEXT DEFAULT 'fixed' CHECK (
  pricing_type IN ('fixed', 'time_materials')
),
estimated_range_low DECIMAL,  -- For T&M: estimated minimum
estimated_range_high DECIMAL  -- For T&M: estimated maximum
```

**Change Order Schema:**
```sql
CREATE TABLE change_orders (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  job_id UUID REFERENCES jobs(id),
  estimate_id UUID REFERENCES estimates(id),
  
  -- Change order details
  change_order_number INT NOT NULL,  -- Sequential per job
  description TEXT NOT NULL,
  reason TEXT,
  
  -- Amounts
  amount DECIMAL NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'approved', 'declined', 'void')
  ),
  
  -- Approval
  sent_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT,  -- Customer name
  signature_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
```

---

### 9. Payment Processing

**Decision:** Manual recording + Stripe online payments; deposit/partial payment support

**Manual Payments:**
- Office records check, cash, wire, or phone payments
- Enter amount, date, method, reference number
- System updates invoice balance

**Online Payments (Stripe):**
- Invoice email includes "Pay Now" button
- Stripe Checkout or embedded payment form
- Supports credit card and ACH (bank transfer)
- Payment recorded automatically
- Receipt sent automatically

**Deposits/Partial Payments:**
- Proposal can specify deposit requirement (e.g., 50% upfront)
- System tracks deposit vs. balance
- Invoice shows payments received and remaining balance
- Multiple payments allowed against single invoice

**Payment Schema:**
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  invoice_id UUID REFERENCES invoices(id),
  customer_id UUID REFERENCES customers(id),
  
  -- Payment details
  amount DECIMAL NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT CHECK (
    payment_method IN ('check', 'cash', 'credit_card', 'ach', 'wire', 'other')
  ),
  reference_number TEXT,
  
  -- For online payments
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  
  -- Type
  payment_type TEXT DEFAULT 'payment' CHECK (
    payment_type IN ('deposit', 'progress', 'payment', 'final', 'refund')
  ),
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);
```

**Stripe Setup:**
- Organization connects Stripe account (Stripe Connect)
- Payments go directly to organization's Stripe
- HazardOS takes no transaction fee (or optional platform fee later)
- Per-transaction Stripe fees: ~2.9% + $0.30 (card), ~0.8% capped (ACH)

---

### 10. Marketing Integration

**Decision:** Optional Mailchimp integration; CSV export as fallback

**Mailchimp Integration:**
- Settings page: "Connect Mailchimp" button
- OAuth flow to authorize HazardOS
- Select which Mailchimp list/audience to sync
- Automatic sync of customers with `marketing_consent = true`

**Sync Data:**
- Email address (required)
- Name
- Company name
- Phone
- Address
- Customer status (lead/prospect/customer)
- Tags: job types completed, source, etc.

**Sync Triggers:**
- New customer created with consent
- Customer status changes
- Customer completes job
- Daily batch sync for safety

**CSV Export (Fallback):**
- Export button in Customers section
- Filter by status, date range, etc.
- Download CSV with all customer fields
- Manual import to any marketing tool

**Settings Schema:**
```sql
-- Add to organizations table
mailchimp_settings JSONB DEFAULT '{
  "connected": false,
  "access_token": null,
  "list_id": null,
  "last_synced_at": null
}'
```

**Future Integrations (based on demand):**
- HubSpot
- ActiveCampaign
- Constant Contact

---

## Implementation Priority

Based on these decisions, here's the recommended build order:

### Must Have for MVP
1. Customers table with status
2. Site survey with customer linkage
3. Pricing settings page
4. Estimate calculation algorithm
5. Proposal generation with versioning
6. Email delivery
7. Basic approval workflow (single-level)

### Should Have for Launch
8. SMS delivery (Twilio)
9. E-signature integration (SignWell)
10. Custom calendar
11. Job creation from signed proposal
12. Job completion form
13. Invoice generation
14. Manual payment recording

### Nice to Have for V1.1
15. Two-level approval workflow
16. Stripe online payments
17. Customer portal (view proposal, pay invoice)
18. Customer survey system
19. Review request automation
20. Mailchimp integration

---

## Document Control

**Version:** 1.0  
**Created:** January 31, 2026  
**Author:** Architecture Review  
**Status:** Approved for Development
