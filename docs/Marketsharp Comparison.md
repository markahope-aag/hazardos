# MarketSharp vs. HazardOS Feature Comparison

**Purpose:** Ensure client switching from MarketSharp to HazardOS doesn't lose critical functionality  
**Date:** January 31, 2026

---

## MarketSharp Overview

MarketSharp is a CRM built for home improvement contractors (remodelers, window/siding companies, roofers). It's been around since 1988 and serves 3,700+ companies. Pricing starts at $99/month.

**Core Value Proposition:** All-in-one lead-to-cash management for home improvement contractors.

---

## Feature Comparison Matrix

### 1. LEAD & CUSTOMER MANAGEMENT

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| Lead capture from website forms | ✅ Custom Lead Capture | ✅ Planned | No |
| Lead source tracking | ✅ | ✅ `source` field | No |
| Lead/customer status workflow | ✅ | ✅ lead→prospect→customer→inactive | No |
| Contact management | ✅ | ✅ customers table | No |
| Multiple contacts per company | ✅ | ❌ Single contact | **Gap** |
| Communication history/notes | ✅ | ✅ notes field | Partial |
| Activity timeline | ✅ | ❌ Not designed | **Gap** |
| Lead scoring | ✅ | ❌ | **Gap** (low priority) |
| Do Not Call (DNC) list management | ✅ | ❌ | **Gap** (low priority) |
| Duplicate detection/merge | ✅ | ❌ | **Gap** |

### 2. SALES & ESTIMATING

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| Quotes/estimates creation | ✅ Templates with auto-pricing | ✅ Auto-calculate from survey | No |
| Proposal generation | ✅ Via integrations (Leap, One Click) | ✅ PDF generation | No |
| Proposal versioning | ? | ✅ v1, v2, v3 | No |
| E-signature | ✅ Via integration | ✅ SignWell planned | No |
| Sales pipeline view | ✅ | ❌ Not designed | **Gap** |
| Sales opportunity tracking | ✅ | ⚠️ Customer status only | Partial |
| Commission tracking | ✅ | ❌ | **Gap** |
| Win/loss tracking | ✅ | ❌ | **Gap** |
| Sales rep performance reports | ✅ | ❌ | **Gap** |

### 3. SCHEDULING & CALENDAR

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| Appointment calendar | ✅ Multiple views | ✅ Planned (custom) | No |
| Sales appointment scheduling | ✅ | ✅ Site survey scheduling | No |
| Production/job scheduling | ✅ | ✅ Job scheduling planned | No |
| Crew scheduling | ✅ | ✅ Crew assignments planned | No |
| Route optimization | ✅ | ❌ | **Gap** |
| Color-coding by type/crew | ✅ | ✅ Planned | No |
| Drag-and-drop scheduling | ✅ | ✅ Planned | No |
| Slot scheduler | ✅ | ❌ | **Gap** (low priority) |

### 4. PROJECT/JOB MANAGEMENT

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| Job/project records | ✅ | ✅ `jobs` table planned | No |
| Job status tracking | ✅ Real-time | ✅ Planned | No |
| Production workflow/tasks | ✅ Production Module | ⚠️ Basic (completion form) | Partial |
| Job completion tracking | ✅ | ✅ Job completion form | No |
| Job costing | ✅ | ✅ Via Ralph Wiggum Loop | No |
| Document/photo attachments | ✅ | ✅ Photos + docs planned | No |
| Work crew assignment | ✅ | ✅ Planned | No |
| Equipment tracking | ✅ | ✅ Planned | No |
| Change orders | ✅ | ✅ Planned | No |
| Service/warranty management | ✅ Service Module | ❌ | **Gap** |

### 5. COMMUNICATION & AUTOMATION

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| Email templates | ✅ | ✅ Planned | No |
| Automated email sequences | ✅ MarketSharp Email | ❌ Basic triggers only | **Gap** |
| SMS messaging | ✅ | ✅ Twilio planned | No |
| Automated appointment reminders | ✅ | ✅ Planned (7d, 3d, 1d) | No |
| Automated job status updates | ✅ | ❌ | **Gap** |
| Direct mail integration | ✅ SmartMail Plus | ❌ | **Gap** |
| Email tracking (opens/clicks) | ✅ | ⚠️ Basic | Partial |

