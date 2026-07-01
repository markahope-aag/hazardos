# HazardOS — Overview

> The Operating System for Environmental Remediation Companies.

HazardOS is a multi-tenant SaaS platform that runs the entire business of a
hazardous-materials abatement company — asbestos, lead, mold, and vermiculite
removal — from the first inbound lead all the way through job completion and
payment. It replaces the tangle of spreadsheets, generic CRMs, paper survey
forms, and disconnected accounting tools that most small remediation firms
stitch together today.

## Who it's for

The target customer is a small-to-mid-size abatement contractor: roughly 5–50
employees doing residential and commercial hazardous-materials work. These
companies operate in a heavily regulated, field-heavy trade — every job involves
site surveys, OSHA containment classifications, disposal manifests, air
monitoring, and clearance testing. Off-the-shelf software doesn't speak their
language. HazardOS is built specifically around that workflow and its
terminology.

It is explicitly positioned as a modern replacement for **MarketSharp**, the
legacy CRM many remediation firms currently use (the repo includes a migration
guide and feature-parity comparison for switching customers over).

## What it does — the core lifecycle

HazardOS models the full revenue lifecycle as one connected pipeline. Data flows
forward automatically at each stage, so nothing is re-keyed:

```
Lead / Contact  →  Site Survey  →  Estimate  →  Proposal  →  Job  →  Work Order  →  Invoice  →  Paid
     (CRM)         (mobile field)   (calculator)  (client)    (scheduled)  (field crew)  (billing)
```

1. **Capture the lead** — Contacts and companies enter through the CRM, tagged
   with a marketing source. Inbound leads can also arrive via webhook from
   external lead vendors.
2. **Survey the site** — A field tech runs a mobile, offline-capable survey
   wizard on-site: hazard type, quantities, friability, containment level,
   photos, and voice notes.
3. **Build the estimate** — An estimate calculator turns the survey into
   itemized labor, equipment, material, disposal, travel, testing, and permit
   costs using hazard-specific formulas. AI can draft an estimate directly from
   the survey.
4. **Send the proposal** — Estimates become branded PDF proposals rendered from
   one of eight hazard-specific templates, delivered to a customer portal for
   review and verbal/written approval.
5. **Run the job** — A won opportunity becomes a scheduled job with crew
   assignments, materials, checklists, time entries, daily logs, and completion
   photos. Work orders drive the field crew.
6. **Bill and collect** — Invoices are generated, delivered by email/SMS, and
   paid via Stripe, with optional QuickBooks sync for accounting.
7. **Measure** — Every touch is attributed, every job's estimated-vs-actual
   variance is tracked, and analytics roll up across the whole funnel.

## Feature areas at a glance

| Area | What it covers |
|------|----------------|
| **CRM** | Contacts, companies, opportunities, Kanban pipeline, follow-ups, segments |
| **Site Surveys** | Mobile field wizard, hazard-specific forms, photo/voice capture, offline sync, versioning |
| **Estimates** | Line-item calculator, industry pricing rules, versioning, AI-assisted generation |
| **Proposals** | 8 branded PDF templates, customer portal, approval tracking |
| **Jobs** | Scheduling, crews, materials, resources, checklists, time entries, change orders, daily logs |
| **Work Orders** | Field crew job sheets with staged completion and document attachments |
| **Invoicing** | Invoice generation, Stripe payments, QuickBooks sync, email/SMS delivery |
| **Lab Reports** | Third-party clearance/testing results attached to jobs |
| **Analytics** | Funnel attribution, job cost variance, commissions, reporting dashboards |
| **Communications** | Email (Resend), SMS (Twilio), in-app notifications, reminders |
| **Integrations** | Google Calendar, Outlook, HubSpot, Mailchimp, QuickBooks, inbound lead webhooks |
| **Platform Admin** | Multi-tenant management, white-label branding, feature flags, billing |
| **Public API** | Scoped, rate-limited, API-key-authenticated `/api/v1` surface with OpenAPI docs |

## What makes it unique

- **Built for the trade, not adapted to it.** The data model speaks in OSHA
  containment levels (Type I/II/III), friability, disposal manifests, air
  monitoring, clearance testing, regulatory triggers, and hazard types. Generic
  CRMs can't represent any of this natively.

- **Field-first and offline-capable.** It's a real PWA. A tech can complete a
  full site survey — photos, voice notes, measurements — with no signal in a
  basement or attic; everything queues in IndexedDB and syncs on reconnect. The
  photo pipeline is engineered for flaky rural connections with queued uploads,
  exponential-backoff retries, and dual R2/Supabase storage.

- **One connected pipeline, not point tools.** Survey → estimate → proposal →
  job → work order → invoice all share data. Marketing attribution and pricing
  assumptions inherit forward automatically through database triggers, so a job's
  revenue can be traced back to the ad campaign that produced the lead.

- **Full-funnel multi-touch attribution.** Every contact, company, opportunity,
  and job carries first-touch, last-touch, and converting-touch source/medium/
  campaign, backed by a touchpoint log — closed-loop ROI reporting most trade
  software never attempts.

- **Hazard-specific estimating and proposals.** The estimate calculator and the
  eight proposal templates (Encapsulation, Transite Siding, Lead Removal, Mold
  Remediation, Floor Tile, Miscellaneous Asbestos, TSI, Vermiculite) encode the
  real work practices and regulatory language for each hazard class.

- **Secure multi-tenancy by construction.** Every table is organization-scoped
  and enforced at the database layer with PostgreSQL Row-Level Security, plus
  composite foreign-key integrity so a child record can never cross tenants.

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| UI | React 19, Tailwind CSS 4, shadcn/ui + Radix |
| State | Zustand (client), TanStack Query (server) |
| Forms | react-hook-form + Zod |
| Database | Supabase (PostgreSQL + Row-Level Security) |
| Auth | Supabase Auth (cookie-based SSR sessions) |
| Storage | Supabase Storage + Cloudflare R2 |
| Payments | Stripe (billing), QuickBooks (invoicing) |
| Email / SMS | Resend / Twilio |
| AI | Anthropic + OpenAI (estimate drafting, photo analysis, voice transcription) |
| PWA | @serwist/next service worker |
| Monitoring | Sentry, Vercel Analytics + Speed Insights |
| Hosting | Vercel (Edge Network) |

## Scale of the codebase

- ~210 API endpoint files across internal and public (`/api/v1`) surfaces
- 144 database migrations spanning the full schema, roughly 60+ of them
  dedicated to Row-Level Security policies and hardening
- Dozens of domain services in `lib/services` covering estimates, jobs,
  invoicing, photos, CRM, integrations, notifications, and analytics
- A mobile survey wizard composed of 35+ hazard-specific form components

For the technical and domain deep dive — architecture decisions, data model,
and the notable engineering — see [ARCHITECTURE-DEEP-DIVE.md](./ARCHITECTURE-DEEP-DIVE.md).
