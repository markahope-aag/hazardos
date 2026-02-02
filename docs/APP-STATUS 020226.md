# HazardOS - Application Status

> Environmental Remediation Business Management Platform  
> Last Updated: February 2, 2026  
> Status: **Production Ready** ✅

## Overview

HazardOS is a multi-tenant SaaS application for environmental remediation companies to manage field assessments, estimates, proposals, and jobs. Built with Next.js 14, Supabase, and TypeScript.

## Tech Stack

| Layer | Technology | Status |
|-------|------------|--------|
| Framework | Next.js 16 (App Router, Turbopack) | ✅ Production |
| Language | TypeScript 5.9 (strict mode) | ✅ Production |
| Database | Supabase (PostgreSQL) | ✅ Production |
| Auth | Supabase Auth | ✅ Production |
| State | Zustand, TanStack Query | ✅ Production |
| Forms | React Hook Form + Zod 4 | ✅ Production |
| UI | Tailwind CSS 4, Radix UI, shadcn/ui | ✅ Production |
| PDF | @react-pdf/renderer | ✅ Production |
| PWA | next-pwa | ✅ Production |
| Deployment | Vercel | ✅ Production |

## Project Structure

```
hazardos/
├── app/
│   ├── (auth)/login/          # Authentication pages
│   ├── (dashboard)/           # Main app pages
│   │   ├── site-surveys/      # Site Survey CRUD (renamed from assessments)
│   │   ├── customers/         # Customer management CRUD
│   │   ├── database-status/   # DB verification tools
│   │   ├── page.tsx           # Dashboard home
│   │   └── layout.tsx         # Dashboard layout
│   ├── (platform)/            # Platform admin
│   │   └── platform-admin/    # Tenant management
│   └── api/
│       ├── customers/         # Customer CRUD API endpoints
│       └── proposals/generate # PDF generation endpoint
├── components/
│   ├── assessments/           # Site Survey form components (legacy name)
│   ├── customers/             # Customer management components
│   ├── surveys/               # Mobile survey wizard components
│   ├── auth/                  # Login form
│   ├── layout/                # Navigation, headers, user menus
│   ├── proposals/             # Proposal generator UI
│   ├── providers/             # Context providers
│   └── ui/                    # Base UI components (shadcn/ui)
├── lib/
│   ├── supabase/              # Database client & service
│   ├── hooks/                 # Custom hooks (auth, permissions)
│   ├── pdf/                   # PDF templates
│   └── validations/           # Zod schemas
├── supabase/
│   └── migrations/            # Database migrations
├── types/                     # TypeScript definitions
└── docs/                      # Documentation
```

## Database Schema

### Core Tables

| Table | Purpose | Status |
|-------|---------|--------|
| `organizations` | Tenant companies with subscription info | ✅ Production |
| `profiles` | User accounts (extends Supabase auth) | ✅ Production |
| `site_surveys` | Field assessment records (renamed from assessments) | ✅ Production |
| `site_survey_photos` | Photo/video attachments with metadata | ✅ Production |
| `customers` | Customer contact info and relationship management | ✅ Production |
| `labor_rates` | Hourly labor pricing by role and organization | ✅ Production |
| `equipment_rates` | Equipment rental and usage pricing | ✅ Production |
| `material_costs` | Material pricing and supplier information | ✅ Production |
| `disposal_fees` | Hazardous material disposal costs by type | ✅ Production |
| `travel_rates` | Mileage and travel time pricing | ✅ Production |
| `pricing_settings` | Organization-specific markup and pricing rules | ✅ Production |
| `estimates` | Cost estimates for assessments | ✅ Schema Ready |
| `jobs` | Scheduled/active remediation jobs | ✅ Schema Ready |
| `equipment_catalog` | Reusable equipment pricing | ✅ Schema Ready |
| `materials_catalog` | Reusable materials pricing | ✅ Schema Ready |

### Multi-Tenancy Tables

| Table | Purpose |
|-------|---------|
| `platform_settings` | Platform-wide configuration |
| `tenant_usage` | Monthly usage tracking per tenant |
| `audit_log` | Activity logging |
| `tenant_invitations` | User invitation management |

### Enums

- `hazard_type`: asbestos, mold, lead, vermiculite, other
- `site_survey_status`: draft, submitted, estimated, quoted, scheduled, completed (renamed from assessment_status)
- `customer_status`: lead, prospect, customer, inactive
- `customer_source`: referral, website, advertising, cold_call, trade_show, other
- `appointment_status`: scheduled, confirmed, in_progress, completed, cancelled, rescheduled
- `disposal_hazard_type`: asbestos, mold, lead, vermiculite, mixed, other
- `user_role`: platform_owner, platform_admin, tenant_owner, admin, estimator, technician, viewer
- `organization_status`: active, suspended, cancelled, trial
- `subscription_tier`: trial, starter, professional, enterprise

## Features Status

### ✅ Production Ready