### 6. CALL CENTER

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| Inbound call logging | ✅ | ❌ | **Gap** |
| Outbound dialer | ✅ Via Five9 | ❌ | N/A (integration) |
| Call scripting | ✅ | ❌ | **Gap** |
| Call recording | ✅ Via Five9 | ❌ | N/A (integration) |
| Call queue management | ✅ | ❌ | **Gap** |

### 7. MARKETING

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| Campaign tracking | ✅ | ⚠️ Source tracking only | Partial |
| Marketing ROI by source | ✅ | ❌ | **Gap** |
| Email marketing campaigns | ✅ | ❌ (Mailchimp integration) | Via integration |
| Customer segmentation | ✅ | ❌ | **Gap** |
| Repeat/referral business tracking | ✅ | ⚠️ Source=referral | Partial |
| Direct mail campaigns | ✅ | ❌ | N/A |
| Job-site radius marketing | ✅ | ❌ | **Gap** |

### 8. REPUTATION & REVIEWS

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| Review request automation | ✅ | ✅ Planned (high marks trigger) | No |
| Review monitoring | ✅ | ❌ | **Gap** |
| Review response management | ✅ | ❌ | **Gap** |
| Customer satisfaction surveys | ✅ GuildQuality integration | ✅ Post-job survey | No |
| Testimonial collection | ✅ | ⚠️ Approval flag only | Partial |

### 9. INVOICING & PAYMENTS

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| Invoice generation | ✅ | ✅ Planned | No |
| Online payment acceptance | ✅ PaySimple | ✅ Stripe planned | No |
| Credit card processing | ✅ | ✅ Via Stripe | No |
| ACH/bank payments | ✅ | ✅ Via Stripe | No |
| Recurring billing | ✅ | ❌ | **Gap** (low priority) |
| Payment reminders | ✅ | ✅ Planned | No |
| Partial payments/deposits | ✅ | ✅ Planned | No |
| Balance due tracking | ✅ | ✅ Planned | No |

### 10. REPORTING & DASHBOARDS

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| Real-time dashboards | ✅ | ❌ Not designed | **Gap** |
| Customizable reports | ✅ 100+ reports | ❌ Not designed | **Gap** |
| Automated report scheduling | ✅ | ❌ | **Gap** |
| Sales performance reports | ✅ | ❌ | **Gap** |
| Marketing ROI reports | ✅ | ❌ | **Gap** |
| Job cost reports | ✅ | ⚠️ Via Ralph Wiggum Loop | Partial |
| Production reports | ✅ | ❌ | **Gap** |
| Commission reports | ✅ | ❌ | **Gap** |
| Lead cost report | ✅ | ❌ | **Gap** |
| Export to Excel | ✅ | ⚠️ CSV export | Partial |

### 11. INTEGRATIONS

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| QuickBooks Desktop | ✅ | ❌ | **Gap** |
| QuickBooks Online | ✅ | ❌ | **Gap** |
| Lead providers (EverConnect, etc.) | ✅ | ❌ | **Gap** |
| Leap (estimating) | ✅ | N/A (built-in) | N/A |
| One Click Contractor | ✅ | N/A | N/A |
| Constant Contact | ✅ | ❌ (Mailchimp instead) | Different tool |
| Five9 (call center) | ✅ | ❌ | N/A |
| GuildQuality | ✅ | ❌ | N/A |
| Hatch | ✅ | ❌ | N/A |
| SalesRabbit | ✅ | ❌ | N/A |

### 12. MOBILE APP

| Feature | MarketSharp | HazardOS | Gap? |
|---------|-------------|----------|------|
| Mobile app | ✅ Native app | ✅ PWA | No |
| Lead/customer lookup | ✅ | ✅ | No |
| Appointment management | ✅ | ✅ | No |
| Quote/estimate creation | ✅ | ✅ Site survey form | No |
| Payment collection | ✅ | ⚠️ Future | Partial |
| Route optimization | ✅ | ❌ | **Gap** |
| Offline capability | ? | ✅ | No |
| Photo capture | ✅ | ✅ | No |

---

## Gap Analysis Summary

