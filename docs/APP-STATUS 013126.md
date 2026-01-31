# HazardOS - Application Status

> Environmental Remediation Business Management Platform
> Last Updated: January 31, 2026

## Overview

HazardOS is a multi-tenant SaaS application for environmental remediation companies to manage field assessments, estimates, proposals, and jobs. Built with Next.js 14, Supabase, and TypeScript.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5.9 (strict mode) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| State | Zustand, React Query |
| Forms | React Hook Form + Zod 4 |
| UI | Tailwind CSS 4, Radix UI, shadcn/ui |
| PDF | @react-pdf/renderer |
| PWA | next-pwa |

## Project Structure

```
hazardos/
├── app/
│   ├── (auth)/login/          # Authentication pages
│   ├── (dashboard)/           # Main app pages
│   │   ├── assessments/       # Assessment CRUD
│   │   ├── page.tsx           # Dashboard home
│   │   └── layout.tsx         # Dashboard layout
│   ├── (platform)/            # Platform admin
│   │   └── platform-admin/    # Tenant management
│   └── api/
│       └── proposals/generate # PDF generation endpoint
├── components/
│   ├── assessments/           # Assessment form components
│   ├── auth/                  # Login form
│   ├── layout/                # Navigation, headers
│   ├── proposals/             # Proposal generator UI
│   ├── providers/             # Context providers
│   └── ui/                    # Base UI components
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

| Table | Purpose |
|-------|---------|
| `organizations` | Tenant companies with subscription info |
| `profiles` | User accounts (extends Supabase auth) |
| `assessments` | Field assessment records |
| `photos` | Assessment photo attachments |
| `estimates` | Cost estimates for assessments |
| `jobs` | Scheduled/active remediation jobs |
| `equipment_catalog` | Reusable equipment pricing |
| `materials_catalog` | Reusable materials pricing |

### Multi-Tenancy Tables

| Table | Purpose |
|-------|---------|
| `platform_settings` | Platform-wide configuration |
| `tenant_usage` | Monthly usage tracking per tenant |
| `audit_log` | Activity logging |
| `tenant_invitations` | User invitation management |

### Enums

- `hazard_type`: asbestos, mold, lead, vermiculite, other
- `assessment_status`: draft, submitted, estimated, quoted, scheduled, completed
- `user_role`: platform_owner, platform_admin, tenant_owner, admin, estimator, technician, viewer
- `organization_status`: active, suspended, cancelled, trial
- `subscription_tier`: trial, starter, professional, enterprise

## Features Status

### Implemented

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-tenant Authentication | ✅ Complete | Email/password via Supabase |
| Role-based Access Control | ✅ Complete | 7 user roles with RLS policies |
| Dashboard | ✅ Complete | Stats, quick actions, recent activity |
| Assessment List | ✅ Complete | Search, filter by status |
| Assessment Create/Edit | ✅ Complete | Auto-save drafts, GPS capture |
| Assessment Detail View | ✅ Complete | Full assessment data display |
| Platform Admin Dashboard | ✅ Complete | Tenant stats, activity overview |
| Tenant Management | ✅ Complete | List and manage tenants |
| PDF Proposal Generation | ✅ Complete | Professional proposals from estimates |
| PWA Support | ✅ Complete | Offline capability, installable |
| Mobile-responsive UI | ✅ Complete | Mobile-first design |

### Not Yet Implemented

| Feature | Priority | Notes |
|---------|----------|-------|
| User Registration | High | Currently invite-only |
| Estimate Builder | High | UI needed for creating estimates |
| Job Scheduling | Medium | Calendar integration planned |
| Photo Upload | Medium | Storage bucket configured |
| Equipment/Materials Catalog UI | Medium | CRUD interface needed |
| Reports | Low | UI skeleton present |
| Settings Pages | Low | Placeholders in navigation |

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