| Feature | Status | Notes |
|---------|--------|-------|
| **Authentication & Multi-Tenancy** |
| Multi-tenant Authentication | ✅ Complete | Email/password via Supabase |
| Role-based Access Control | ✅ Complete | 7 user roles with RLS policies |
| Platform Owner Access | ✅ Complete | Super-admin for mark.hope@asymmetric.pro |
| User Profile Management | ✅ Complete | Profile CRUD with organization linking |
| Logout Functionality | ✅ Complete | Secure logout with redirect |
| **Site Survey Management** |
| Site Survey List | ✅ Complete | Search, filter by status (renamed from assessments) |
| Site Survey Create/Edit | ✅ Complete | Mobile-optimized form with auto-save |
| Site Survey Detail View | ✅ Complete | Full survey data display |
| Photo/Video Upload | ✅ Complete | Client-side compression, Supabase Storage |
| GPS Location Capture | ✅ Complete | Automatic location detection |
| Field Validation | ✅ Complete | Zod schemas with error handling |
| Scheduling Fields | ✅ Complete | Date/time scheduling with appointment status |
| Customer Linkage | ✅ Complete | Link surveys to customer records |
| **Customer Management** |
| Customer List | ✅ Complete | Search, filter by status and source |
| Customer Create/Edit | ✅ Complete | Full contact info and relationship tracking |
| Customer Detail View | ✅ Complete | Customer info, surveys, and activity feed |
| Customer Status Management | ✅ Complete | Lead → Prospect → Customer workflow |
| Customer-Survey Relationship | ✅ Complete | Link customers to site surveys |
| **Pricing Management** |
| Labor Rates | ✅ Complete | Role-based hourly pricing by organization |
| Equipment Rates | ✅ Complete | Equipment rental and usage pricing |
| Material Costs | ✅ Complete | Material pricing with supplier tracking |
| Disposal Fees | ✅ Complete | Hazardous material disposal costs by type |
| Travel Rates | ✅ Complete | Mileage and travel time pricing |
| Pricing Settings | ✅ Complete | Organization markup and pricing rules |
| **Dashboard & Navigation** |
| Main Dashboard | ✅ Complete | Stats, quick actions, recent activity |
| Mobile Navigation | ✅ Complete | User menu, logout, responsive design |
| Platform Admin Dashboard | ✅ Complete | Tenant stats, activity overview |
| Tenant Management | ✅ Complete | List and manage organizations |
| **PDF & Proposals** |
| PDF Proposal Generation | ✅ Complete | Professional proposals with branding |
| Proposal Templates | ✅ Complete | Dynamic content generation |
| **Database & Infrastructure** |
| Database Migrations | ✅ Complete | Proper Supabase CLI migrations |
| Database Verification Tools | ✅ Complete | `/database-status` page for health checks |
| Storage Configuration | ✅ Complete | Private bucket with RLS policies |
| **Mobile & PWA** |
| PWA Support | ✅ Complete | Offline capability, installable |
| Mobile-responsive UI | ✅ Complete | Mobile-first design throughout |
| Touch-optimized Forms | ✅ Complete | Large buttons, easy input fields |

### 🚧 In Development / Planned

| Feature | Priority | Status | Notes |
|---------|----------|--------|-------|
| **User Management** |
| User Registration Flow | High | 📋 Planned | Currently invite-only |
| User Invitation System | High | 📋 Planned | Email invites with role assignment |
| **Estimates & Pricing** |
| Estimate Builder UI | High | 📋 Planned | Visual estimate creation from site surveys |
| Equipment/Materials Catalog UI | Medium | 📋 Planned | CRUD interface for pricing catalogs |
| Cost Calculation Engine | Medium | 📋 Planned | Auto-calculate from survey data |
| **Scheduling & Jobs** |
| Job Scheduling Calendar | Medium | 📋 Planned | Calendar integration for job management |
| Job Tracking | Medium | 📋 Planned | Progress tracking and completion |
| **Reporting & Analytics** |
| Reports Dashboard | Low | 📋 Planned | Business intelligence and insights |
| Usage Analytics | Low | 📋 Planned | Track feature usage per tenant |
| **Settings & Configuration** |
| Organization Settings | Low | 📋 Planned | Company profile, preferences |
| User Settings | Low | 📋 Planned | Personal preferences, notifications |

## API Routes

### POST `/api/proposals/generate`

Generates a PDF proposal from an estimate.

**Request:**
```json
{
  "estimateId": "uuid",
  "customTerms": {
    "paymentTerms": "50% deposit...",
    "validDays": 30,
    "exclusions": ["..."]
  }
}
```

**Response:** PDF file download

**PDF Contents:**
- Company header with branding
- Customer and site information
- Project details (hazard type, containment, duration)
- Itemized cost breakdown (labor, equipment, materials, disposal)
- Subtotal, markup percentage, grand total
- Terms & conditions with exclusions
- Signature lines

## Authentication & Authorization

### Auth Flow

1. User visits app → redirects to `/login` if not authenticated
2. Login via Supabase Auth (email/password)
3. Profile lookup joins user to organization
4. Role determines accessible features via RLS

### User Roles

| Role | Scope | Capabilities |
|------|-------|--------------|
| `platform_owner` | Platform | Full platform control |
| `platform_admin` | Platform | Platform administration |
| `tenant_owner` | Organization | Full org control |
| `admin` | Organization | Org administration |
| `estimator` | Organization | Create assessments/estimates |
| `technician` | Organization | View/update assigned jobs |
| `viewer` | Organization | Read-only access |

### Row Level Security

All tables have RLS policies enforcing:
- Users can only access data from their organization
- Platform users can access all organizations
- Role-specific permissions for create/update/delete

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Design System

| Element | Value |
|---------|-------|
| Primary Color | `#FF6B35` (HazardOS Orange) |
| Secondary Color | `#1F2937` (Navy Blue) |
| Font | System default (Geist) |
| Border Radius | 0.5rem (default) |

## Development Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Build for production
pnpm build

# Database migrations (Supabase CLI)
supabase migration new <name>
supabase db push
```

## Deployment

The application is configured for deployment on Vercel with:
- Automatic builds on push
- Environment variables in Vercel dashboard
- Supabase as managed database backend

## Next Steps (Recommended)

1. **User Registration** - Build signup flow with organization creation
2. **Estimate Builder** - Interface for creating estimates from assessments
3. **Photo Upload** - Implement photo capture and gallery for assessments
4. **Job Scheduling** - Calendar view for scheduled jobs
5. **Mobile Testing** - Validate PWA on iOS/Android devices