### Critical Gaps (Address for Launch)

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **QuickBooks Integration** | High — client needs accounting sync | Build QuickBooks Online integration |
| **Reporting/Dashboards** | High — business visibility | Build basic dashboard with key metrics |
| **Activity Timeline** | Medium — CRM expectation | Add activity log to customer records |
| **Multiple Contacts per Company** | Medium — commercial jobs need this | Add contacts table linked to customers |

### Important Gaps (Address for V1.1)

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| Sales Pipeline View | Medium | Add Kanban-style pipeline view |
| Commission Tracking | Medium | Add commission fields to jobs |
| Automated Email Sequences | Medium | Build or integrate (Mailchimp) |
| Marketing ROI Reports | Medium | Track cost per lead, cost per sale |
| Job Status Auto-Updates | Low-Medium | Add automated customer notifications |

### Low Priority / Not Needed

| Gap | Reason to Deprioritize |
|-----|------------------------|
| Call Center features | Remediation companies don't typically have call centers |
| Route Optimization | Nice-to-have, not critical for remediation |
| Direct Mail | Can use external tools |
| Lead Scoring | Overkill for target market |
| Slot Scheduler | Not typical for remediation workflow |
| Service/Warranty Module | Different business model than home improvement |

### HazardOS Advantages Over MarketSharp

| Feature | Why HazardOS is Better |
|---------|----------------------|
| **Industry-specific survey forms** | Built for asbestos/mold/lead, not generic home improvement |
| **EPA/OSHA compliance built-in** | Regulatory requirements built into workflow |
| **Ralph Wiggum Loop** | Learning engine improves estimates over time |
| **Offline-first mobile** | Field work often in basements with no signal |
| **Modern tech stack** | Next.js/Supabase vs. legacy platform |
| **Hazard-specific pricing** | Containment levels, disposal fees by type |
| **Photo requirements by hazard** | Enforces documentation standards |

---

## Recommended Actions

### Before Client Onboarding

1. **QuickBooks Online Integration** — Critical for accounting workflow
   - Sync customers to QB
   - Sync invoices to QB
   - Sync payments from QB
   - Estimated effort: 2-3 weeks

2. **Basic Dashboard** — Business owner needs visibility
   - Leads this month vs. last month
   - Proposals sent/signed/pending
   - Revenue this month
   - Jobs in progress
   - Estimated effort: 1 week

3. **Activity Timeline** — Basic CRM expectation
   - Log calls, emails, notes on customer record
   - Show activity feed on customer detail page
   - Estimated effort: 1 week

4. **Multiple Contacts per Customer** — Commercial jobs need this
   - Property owner vs. property manager vs. building engineer
   - Estimated effort: 3-4 days

### Data Migration Considerations

| MarketSharp Data | HazardOS Destination | Notes |
|-----------------|---------------------|-------|
| Contacts/Leads | `customers` table | Map status fields |
| Notes/History | Activity timeline | Need to build first |
| Jobs | Not directly portable | Different data model |
| Documents | Supabase Storage | Manual or scripted upload |
| QuickBooks data | Keep in QuickBooks | Don't migrate, integrate |

---

## Client Interview Questions

Before finalizing the gap list, ask the client:

1. **What MarketSharp features do you use daily?**
2. **What features do you never use?**
3. **What's frustrating about MarketSharp?**
4. **Do you use the call center module?**
5. **Do you use direct mail features?**
6. **What reports do you run regularly?**
7. **How do you currently track commissions?**
8. **Do you need QuickBooks Desktop or QuickBooks Online integration?**
9. **How many contacts per job site typically?**
10. **What would make HazardOS better than MarketSharp for your business?**

---

## Conclusion

MarketSharp is a mature, feature-rich platform, but it's designed for **general home improvement** (windows, siding, roofing), not **environmental remediation**. 

HazardOS's advantages:
- Purpose-built for asbestos/mold/lead workflows
- Regulatory compliance baked in
- Modern, mobile-first architecture
- Learning engine for estimate accuracy

Critical gaps to address before switching client:
1. QuickBooks integration
2. Basic reporting dashboard
3. Activity timeline on customers
4. Multiple contacts per customer

These four items would take approximately **4-5 weeks** to build and would make HazardOS a viable replacement for this client's core workflow.
