# HazardOS

**The Operating System for Environmental Remediation Companies**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1.18-38bdf8)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-4.0.18-729B1B)](https://vitest.dev/)
[![Test Coverage](https://img.shields.io/badge/Coverage-60%25-yellow)](https://vitest.dev/)

Mobile-first business management platform for asbestos, mold, lead paint, and hazardous material abatement services.

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

3. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up the database:**
   
   **Using Supabase CLI (Recommended)**
   ```bash
   # Apply all migrations
   .\supabase.exe db push
   
   # Check migration status
   .\supabase.exe db status
   ```
   
   **Manual Setup** (if CLI not available)
   - Copy/paste SQL from `supabase/migrations/` files into Supabase Dashboard
   - See [Migration Guide](./docs/MIGRATION-GUIDE.md) for detailed instructions

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open [http://localhost:3000](http://localhost:3000)**

## 📱 Mobile Testing

The app is built mobile-first. To test on your phone:

1. **Get your local IP:** `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. **Visit `http://YOUR_IP:3000` from your phone**
3. **Or use ngrok:** `npx ngrok http 3000`

## 🏗️ Project Structure

```
hazardos/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Main application
│   │   ├── site-surveys/  # Site survey management
│   │   ├── customers/     # Customer management
│   │   ├── database-status/ # DB verification tools
│   │   └── layout.tsx     # Dashboard layout
│   ├── (platform)/       # Platform admin
│   └── api/               # API routes
│       ├── customers/     # Customer CRUD API
│       └── proposals/     # PDF generation
├── components/            # React components
│   ├── assessments/       # Site survey forms & media upload
│   ├── customers/         # Customer management components
│   ├── surveys/           # Mobile survey wizard components
│   ├── auth/             # Authentication forms
│   ├── layout/           # Navigation & headers
│   ├── proposals/        # PDF proposal generation
│   └── ui/               # Base UI components (shadcn/ui)
├── lib/                  # Utilities & services
│   ├── supabase/         # Database clients & services
│   ├── hooks/            # Custom React hooks
│   ├── pdf/              # PDF templates
│   └── validations/      # Zod schemas
├── supabase/             # Database migrations
│   ├── migrations/       # Timestamped SQL migrations
│   └── config.toml       # Supabase configuration
├── types/                # TypeScript type definitions
├── docs/                 # Project documentation
└── public/               # Static assets & PWA files
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript 5.9 (strict mode) |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth |
| **State Management** | Zustand, TanStack Query |
| **Forms** | React Hook Form + Zod |
| **UI Components** | Tailwind CSS 4, Radix UI, shadcn/ui |
| **PDF Generation** | @react-pdf/renderer |
| **PWA** | next-pwa |
| **Deployment** | Vercel |

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

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
npm run pre-commit   # Run all quality checks (TS + Lint + Build)
npm run check-all    # Alias for pre-commit
```

### Code Quality

- **TypeScript**: Strict mode enabled - no `any` types allowed
- **ESLint**: Flat config with Next.js rules - zero errors required
- **Build Verification**: Production build must succeed before commits
- **Pre-commit Requirements**: All code must pass TS + Lint + Build checks

#### Pre-Commit Workflow
```bash
# Required before every commit
npm run pre-commit   # Runs type-check + lint + build

# Or run individually
npm run type-check   # TypeScript validation
npm run lint         # ESLint validation  
npm run build        # Production build test

# Helper scripts available
./scripts/pre-commit-check.ps1  # Windows PowerShell
./scripts/pre-commit-check.sh   # Unix/Linux/macOS
```

### Testing Standards

**Test Quality Requirements:**
- **Simple**: Easy to understand and maintain
- **Non-Flaky**: Reliable and deterministic results
- **Useful**: Test real behavior and business logic
- **Minimal Mocking**: Mock only external dependencies (APIs, databases)

**Testing Approach:**
- Integration tests preferred over unit tests
- Test user workflows and real scenarios
- Use real test data when possible
- Focus on mobile-first functionality

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

## 📚 Documentation

### 🚀 Getting Started
- **[Development Guide](./docs/DEVELOPMENT.md)** - Complete setup and development workflow
- **[Migration Guide](./docs/MIGRATION-GUIDE.md)** - Database setup and migrations
- **[Testing Guide](./docs/TESTING.md)** - Comprehensive testing documentation

### 📋 Product & Business
- **[Project Overview](./docs/HazardOS-Project-Overview.md)** - Vision, goals, and business model
- **[Product Requirements](./docs/HazardOS-PRD.md)** - Detailed feature specifications
- **[Features Documentation](./docs/FEATURES.md)** - Complete feature reference
- **[Business Logic](./docs/BUSINESS-LOGIC.md)** - Complex workflows and calculations

### 🏗️ Technical
- **[API Reference](./docs/API-REFERENCE.md)** - Complete REST API documentation
- **[Architecture Guide](./docs/architecture.md)** - System architecture and design decisions
- **[Security Documentation](./docs/SECURITY.md)** - Security architecture and best practices
- **[Multi-Tenant Setup](./docs/MULTI_TENANT_SETUP.md)** - Architecture and configuration

### 📊 Project Management
- **[Project Status](./docs/PROJECT-STATUS.md)** - Current development status and roadmap
- **[Changelog](./docs/CHANGELOG.md)** - Version history and release notes

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

**HazardOS** - Transforming how environmental remediation companies manage their business, one site survey at a time. 🏗️✨