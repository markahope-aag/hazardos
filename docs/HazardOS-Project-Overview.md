# HazardOS Project Overview

**The Operating System for Hazardous Materials**

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Product Vision](#product-vision)
3. [Brand Identity](#brand-identity)
4. [Technical Architecture](#technical-architecture)
5. [The Ralph Wiggum Loop](#the-ralph-wiggum-loop)
6. [Mobile-First Design](#mobile-first-design)
7. [Development Plan](#development-plan)
8. [Go-to-Market Strategy](#go-to-market-strategy)
9. [Success Metrics](#success-metrics)
10. [Next Steps](#next-steps)

---

## Executive Summary

**HazardOS** is a mobile-first SaaS platform for asbestos and mold remediation companies, enabling field estimators to create accurate quotes, office staff to manage scheduling, and business owners to learn from every job through intelligent pattern recognition.

### Key Differentiators

- **Mobile-First PWA**: Built for estimators in the field, works offline
- **Ralph Wiggum Loop**: System learns from actual vs. estimated outcomes
- **Niche Focus**: Purpose-built for environmental remediation, not generic construction
- **Modern Stack**: Next.js + Supabase + Vercel = fast iteration

### Target Market

Mid-sized environmental remediation companies (10-50 employees) who are:
- Too big for spreadsheets and paper forms
- Too small for enterprise ERPs like ServiceTitan
- Looking for mobile-first solutions
- Want to retain institutional knowledge as experienced estimators retire

### Business Model

**SaaS Subscription Pricing:**
- **Starter**: $99/mo - 1 user, basic estimates & quotes
- **Professional**: $299/mo - 5 users, scheduling, pattern learning
- **Enterprise**: $799/mo - Unlimited users, API access, white-label

**Alternative:** $5 per estimate (pay-as-you-go for smaller companies)

---

## Product Vision

### The Problem

Environmental remediation companies struggle with:

1. **Estimating Accuracy**: New estimators learn through expensive mistakes
2. **Knowledge Loss**: When experienced estimators leave, decades of judgment walk out the door
3. **Mobile Limitations**: Existing software is desktop-first, clunky on phones
4. **Offline Work**: Job sites have poor connectivity but estimates need to happen on-site
5. **Pattern Blindness**: Companies don't see trends across hundreds of jobs

### The Solution: HazardOS

A platform that:
- Captures estimator judgment as structured data (not free-text notes)
- Works seamlessly on mobile devices at job sites
- Functions offline and syncs when connectivity returns
- Learns patterns from actual job outcomes vs. estimates
- Surfaces insights: "Jobs like this usually take 20% longer"

### Core User Stories

**As a Field Estimator:**
- I can create detailed estimates on my phone at the job site
- I can take photos and tag them to specific hazards
- I can work offline when cell signal is weak
- I get warnings when my estimate differs from similar past jobs

**As an Office Scheduler:**
- I can see all estimates and convert them to scheduled jobs
- I can override projections (with required reasons)
- I see when actual job duration differs from estimates
- I get alerts about equipment conflicts and crew availability

**As a Business Owner:**
- I see which estimators are most accurate
- I understand why jobs overrun (clearance delays, access issues, etc.)
- I can forecast revenue based on historical patterns
- I retain knowledge even when experienced staff leave

---

## Brand Identity

### Name & Domain

**Name**: HazardOS  
**Domain**: hazardos.app  
**Pronunciation**: "Hazard-O-S" (like an operating system)

### Positioning Statement

> "HazardOS is the operating system for environmental remediation companies. We help asbestos and mold professionals estimate accurately, schedule efficiently, and learn from every job they complete."

### Tagline Options

1. **Primary**: "The Operating System for Hazardous Materials"
2. "Run Your Remediation Business on HazardOS"
3. "Built for Environmental Professionals"
4. "One Platform. Every Hazard."

### Visual Identity

**Logo Concept:**
- Monospaced/terminal font (references "OS")
- Hazard warning triangle abstracted into modern icon
- Clean, technical, trustworthy aesthetic

**Color Palette:**
```
Primary Orange:   #FF6B35  (hazard warning, action)
Navy Blue:        #1F2937  (professional, serious)
Success Green:    #10B981  (clearance achieved, safety)
Neutral Grays:    #F3F4F6, #6B7280, #111827
```

**Typography:**
- **Headings**: Inter or Space Grotesk (modern, tech)
- **Body**: System fonts (fast, clean)
- **Data/Code**: JetBrains Mono (terminal feel)

### Voice & Tone

**Brand Personality:**
- Professional but not stuffy
- Technical but not complicated  
- Serious about safety, modern about delivery
- "We understand job sites" attitude

**Key Messages:**
- **To Estimators**: "Create faster estimates that get smarter over time"
- **To Owners**: "See every job. Track every dollar. Keep every lesson."
- **To Schedulers**: "Plan work that actually works"

### Competitive Positioning

**We're NOT:**
- Generic construction software (too broad)
- Simple invoicing tools (too limited)
- Enterprise ERPs (too complex, too expensive)

**We ARE:**
- Purpose-built for environmental remediation
- Mobile-first for field work
- Intelligent through the Ralph Wiggum Loop
- Fast to deploy, easy to learn

---

## Technical Architecture

### Technology Stack

**Frontend:**
- **Framework**: Next.js 16.1.6 (App Router)
- **UI Library**: React 18
- **Styling**: Tailwind CSS (mobile-first)
- **Components**: shadcn/ui
- **PWA**: next-pwa plugin
- **State**: React Query + Zustand

**Backend:**
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage (job photos)
- **Real-time**: Supabase Realtime subscriptions
- **APIs**: Next.js API routes

**DevOps:**
- **Hosting**: Vercel
- **CI/CD**: GitHub Actions
- **Monitoring**: Vercel Analytics + Sentry
- **Domain**: hazardos.app

**Mobile Features:**
- **Offline**: Service Workers + IndexedDB
- **Camera**: Web Camera API
- **GPS**: Geolocation API
- **Notifications**: Push API
- **Install**: PWA install prompt

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │  Mobile PWA      │              │  Desktop Web     │    │
│  │  (Field Work)    │◄────────────►│  (Office Work)   │    │
│  └──────────────────┘              └──────────────────┘    │
│           │                                   │              │
│           │         Service Worker            │              │
│           │         (Offline Cache)           │              │
│           └───────────────┬───────────────────┘              │
└───────────────────────────┼──────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Next.js API    │
                   │  Routes (Edge)  │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │   Supabase      │
                   ├─────────────────┤
                   │ PostgreSQL      │
                   │ Auth            │
                   │ Storage         │
                   │ Realtime        │
                   └─────────────────┘
```

### Database Schema

**Core Tables:**

```sql
-- Users and Teams
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('estimator', 'scheduler', 'admin', 'owner')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Estimates (Structured Capture)
CREATE TABLE estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  estimator_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Job Information
  job_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  site_address TEXT NOT NULL,
  site_location GEOGRAPHY(POINT), -- GPS coordinates
  
  -- Remediation Classification (FORCED STRUCTURE)
  remediation_type TEXT NOT NULL CHECK (
    remediation_type IN ('asbestos', 'mold', 'mixed', 'lead', 'other')
  ),
  containment_level INT CHECK (containment_level BETWEEN 1 AND 4),
  material_type TEXT, -- e.g., "friable pipe insulation"
  area_sqft DECIMAL NOT NULL,
  
  -- Assumptions (Key for Wiggum Loop)
  crew_type TEXT, -- e.g., "Asbestos Type A"
  crew_size INT,
  equipment_needed JSONB, -- structured list
  
  -- Duration & Cost Projections
  estimated_duration_days DECIMAL NOT NULL,
  estimated_labor_hours DECIMAL NOT NULL,
  estimated_cost DECIMAL NOT NULL,
  
  -- Risk Flags
  occupied_space BOOLEAN DEFAULT false,
  access_issues TEXT[] DEFAULT '{}',
  clearance_risk_level TEXT CHECK (
    clearance_risk_level IN ('low', 'medium', 'high')
  ),
  
  -- Attachments
  photos TEXT[] DEFAULT '{}', -- Supabase storage URLs
  notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'quoted', 'scheduled', 'completed')
  )
);

-- Quotes (Generated from Estimates)
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID REFERENCES estimates(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  quote_number TEXT UNIQUE NOT NULL,
  quote_amount DECIMAL NOT NULL,
  line_items JSONB NOT NULL, -- detailed breakdown
  
  valid_until DATE,
  status TEXT DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')
  ),
  
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
);

-- Schedules (With Override Tracking!)
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID REFERENCES estimates(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- System Projection (from estimate)
  projected_start_date DATE NOT NULL,
  projected_end_date DATE NOT NULL,
  projected_duration_days DECIMAL NOT NULL,
  projected_crew TEXT NOT NULL,
  projected_equipment JSONB NOT NULL,
  
  -- Human Override (CRITICAL FOR WIGGUM LOOP)
  actual_start_date DATE,
  override_duration_days DECIMAL,
  override_crew TEXT,
  override_reason TEXT, -- REQUIRED when overriding
  override_by UUID REFERENCES users(id),
  override_at TIMESTAMPTZ,
  
  -- Actual Outcome (Closes the Loop)
  actual_end_date DATE,
  actual_duration_days DECIMAL,
  actual_labor_hours DECIMAL,
  actual_cost DECIMAL,
  
  -- Variance Analysis
  duration_variance DECIMAL GENERATED ALWAYS AS (
    actual_duration_days - projected_duration_days
  ) STORED,
  cost_variance DECIMAL GENERATED ALWAYS AS (
    actual_cost - (SELECT estimated_cost FROM estimates WHERE id = estimate_id)
  ) STORED,
  
  -- Completion & Issues
  clearance_date DATE,
  clearance_lab TEXT,
  issues_encountered TEXT[],
  
  status TEXT DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in_progress', 'completed', 'cancelled')
  )
);

-- Override Reasons (Controlled Vocabulary)
CREATE TABLE override_reasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (
    category IN ('clearance', 'crew', 'equipment', 'access', 'weather', 'scope_change', 'other')
  )
);

-- Seed override reasons
INSERT INTO override_reasons (code, description, category) VALUES
  ('LAB_BACKLOG', 'Clearance lab backlog', 'clearance'),
  ('CREW_UNAVAILABLE', 'Assigned crew unavailable', 'crew'),
  ('EQUIP_SHORTAGE', 'Equipment shortage', 'equipment'),
  ('ACCESS_DELAY', 'Site access delayed', 'access'),
  ('WEATHER', 'Weather delay', 'weather'),
  ('SCOPE_INCREASE', 'Scope increased after walkthrough', 'scope_change');

-- Learned Patterns (The Intelligence Layer)
CREATE TABLE learned_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Pattern Classification
  pattern_type TEXT NOT NULL CHECK (
    pattern_type IN (
      'duration_variance',
      'cost_variance', 
      'estimator_tendency',
      'clearance_delay',
      'equipment_conflict',
      'seasonal_factor'
    )
  ),
  
  -- Pattern Characteristics (What makes this pattern)
  job_characteristics JSONB NOT NULL,
  -- Example: {
  --   "remediation_type": "asbestos",
  --   "containment_level": 3,
  --   "occupied_space": true,
  --   "area_range": [100, 500]
  -- }
  
  -- Pattern Insight
  pattern_description TEXT NOT NULL,
  -- Example: "Level 3 asbestos in occupied commercial spaces 
  --           average +18% duration vs estimate"
  
  -- Statistical Confidence
  sample_size INT NOT NULL,
  confidence_score DECIMAL CHECK (confidence_score BETWEEN 0 AND 1),
  average_variance DECIMAL,
  
  -- Application Rules
  applies_when JSONB, -- conditions for when to surface this pattern
  suggested_adjustment JSONB -- what to suggest to estimators
);

-- Pattern Application Log (Track when patterns are used)
CREATE TABLE pattern_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_id UUID REFERENCES learned_patterns(id),
  estimate_id UUID REFERENCES estimates(id),
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  
  estimator_action TEXT CHECK (
    estimator_action IN ('accepted', 'modified', 'ignored')
  ),
  estimator_note TEXT
);
```

### API Endpoints

**Estimates:**
- `POST /api/estimates` - Create new estimate
- `GET /api/estimates` - List estimates (filtered)
- `GET /api/estimates/:id` - Get estimate details
- `PATCH /api/estimates/:id` - Update estimate
- `DELETE /api/estimates/:id` - Delete estimate

**Quotes:**
- `POST /api/quotes` - Generate quote from estimate
- `GET /api/quotes/:id` - Get quote
- `PATCH /api/quotes/:id/send` - Send quote to customer
- `POST /api/quotes/:id/accept` - Customer acceptance

**Schedules:**
- `POST /api/schedules` - Create schedule from estimate
- `GET /api/schedules` - List schedules (calendar view)
- `PATCH /api/schedules/:id` - Update schedule (captures override)
- `POST /api/schedules/:id/complete` - Mark job complete

**Patterns:**
- `GET /api/patterns` - Get relevant patterns for estimate
- `POST /api/patterns/analyze` - Trigger pattern analysis
- `GET /api/patterns/:id/history` - Pattern application history

**Offline Sync:**
- `POST /api/sync` - Sync offline queue
- `GET /api/sync/status` - Check sync status

---

## The Ralph Wiggum Loop

### Concept Overview

The Ralph Wiggum Loop is a methodology where:
1. **Human Judgment** is captured as structured data
2. **System Projects** consequences of those decisions
3. **Human Overrides** are logged with reasons
4. **Actual Outcomes** close the loop
5. **System Learns** patterns and surfaces insights
6. **Future Decisions** are informed by collective experience

### Implementation in HazardOS

#### Phase 1: Capture the Loop (Don't Optimize Yet)

**Goal:** Observe, don't predict yet

**Implementation:**
- ✅ Required structured fields (no free-text escapes)
- ✅ Override reason logging (controlled vocabulary)
- ✅ Actual vs. estimated capture
- ❌ Don't auto-adjust prices yet
- ❌ Don't auto-book crews yet

**Example Flow:**

```
Field Estimator Decision:
├─ Remediation Type: Asbestos
├─ Containment Level: 3
├─ Area: 120 sq ft
├─ Material: Friable pipe insulation
├─ Location: Occupied mechanical room
└─ Estimated Duration: 2.5 days

System Projection:
├─ Suggested Crew: Asbestos Type B
├─ Equipment: 4 negative air machines
├─ Quote: $18,400
└─ Schedule: 3-day window

Office Scheduler Override:
├─ Adds: +1 day buffer
├─ Reason: "CLEARANCE_LAB_BACKLOG"
└─ Final Schedule: 4 days

Actual Outcome:
├─ Actual Duration: 3.3 days
├─ Clearance Delay: 0.5 days
├─ Cost Variance: +2%
└─ Issues: None

Loop Learns:
└─ Pattern: "Similar jobs (Level 3, occupied, friable) 
             average +0.8 days, primarily clearance delays"
```

#### Phase 2: Surface Patterns

**Goal:** Show humans what the loop sees

**Implementation:**
- Display pattern matches during estimate creation
- Warning indicators: "Jobs like this usually take longer"
- Estimator tendency reports
- Equipment conflict predictions

**UI Examples:**

```
┌─────────────────────────────────────────┐
│ ⚠️  Pattern Match                       │
├─────────────────────────────────────────┤
│ Jobs similar to this one typically:    │
│                                         │
│ • Take 18% longer than estimated       │
│ • Experience clearance delays          │
│ • Require +0.5 day buffer              │
│                                         │
│ Based on 23 completed jobs             │
│                                         │
│ [View Details]  [Adjust Estimate]      │
└─────────────────────────────────────────┘
```

#### Phase 3: Suggest, Don't Decide

**Goal:** System nudges, humans approve

**Implementation:**
- Suggested duration ranges (not fixed)
- Suggested buffers (optional)
- Suggested crew assignments (overridable)
- Suggested containment upgrades (with reasoning)

**UI Flow:**

```
Your Estimate: 2.5 days

System Suggestion: Consider 3.0 days
├─ Based on 15 similar jobs
├─ Average actual: 2.8 days
└─ Confidence: High (85%)

Your Choice:
[ ] Use suggested 3.0 days
[ ] Keep my 2.5 days
[ ] Custom: [____] days
```

#### Phase 4: Conditional Automation (Future)

**Only after trust is built:**
- Auto-applied buffers (with notification)
- Auto-flagged compliance risks
- Auto-suggested crew assignments

**Still:**
- ✅ Reversible
- ✅ Explainable
- ✅ Human has final say

### Pattern Detection Algorithms

**Variance Analysis:**
```sql
-- Find patterns in duration variance by job characteristics
SELECT 
  remediation_type,
  containment_level,
  occupied_space,
  AVG(duration_variance) as avg_variance,
  STDDEV(duration_variance) as std_variance,
  COUNT(*) as sample_size
FROM schedules s
JOIN estimates e ON s.estimate_id = e.id
WHERE s.status = 'completed'
  AND s.actual_duration_days IS NOT NULL
GROUP BY remediation_type, containment_level, occupied_space
HAVING COUNT(*) >= 5  -- Minimum sample size
  AND ABS(AVG(duration_variance)) > 0.2  -- Meaningful variance
ORDER BY ABS(avg_variance) DESC;
```

**Estimator Tendency:**
```sql
-- Identify estimator patterns (optimistic vs conservative)
SELECT 
  u.email as estimator,
  AVG(s.duration_variance) as avg_duration_variance,
  AVG(s.cost_variance) as avg_cost_variance,
  COUNT(*) as jobs_completed
FROM schedules s
JOIN estimates e ON s.estimate_id = e.id
JOIN users u ON e.estimator_id = u.id
WHERE s.status = 'completed'
GROUP BY u.id, u.email
HAVING COUNT(*) >= 10
ORDER BY avg_duration_variance DESC;
```

**Override Reason Frequency:**
```sql
-- What causes the most overrides?
SELECT 
  override_reason,
  COUNT(*) as frequency,
  AVG(override_duration_days - projected_duration_days) as avg_extension
FROM schedules
WHERE override_reason IS NOT NULL
GROUP BY override_reason
ORDER BY frequency DESC;
```

---

## Mobile-First Design

### Design Principles

1. **Touch-First**: Minimum 44px touch targets
2. **Offline-First**: App works without internet
3. **Fast-First**: Optimistic UI updates
4. **Simple-First**: One task per screen
5. **Safety-First**: Confirm destructive actions

### Mobile UI Components

**Estimate Form (Mobile):**
```
┌─────────────────────────────────┐
│  📍 New Estimate                │ ← Large header
├─────────────────────────────────┤
│                                 │
│  [📷 Take Photos]               │ ← Big button (60px)
│                                 │
│  Remediation Type *             │
│  [▼ Select Type        ]        │ ← Native picker
│                                 │
│  Containment Level *            │
│  [ 1 ][ 2 ][ 3 ][ 4 ]           │ ← Button group
│  └─────────────────┘            │    (selected)
│                                 │
│  Area (sq ft) *                 │
│  [        120        ]          │ ← Number input
│                                 │
│  Material Type                  │
│  [▼ Friable pipe ins...  ]     │
│                                 │
│  📍 Tag Location                │ ← Get GPS
│                                 │
│  [    Save Draft     ]          │ ← Secondary
│  [  Create Estimate  ]          │ ← Primary (large)
│                                 │
│  ℹ️ Offline - will sync later   │ ← Status
└─────────────────────────────────┘
```

**Key Mobile Features:**

1. **Camera Integration:**
   - Take photos directly in app
   - Tag photos to specific hazards
   - Compress before upload
   - Queue for background upload

2. **GPS Tagging:**
   - Auto-capture location on site
   - Show on map in office view
   - Verify correct site

3. **Offline Queue:**
   - All forms work offline
   - Show sync status clearly
   - Retry failed syncs automatically
   - Conflict resolution UI

4. **Voice Input (Future):**
   - Dictate notes
   - Hands-free data entry
   - Useful with gloves/PPE

### PWA Implementation

**Service Worker Strategy:**

```javascript
// sw.js - Service Worker
const CACHE_NAME = 'hazardos-v1'
const OFFLINE_QUEUE = 'offline-estimates'

// Cache shell on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/estimates/new',
        '/offline.html',
        '/icons/icon-192.png'
      ])
    })
  )
})

