# HazardOS

**The Operating System for Environmental Remediation Companies**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.18-38bdf8)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-4.0.18-729B1B)](https://vitest.dev/)
[![Test Coverage](https://img.shields.io/badge/Coverage-75%25-green)](https://vitest.dev/)
[![Security Status](https://img.shields.io/badge/Security-23_Vulnerabilities-red)](https://github.com/advisories)
[![Performance](https://img.shields.io/badge/Performance-B--Grade-orange)](docs/PERFORMANCE-OPTIMIZATION-GUIDE.md)

Mobile-first business management platform for asbestos, mold, lead paint, and hazardous material abatement services.

> **⚠️ SECURITY ALERT**: 23 dependency vulnerabilities identified (1 critical). Run `npm audit fix` immediately.  
> **📊 AUDIT STATUS**: Comprehensive codebase audit completed April 7, 2026. See [Audit Report](docs/CODEBASE-AUDIT-2026-04-07.md).

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Supabase account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/markahope-aag/hazardos.git
   cd hazardos
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **SECURITY CHECK (CRITICAL):**
   ```bash
   # Check for vulnerabilities (23 found in audit)
   npm audit
   
   # Fix critical vulnerabilities immediately
   npm audit fix
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Set up the database:**
   
   **Using Supabase CLI (Recommended)**
   ```bash
   # Apply all migrations (57 files with security fixes)
   .\supabase.exe db push
   
   # Check migration status - should show all applied
   .\supabase.exe db status
   
   # Verify RLS policies are working
   .\supabase.exe db diff
   ```
   
   **Manual Setup** (if CLI not available)
   - ⚠️ **Important**: Apply migrations in chronological order
   - Copy/paste SQL from `supabase/migrations/` files into Supabase Dashboard
   - Key security migrations: `20260401000006_fix_rls_function_search_path.sql`
   - See [Migration Guide](./docs/MIGRATION-GUIDE.md) for detailed instructions

6. **Run the development server:**
   ```bash
   # Start with Next.js 16 Turbopack
   npm run dev
   ```

7. **Open [http://localhost:3000](http://localhost:3000)**

8. **Verify setup:**
   - Visit `/database-status` to verify migrations and RLS
   - Check browser console for errors
   - Test login with platform owner account

## 📱 Mobile Testing

The app is built mobile-first. To test on your phone:

1. **Get your local IP:** `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. **Visit `http://YOUR_IP:3000` from your phone**
3. **Or use ngrok:** `npx ngrok http 3000`

## 🏗️ Project Structure (Updated)

```
hazardos/
├── proxy.ts              # Next.js 16 proxy (replaces middleware.ts)
├── app/                  # Next.js App Router
│   ├── (auth)/          # Authentication pages
│   ├── (dashboard)/     # Main application
│   │   ├── crm/         # CRM Hub (Primary Navigation)
│   │   │   ├── contacts/    # Contact management
│   │   │   ├── companies/   # Company accounts  
│   │   │   ├── opportunities/ # Sales pipeline
│   │   │   ├── pipeline/    # Kanban board
│   │   │   └── jobs/        # Jobs within CRM
│   │   ├── site-surveys/    # Mobile survey wizard
│   │   ├── customers/       # Legacy customer routes
│   │   ├── database-status/ # DB verification tools
│   │   └── layout.tsx       # Dashboard layout
│   ├── (platform)/         # Platform admin
│   └── api/                 # API routes
│       ├── v1/              # Public API (API key auth)
│       ├── customers/       # Customer CRUD API
│       ├── companies/       # Company CRUD API
│       ├── opportunities/   # Sales pipeline API
│       ├── webhooks/        # Webhook handlers
│       ├── cron/            # Scheduled tasks
│       └── proposals/       # PDF generation
├── components/              # React components
│   ├── ui/                 # Base UI components (shadcn/ui)
│   ├── layout/             # Navigation & headers
│   ├── customers/          # Customer management components
│   ├── companies/          # Company management components
│   ├── pipeline/           # Sales pipeline components
│   ├── surveys/            # Mobile survey wizard components
│   ├── auth/               # Authentication forms
│   └── assessments/        # Site survey forms & media upload
├── lib/                    # Utilities & services
│   ├── supabase/          # Database clients & services
│   ├── services/          # Business logic services (~40 services)
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Global state (Zustand)
│   ├── middleware/        # Request middleware
│   ├── utils/             # Utility functions
│   └── validations/       # Zod schemas
├── supabase/              # Database migrations
│   ├── migrations/        # 57 SQL migration files
│   └── config.toml        # Supabase configuration
├── types/                 # TypeScript type definitions
├── test/                  # Test files (399 test files)
├── docs/                  # Project documentation (68 files)
└── public/                # Static assets & PWA files
```

## 🛠️ Tech Stack (Updated)

| Layer | Technology | Version | Status |
|-------|------------|---------|--------|
| **Framework** | Next.js | 16.1.6 | ✅ Latest |
| **Language** | TypeScript | 5.9.3 | ✅ Strict Mode |
| **Database** | Supabase (PostgreSQL) | 2.93.3 | ✅ Current |
| **Authentication** | Supabase Auth | 2.93.3 | ✅ Current |
| **State Management** | Zustand, TanStack Query | 5.0.10, 5.90.20 | ✅ Current |
| **Forms** | React Hook Form + Zod | 7.71.1, 4.3.6 | ✅ Current |
| **UI Components** | Tailwind CSS 4, Radix UI, shadcn/ui | 4.1.18 | ✅ Latest |
| **PWA** | @serwist/next | 9.5.6 | ✅ Updated |
| **Payments** | Stripe | 20.3.0 | ✅ Current |
| **SMS** | Twilio | 5.12.0 | ✅ Current |
| **Email** | Resend | 6.9.1 | ✅ Current |
| **Deployment** | Vercel | Latest | ✅ Production |

### ⚠️ Security Status
- **23 dependency vulnerabilities** (1 critical, 13 high severity)
- **Action Required**: Run `npm audit fix` immediately
- **Critical**: jsPDF (RCE), axios (DoS), Next.js (CSRF bypass)

## 🏢 Multi-Tenant Architecture

HazardOS is built as a multi-tenant SaaS platform:

- **Organizations**: Each company is a separate tenant
- **Row Level Security (RLS)**: Database-level data isolation
- **Role-Based Access**: Admin, Estimator, Technician, Viewer roles
- **Platform Administration**: Super-admin interface for managing tenants

### Platform Owner Setup

The platform owner (Mark Hope, mark.hope@asymmetric.pro) has super-admin access to:
- Manage all organizations
- View system-wide analytics
- Configure platform settings
- Access tenant administration tools

## 📋 Key Features

### ✅ Production Ready Features
- **Multi-tenant SaaS Platform** with Stripe billing and feature gating
- **Complete CRM** with customer management and multiple contacts
- **Mobile Site Survey System** with offline support and photo upload
- **Estimate & Proposal System** with PDF generation and e-signature
- **Job Management & Scheduling** with calendar interface
- **Job Completion Tracking** with time entries, materials, and variance analysis
- **Invoice Management** with QuickBooks integration
- **Customer Feedback System** with NPS scoring and testimonials
- **SMS Communications** with Twilio integration and TCPA compliance
- **Advanced Reporting** with Excel/CSV export capabilities
- **Sales Pipeline Management** with Kanban board and drag-and-drop
- **Commission Tracking** with automated calculations and approval workflows
- **Two-Level Approval System** for estimates and proposals
- **Win/Loss Analysis** with competitor intelligence
- **Activity Logging** with comprehensive audit trail
- **PWA Support** with offline functionality
- **Comprehensive Testing** with 1,800+ test cases and 60% coverage

### 🚧 In Development
- Component testing suite expansion (target: 70% coverage)
- E2E test workflows for critical user journeys
- Mobile native apps (iOS/Android)
- Advanced AI features for estimate accuracy
- Equipment tracking and maintenance scheduling

## 🗄️ Database

### Migration System

We use proper Supabase CLI migrations for version control:

```bash
# Create new migration
.\supabase.exe migration new descriptive_name

# Apply all pending migrations
.\supabase.exe db push

# Check migration status
.\supabase.exe db status
```

**Migration Location**: All migrations are stored in `/supabase/migrations/` with timestamp-based naming.

### Key Tables
- `organizations` - Multi-tenant company data with subscription management
- `profiles` - User profiles with roles and permissions
- `customers` - Customer management with contact info and relationship tracking
- `customer_contacts` - Multiple contacts per customer with role-based organization
- `site_surveys` - Field assessment data (renamed from assessments)
- `site_survey_photos` - Media files with metadata and GPS coordinates
- `estimates` - Cost calculations with line items and approval workflow
- `proposals` - PDF proposals with e-signature capability
- `jobs` - Complete job management with scheduling and crew assignment
- `job_completions` - Time entries, material usage, photos, and checklists
- `invoices` - Invoice management with payment tracking
- `opportunities` - Sales pipeline with stage management
- `commissions` - Commission tracking with automated calculations
- `feedback_surveys` - Customer feedback with NPS scoring
- `sms_messages` - SMS communication audit trail
- `activity_log` - Comprehensive audit trail of all actions
- `pricing_settings` - Organization-specific markup and pricing rules
- `labor_rates`, `equipment_rates`, `material_costs`, `disposal_fees`, `travel_rates` - Pricing tables

See [Migration Guide](./docs/MIGRATION-GUIDE.md) for complete database setup.

## 🔧 Development

### Available Scripts (Enhanced)

```bash
npm run dev          # Start development server (with Turbopack)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
npm run test         # Run test suite (399 test files)
npm run test:coverage # Run tests with coverage report
npm audit           # Check for security vulnerabilities (CRITICAL)
npm run pre-commit   # Run all quality checks (TS + Lint + Test + Build + Audit)
npm run check-all    # Alias for pre-commit
```

### Code Quality (Post-Audit Standards)

- **TypeScript**: Strict mode enabled - no `any` types allowed
- **ESLint**: Flat config with Next.js rules - zero errors required
- **Security**: All dependencies must pass security audit
- **Testing**: New features require tests (target 75% coverage)
- **Build Verification**: Production build must succeed before commits
- **Pre-commit Requirements**: All code must pass TS + Lint + Test + Build + Audit checks

#### Critical Issues Identified in Audit
- **172 raw Supabase errors** - Use SecureError class instead
- **SQL injection risk** - Use sanitizeSearchQuery utility
- **Large component files** - Break down 800+ line components
- **N+1 query patterns** - Optimize database queries

#### Pre-Commit Workflow (Enhanced)
```bash
# REQUIRED before every commit (enhanced with security)
npm run pre-commit   # Runs type-check + lint + test + build + audit

# Or run individually
npm audit           # Security vulnerability check (CRITICAL)
npm run type-check   # TypeScript validation
npm run lint         # ESLint validation
npm run test:run     # Run test suite
npm run build        # Production build test

# Helper scripts available
./scripts/pre-commit-check.ps1  # Windows PowerShell
./scripts/pre-commit-check.sh   # Unix/Linux/macOS
```

### Testing Standards (Post-Audit)

**Current Testing Status:**
- **399 test files** with comprehensive coverage strategy
- **~75% overall coverage** (target: 85%)
- **API Routes**: 95% coverage ✅
- **Components**: 8% coverage ⚠️ (needs expansion)
- **Services**: 85% coverage ✅

**Test Quality Requirements:**
- **Simple**: Easy to understand and maintain
- **Non-Flaky**: Reliable and deterministic results
- **Useful**: Test real behavior and business logic
- **Minimal Mocking**: Mock only external dependencies (APIs, databases)
- **Security Testing**: All critical security paths tested
- **RLS Testing**: Multi-tenant isolation verified

**Critical Testing Gaps Identified:**
- **RLS Policy Testing**: Missing comprehensive Row Level Security tests
- **Component Testing**: Only 8% of components tested
- **E2E Testing**: No end-to-end test suite
- **Performance Testing**: Missing performance benchmarks

**Testing Approach:**
- Integration tests preferred over unit tests
- Test user workflows and real scenarios
- Use real test data when possible
- Focus on mobile-first functionality
- **NEW**: Comprehensive security testing
- **NEW**: Multi-tenant isolation testing

### Database Testing

Visit `/database-status` to verify:
- Migration completion status
- Table structure integrity
- RLS policy functionality
- Storage configuration

### Documentation Requirements

**Documentation must be updated after every code change:**
- Feature additions/changes → Update relevant `/docs/` files
- API changes → Update type definitions and interfaces
- Database changes → Update migration guides and schema docs
- Configuration changes → Update setup and environment docs
- Breaking changes → Update migration guides and notices

## 🚀 Deployment

### Automatic Deployment

Push to main branch triggers Vercel deployment:

```bash
git push origin main
```

### Environment Variables

Required in Vercel:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

### Production URLs
- **App**: https://hazardos.app
- **Repository**: https://github.com/markahope-aag/hazardos
- **Supabase**: https://inzwwbbbdookxkkotbxj.supabase.co

## 📚 Documentation (68 Files - 100% Current)

### 🚀 Getting Started
- **[Development Guide](./docs/DEVELOPMENT.md)** - Complete setup and development workflow (Updated post-audit)
- **[Migration Guide](./docs/MIGRATION-GUIDE.md)** - Database setup and migrations
- **[Testing Strategy Guide](./docs/TESTING-STRATEGY-GUIDE.md)** - Comprehensive testing documentation (NEW)

### 📋 Product & Business
- **[Project Overview](./docs/HazardOS-Project-Overview.md)** - Vision, goals, and business model
- **[Product Requirements](./docs/HazardOS-PRD.md)** - Detailed feature specifications
- **[Features Documentation](./docs/FEATURES.md)** - Complete feature reference
- **[Business Logic](./docs/BUSINESS-LOGIC.md)** - Complex workflows and calculations

### 🏗️ Technical (Updated Post-Audit)
- **[API Reference](./docs/API-REFERENCE.md)** - Complete REST API documentation (144 endpoints, 100% coverage)
- **[Architecture Guide](./docs/architecture.md)** - System architecture and design decisions (Updated April 2026)
- **[Security Audit Findings](./docs/SECURITY-AUDIT-FINDINGS.md)** - Security vulnerabilities and fixes (NEW)
- **[Performance Optimization Guide](./docs/PERFORMANCE-OPTIMIZATION-GUIDE.md)** - Performance improvements (NEW)
- **[Multi-Tenant Setup](./docs/MULTI_TENANT_SETUP.md)** - Architecture and configuration

### 📊 Project Management & Audit
- **[Comprehensive Codebase Audit](./docs/CODEBASE-AUDIT-2026-04-07.md)** - Complete audit report (NEW)
- **[Current Status Report](./docs/CURRENT-STATUS-FEB-2026.md)** - Latest project status
- **[Project Status](./docs/PROJECT-STATUS.md)** - Development roadmap
- **[Changelog](./docs/CHANGELOG.md)** - Version history and release notes

### 🔍 Quick Reference
- **[Documentation Index](./docs/DOCUMENTATION-INDEX.md)** - Complete documentation overview
- **[Quick API Reference](./docs/QUICK-API-REFERENCE.md)** - Fast API reference

## 🎯 Target Market

Mid-sized environmental remediation companies (10-50 employees) who are:
- Too big for spreadsheets and paper forms
- Too small for enterprise ERPs like ServiceTitan
- Looking for mobile-first solutions
- Want to retain institutional knowledge as experienced estimators retire

## 💰 Business Model

**SaaS Subscription Pricing:**
- **Starter**: $99/mo - 1 user, basic estimates & quotes
- **Professional**: $299/mo - 5 users, scheduling, pattern learning
- **Enterprise**: $799/mo - Unlimited users, API access, white-label

## 🤝 Contributing

This is a proprietary project by Asymmetric Marketing LLC. For development access:

1. Contact mark.hope@asymmetric.pro
2. Follow the development setup above
3. Create feature branches from `main`
4. Submit pull requests for review

## 📄 License

Proprietary - Asymmetric Marketing LLC

## 🆘 Support

- **Issues**: GitHub Issues for bug reports
- **Documentation**: Check `/docs` folder first
- **Contact**: mark.hope@asymmetric.pro

---

## 🎯 Current Status (Post-Audit)

**Overall Grade**: B+ (Very Good - Strong foundations with optimization opportunities)

### ✅ Strengths
- **Mature Architecture**: Excellent multi-tenant design with robust RLS implementation
- **Modern Tech Stack**: Latest versions of React 19, Next.js 16, TypeScript 5.9
- **Comprehensive Testing**: 399 test files with 75% overall coverage
- **Complete Feature Set**: 151 of 166 planned features complete (91%)
- **Production Ready**: Deployed and serving customers at https://hazardos.app

### ⚠️ Critical Issues (Immediate Action Required)
1. **23 Dependency Vulnerabilities** - Run `npm audit fix` immediately
2. **SQL Injection Risk** - Fix customer search endpoints
3. **Performance Bottlenecks** - Optimize survey store and auth hooks
4. **Testing Gaps** - Expand component and E2E testing coverage

### 📈 Improvement Roadmap
- **Week 1**: Fix critical security vulnerabilities
- **Week 2**: Optimize performance bottlenecks (52% LCP improvement expected)
- **Week 3**: Expand testing coverage to 85%
- **Week 4**: Implement monitoring and alerting

**Next Review**: July 1, 2026

---

**HazardOS** - Transforming how environmental remediation companies manage their business, one site survey at a time. 🏗️✨

*Built with ❤️ by Asymmetric Marketing LLC*