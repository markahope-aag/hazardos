# HazardOS

**The Operating System for Environmental Remediation Companies**

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8)](https://tailwindcss.com/)

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
│   │   ├── database-status/ # DB verification tools
│   │   └── layout.tsx     # Dashboard layout
│   ├── (platform)/       # Platform admin
│   └── api/               # API routes
├── components/            # React components
│   ├── assessments/       # Site survey forms & media upload
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

### ✅ Implemented
- **Multi-tenant authentication** with organization isolation
- **Site Survey forms** (formerly assessments) with mobile-optimized UI
- **Photo/Video upload** with client-side compression
- **PDF proposal generation** with professional templates
- **Database verification tools** for migration status
- **Responsive design** optimized for mobile field use
- **PWA support** for offline functionality

### 🚧 In Development
- Advanced scheduling system
- Equipment & materials catalog
- Job tracking & completion
- Pattern learning (Ralph Wiggum Loop)
- API integrations

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
- `organizations` - Multi-tenant company data
- `profiles` - User profiles with roles
- `site_surveys` - Field assessment data (renamed from assessments)
- `site_survey_photos` - Media files with metadata
- `estimates` - Cost calculations
- `jobs` - Project tracking

See [Migration Guide](./docs/MIGRATION-GUIDE.md) for complete database setup.

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
```

### Code Quality

- **TypeScript**: Strict mode enabled
- **ESLint**: Flat config with Next.js rules
- **Prettier**: Code formatting (via ESLint)
- **Pre-commit hooks**: Type checking, linting, build verification

### Testing Database Changes

Visit `/database-status` to verify:
- Migration completion status
- Table structure integrity
- RLS policy functionality
- Storage configuration

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

- **[Project Overview](./docs/HazardOS-Project-Overview.md)** - Vision, goals, and business model
- **[Product Requirements](./docs/HazardOS-PRD.md)** - Detailed feature specifications
- **[Migration Guide](./docs/MIGRATION-GUIDE.md)** - Database setup and migrations
- **[Multi-Tenant Setup](./docs/MULTI_TENANT_SETUP.md)** - Architecture and configuration
- **[Site Survey UI Spec](./docs/hazardos-site-survey-ui-spec.md)** - Mobile form design
- **[Database Setup Checklist](./docs/DATABASE-SETUP-CHECKLIST.md)** - Verification steps

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