// Network-first with fallback
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'POST') {
    // Queue POST requests when offline
    event.respondWith(
      fetch(event.request.clone()).catch(() => {
        return queueForSync(event.request)
      })
    )
  } else {
    // Network-first for GET
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request)
      })
    )
  }
})

// Background sync when online
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-estimates') {
    event.waitUntil(syncEstimates())
  }
})
```

**Offline Data Storage:**

```typescript
// lib/offline-storage.ts
import { openDB } from 'idb'

const DB_NAME = 'hazardos-offline'
const STORE_NAME = 'pending-estimates'

export async function saveOfflineEstimate(estimate: Estimate) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { 
        keyPath: 'id', 
        autoIncrement: true 
      })
    }
  })
  
  await db.add(STORE_NAME, {
    ...estimate,
    createdAt: Date.now(),
    synced: false
  })
}

export async function syncPendingEstimates() {
  const db = await openDB(DB_NAME, 1)
  const pending = await db.getAll(STORE_NAME)
  
  for (const estimate of pending) {
    try {
      await fetch('/api/estimates', {
        method: 'POST',
        body: JSON.stringify(estimate)
      })
      await db.delete(STORE_NAME, estimate.id)
    } catch (error) {
      console.error('Sync failed:', error)
      // Will retry on next sync
    }
  }
}
```

### Responsive Breakpoints

```css
/* Mobile First (default) */
.estimate-form {
  padding: 1rem;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .estimate-form {
    padding: 2rem;
    max-width: 640px;
    margin: 0 auto;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .estimate-form {
    max-width: 768px;
  }
  
  /* Side-by-side layout for office */
  .dashboard {
    display: grid;
    grid-template-columns: 300px 1fr;
  }
}
```

---

## Development Plan

### Phase 1: Core Foundation (Week 1)

**Goal:** Working estimate → quote flow

**Tasks:**
- [ ] Project setup (Next.js + Supabase + Vercel)
- [ ] Database schema implementation
- [ ] Authentication (Supabase Auth)
- [ ] Mobile-responsive estimate form
- [ ] Quote generation from estimate
- [ ] Basic dashboard (list estimates)

**Deliverable:** Estimators can create estimates and generate quotes

**Time:** 30-40 hours

---

### Phase 2: Scheduling & Overrides (Week 2)

**Goal:** Schedule jobs and capture overrides

**Tasks:**
- [ ] Schedule creation from estimate
- [ ] Calendar view (office dashboard)
- [ ] Override form with required reasons
- [ ] Crew/equipment management
- [ ] Schedule conflict detection

**Deliverable:** Office staff can schedule and override projections

**Time:** 25-35 hours

---

### Phase 3: Mobile & Offline (Week 3)

**Goal:** PWA with offline capability

**Tasks:**
- [ ] PWA manifest and service worker
- [ ] Offline form submission
- [ ] IndexedDB integration
- [ ] Background sync
- [ ] Camera integration (job photos)
- [ ] GPS tagging
- [ ] Install prompt

**Deliverable:** Field estimators can work offline on mobile

**Time:** 30-40 hours

---

### Phase 4: The Wiggum Loop (Week 4)

**Goal:** Close the loop with pattern detection

**Tasks:**
- [ ] Actual outcome capture form
- [ ] Variance calculation (auto)
- [ ] Pattern detection queries
- [ ] Pattern display in estimate form
- [ ] Estimator tendency reports
- [ ] Override reason analytics

**Deliverable:** System learns from outcomes and surfaces insights

**Time:** 35-45 hours

---

### Phase 5: Polish & Launch Prep (Week 5)

**Goal:** Production-ready

**Tasks:**
- [ ] Error handling & validation
- [ ] Loading states & animations
- [ ] Onboarding flow
- [ ] Help documentation
- [ ] Performance optimization
- [ ] Security audit
- [ ] Beta testing with 2-3 companies

**Deliverable:** Launch-ready product

**Time:** 30-40 hours

---

### Total Estimated Time

**Development:** 150-200 hours (4-5 weeks full-time)  
**Testing:** 20-30 hours  
**Marketing/Sales Prep:** 10-20 hours  

**Total:** 180-250 hours (~6 weeks calendar time with other work)

---

## Go-to-Market Strategy

### Target Customer Profile

**Company Size:** 10-50 employees  
**Annual Revenue:** $2M - $20M  
**Geography:** United States (initial), English-speaking countries

**Pain Points:**
- Losing money on inaccurate estimates
- Knowledge walking out the door with retiring staff
- Desktop software doesn't work at job sites
- Spreadsheets breaking down at scale
- No visibility into why jobs overrun

**Buying Process:**
- Owner/GM makes final decision
- Operations Manager influences
- Estimators must love it (user buy-in critical)
- 30-60 day sales cycle

### Pricing Strategy

**Tier 1: Starter - $99/month**
- 1 user license
- Unlimited estimates & quotes
- Basic scheduling
- Mobile app
- Email support

**Tier 2: Professional - $299/month** (Most Popular)
- 5 user licenses
- Everything in Starter
- Pattern learning (Wiggum Loop)
- Advanced analytics
- Priority support
- +$50/mo per additional user

**Tier 3: Enterprise - $799/month**
- Unlimited users
- Everything in Professional
- API access
- White-label option
- Custom integrations
- Dedicated support
- Onboarding & training

**Add-ons:**
- Additional users: $50/mo each
- Premium support: $199/mo
- Custom training: $500 one-time
- Data migration: $1,000 one-time

### Customer Acquisition Channels

**Phase 1: Direct Outreach (Months 1-3)**
- LinkedIn outreach to remediation company owners
- Industry association directories (IAQA, ACAC)
- Cold email to 100 qualified prospects
- Goal: 5-10 beta customers

**Phase 2: Content Marketing (Months 2-6)**
- SEO-optimized blog posts:
  - "How to Estimate Asbestos Removal Jobs"
  - "Why Your Estimates Are Always Wrong"
  - "Mobile Apps for Environmental Contractors"
- YouTube demos and tutorials
- Case studies from beta customers
- Goal: 20 organic signups/month

**Phase 3: Paid Acquisition (Months 4+)**
- Google Ads: "asbestos estimating software"
- LinkedIn Ads: Target job titles
- Industry publication ads
- Conference sponsorships
- Goal: 50 trials/month, 20% conversion

**Phase 4: Partnerships (Months 6+)**
- Referral program (20% recurring commission)
- Integration with accounting software (QuickBooks)
- Clearance lab partnerships
- Industry association endorsements

### Launch Plan

**Week 1-2: Beta Recruitment**
- Email 50 personal connections
- Post in industry Facebook groups
- LinkedIn outreach
- Goal: 3-5 beta companies

**Week 3-4: Beta Testing**
- Onboard beta customers
- Daily feedback sessions
- Iterate based on feedback
- Capture video testimonials

**Week 5-6: Soft Launch**
- Publish landing page with pricing
- Release case study/testimonials
- Begin content marketing
- Announce on LinkedIn/Twitter
- Goal: 5 paid customers

**Month 2-3: Public Launch**
- Press release to industry publications
- Product Hunt launch
- Podcast tour (construction/SaaS podcasts)
- Conference attendance
- Goal: 25 customers, $5K MRR

**Month 4-6: Scale**
- Paid advertising
- Sales team hire (if needed)
- Product improvements based on feedback
- Goal: 50 customers, $15K MRR

### Success Metrics

**Alpha/Beta (First 3 customers):**
- ✅ They actually use it daily
- ✅ Net Promoter Score > 8
- ✅ Willing to provide testimonial
- ✅ Pattern detection shows value

**Launch (First 6 months):**
- 50 paying customers
- $15K MRR
- 80% retention rate
- <30 day payback period
- 2.5+ estimates per user per week

**Growth (12 months):**
- 150 customers
- $50K MRR
- 90% gross margin
- Profitable (or path to profitability clear)
- Product-market fit validated

---

## Next Steps

### This Week (Immediate Actions)

**Day 1: Setup**
- [ ] Register hazardos.app domain
- [ ] Set up GitHub repo: `hazardos-app`
- [ ] Reserve social handles (@hazardos)
- [ ] Create Supabase project
- [ ] Set up Vercel project
- [ ] Create logo (Figma or hire designer)

**Day 2: Foundation**
- [ ] Initialize Next.js 16.1.6 project
- [ ] Install core dependencies
- [ ] Set up Tailwind config
- [ ] Create base layout components
- [ ] Connect Supabase

**Day 3-4: First Feature**
- [ ] Build estimate form (mobile-first)
- [ ] Implement form validation
- [ ] Connect to Supabase
- [ ] Test on mobile device

**Day 5: Review & Plan**
- [ ] Test end-to-end flow
- [ ] Review code quality
- [ ] Update this document with learnings
- [ ] Plan Week 2 tasks

### Week 2 Goals

- [ ] Complete scheduling module
- [ ] Add override tracking
- [ ] Build office dashboard
- [ ] Begin PWA implementation

### Decision Points

**End of Week 1:**
- Manual development (Cursor) vs. autonomous (ralph-claude-code)?
- Complexity assessment: on track or need to simplify?

**End of Week 2:**
- Continue with current approach or pivot?
- Ready for beta testing or need more features?

**End of Month 1:**
- Launch beta or keep iterating?
- Pricing validated or needs adjustment?

---

## Appendices

### A. Competitive Analysis

**ServiceTitan** ($500-2000/mo)
- ❌ Too expensive for mid-market
- ❌ Overkill features (HVAC/plumbing focus)
- ❌ Desktop-first
- ✅ Well-established, feature-rich

**Jobber** ($49-229/mo)
- ❌ Generic field service (not remediation-specific)
- ❌ No pattern learning
- ✅ Good mobile app
- ✅ Reasonable pricing

**Housecall Pro** ($49-249/mo)
- ❌ Consumer service focus (not commercial)
- ❌ No compliance features
- ✅ Easy to use
- ✅ Good mobile experience

**HazardOS Advantages:**
- ✅ Purpose-built for remediation
- ✅ Ralph Wiggum Loop (unique)
- ✅ Mobile-first PWA
- ✅ Focused feature set
- ✅ Mid-market pricing

### B. Regulatory Considerations

**Data to Capture for Compliance:**
- OSHA containment requirements
- EPA notification records
- Worker safety certifications
- Air monitoring results
- Disposal manifests
- Customer notifications

**Future Features:**
- Compliance checklist automation
- Regulatory reporting exports
- Worker certification tracking
- Insurance certificate management

### C. Technical Debt Prevention

**Code Quality:**
- TypeScript strict mode (no `any`)
- ESLint + Prettier
- Component testing (Vitest)
- E2E testing (Playwright)

**Architecture:**
- Clear separation: UI / Logic / Data
- Reusable components (design system)
- API versioning from day 1
- Database migrations tracked

**Documentation:**
- Inline code comments (why, not what)
- API documentation (OpenAPI spec)
- Component storybook
- Architecture decision records (ADRs)

### D. Resources

**Design Inspiration:**
- Fieldwire (construction app)
- Procore (construction management)
- ServiceTitan (field service)
- Linear (clean UI/UX)

**Technical Learning:**
- Next.js docs: https://nextjs.org/docs
- Supabase docs: https://supabase.com/docs
- PWA guide: https://web.dev/progressive-web-apps/
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

**Industry Resources:**
- ACAC (asbestos): https://acac.org
- IAQA (mold): https://iaqa.org
- OSHA 1926.1101 (asbestos standard)
- EPA Mold Remediation Guidelines

---

## Document Control

**Version:** 1.0  
**Date:** January 31, 2026  
**Author:** Asymmetric Marketing LLC  
**Status:** Draft - Pre-Development  

**Change Log:**
- v1.0 (2026-01-31): Initial comprehensive project overview

**Next Review:** After Week 1 development sprint

---

*This document is a living roadmap. Update as you learn, iterate as you build, ship when ready.*
