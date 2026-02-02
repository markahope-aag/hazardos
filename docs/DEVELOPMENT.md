# HazardOS Development Guide

**Complete guide for developers working on HazardOS**

> **Last Updated**: February 1, 2026
> **For Developers**: Setup, workflows, standards, and best practices

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Environment](#development-environment)
3. [Code Standards](#code-standards)
4. [Testing](#testing)
5. [Database Development](#database-development)
6. [API Development](#api-development)
7. [Component Development](#component-development)
8. [Git Workflow](#git-workflow)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

**Required**:
- Node.js 18+ (LTS recommended)
- npm or pnpm (pnpm recommended for faster installs)
- Git
- VS Code or similar code editor

**Recommended**:
- Supabase CLI (`npm install -g supabase`)
- GitHub Desktop or Git CLI familiarity
- PostgreSQL client (for database inspection)

### Initial Setup

#### 1. Clone Repository

```bash
git clone https://github.com/markahope-aag/hazardos.git
cd hazardos
```

#### 2. Install Dependencies

```bash
# Using npm
npm install

# Using pnpm (recommended)
pnpm install
```

#### 3. Environment Variables

```bash
# Copy example environment file
cp .env.example .env.local
```

Edit `.env.local` and add your credentials:

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://inzwwbbbdookxkkotbxj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# App URL (Required)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Rate Limiting (Optional - for testing rate limits)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# QuickBooks Integration (Optional)
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/integrations/quickbooks/callback
```

**Getting Supabase Credentials**:
1. Go to [supabase.com](https://supabase.com)
2. Open your project: `inzwwbbbdookxkkotbxj`
3. Settings → API
4. Copy `URL` and `anon public` key

#### 4. Database Setup

**Option A: Using Supabase CLI (Recommended)**

```bash
# Login to Supabase
supabase login

# Link to project
supabase link --project-ref inzwwbbbdookxkkotbxj

# Push migrations
supabase db push

# Verify migrations
supabase db status
```

**Option B: Manual SQL Execution**

1. Go to Supabase Dashboard → SQL Editor
2. Run migrations from `supabase/migrations/` in order
3. Verify tables created successfully

#### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

#### 6. Login

**Platform Owner Account**:
- Email: `mark.hope@asymmetric.pro`
- Password: (Contact admin for credentials)

---

## Development Environment

### VS Code Extensions (Recommended)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "Prisma.prisma",
    "supabase.supabase"
  ]
}
```

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

### File Structure

```
hazardos/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication routes
│   ├── (dashboard)/       # Main application (authenticated)
│   ├── (platform)/        # Platform admin
│   ├── (public)/          # Public routes
│   └── api/               # API routes
│
├── components/            # React components
│   ├── ui/               # Base UI components (shadcn/ui)
│   ├── layout/           # Layout components
│   ├── customers/        # Feature-specific components
│   ├── surveys/
│   └── ...
│
├── lib/                  # Utilities & services
│   ├── supabase/        # Database clients
│   ├── services/        # Business logic
│   ├── hooks/           # Custom React hooks
│   ├── stores/          # Global state (Zustand)
│   ├── middleware/      # Request middleware
│   └── utils/           # Utility functions
│
├── types/               # TypeScript type definitions
├── supabase/           # Database migrations
├── docs/               # Documentation
├── test/               # Test files
└── public/             # Static assets
```

---

## Code Standards

### TypeScript

**Strict Mode Enabled**:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true
  }
}
```

**Guidelines**:
- ✅ Use explicit types for function parameters and return values
- ✅ Use interfaces for object shapes
- ✅ Use type unions for enums when appropriate
- ❌ Avoid `any` type (use `unknown` if necessary)
- ❌ Avoid type assertions unless absolutely necessary

**Example**:
```typescript
// ✅ Good
interface Customer {
  id: string
  name: string
  email: string | null
}

function createCustomer(data: Omit<Customer, 'id'>): Promise<Customer> {
  // implementation
}

// ❌ Bad
function createCustomer(data: any): any {
  // implementation
}
```

### React Components

**Component Structure**:
```typescript
'use client'  // Only if using client features

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  customerId: string
  onSave: (customer: Customer) => void
}

export default function CustomerForm({ customerId, onSave }: Props) {
  const [loading, setLoading] = useState(false)

  // Handlers
  const handleSubmit = async (data: FormData) => {
    setLoading(true)
    try {
      // logic
      onSave(customer)
    } catch (error) {
      console.error('Failed to save customer:', error)
    } finally {
      setLoading(false)
    }
  }

  // Render
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  )
}
```

**Naming Conventions**:
- Components: `PascalCase` (CustomerForm.tsx)
- Utilities: `camelCase` (formatDate.ts)
- Constants: `UPPER_SNAKE_CASE` (API_BASE_URL)
- Hooks: `use` prefix (useCustomers.ts)
- Types: `PascalCase` (Customer, CustomerInput)

### ESLint

**Run Linter**:
```bash
npm run lint
```

**Auto-fix**:
```bash
npm run lint -- --fix
```

**Rules**:
- No unused variables
- No console.log in production code (use logger)
- Consistent quotes (single quotes)
- Semi-colons required
- Proper import order

### Code Comments

**When to Comment**:
- Complex business logic
- Non-obvious workarounds
- TODO items with context
- API integration details

**Example**:
```typescript
// Calculate NPS score: (% Promoters) - (% Detractors)
// Promoters: 9-10, Passives: 7-8, Detractors: 0-6
const npsScore = (promoters / total * 100) - (detractors / total * 100)

// TODO: Add caching for frequently accessed customers
// Context: Customer list API called ~50 times/min during peak
const customers = await fetchCustomers()
```

---

## Testing

### Test Structure

```
test/
├── api/                  # API route tests
│   ├── customers.test.ts
│   ├── jobs.test.ts
│   └── ...
├── components/           # Component tests
│   ├── CustomerForm.test.tsx
│   └── ...
├── services/             # Service tests
│   ├── estimate-calculator.test.ts
│   └── ...
└── utils/                # Utility tests
    └── formatters.test.ts
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

### Writing Tests

**API Route Test Example**:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/customers/route'

describe('GET /api/customers', () => {
  it('returns customers for authenticated user', async () => {
    // Mock Supabase client
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1', name: 'Test Customer' }],
          error: null
        })
      })
    }

    const response = await GET(new Request('http://localhost/api/customers'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.customers).toHaveLength(1)
  })

  it('returns 401 for unauthenticated users', async () => {
    // Test implementation
  })
})
```

**Component Test Example**:
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import CustomerForm from '@/components/customers/customer-form'

describe('CustomerForm', () => {
  it('renders form fields', () => {
    render(<CustomerForm onSave={vi.fn()} />)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('calls onSave with form data', async () => {
    const onSave = vi.fn()
    render(<CustomerForm onSave={onSave} />)

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Test Customer' }
    })
    fireEvent.submit(screen.getByRole('button', { name: /save/i }))

    expect(onSave).toHaveBeenCalledWith({
      name: 'Test Customer',
      // ...
    })
  })
})
```

### Test Standards

**Requirements**:
- ✅ All API routes must have tests
- ✅ Critical business logic must be tested
- ✅ Tests must be deterministic (no flaky tests)
- ✅ Mock external dependencies (APIs, databases)
- ✅ Test edge cases and error handling

**Coverage Goals**:
- API Routes: 90%+
- Services: 85%+
- Components: 70%+
- Utilities: 95%+

---

## Database Development

### Creating Migrations

```bash
# Create new migration
supabase migration new descriptive_migration_name

# Example
supabase migration new add_job_completion_tables
```

This creates a file: `supabase/migrations/[timestamp]_descriptive_migration_name.sql`

### Migration Template

```sql
-- ============================================
-- FEATURE NAME
-- Description of what this migration does
-- ============================================

-- Create table
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Columns
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_table_name_org ON table_name(organization_id);
CREATE INDEX IF NOT EXISTS idx_table_name_status ON table_name(status);

-- RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can access their org data" ON table_name;
CREATE POLICY "Users can access their org data"
  ON table_name FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- Triggers
CREATE OR REPLACE FUNCTION update_table_name_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS table_name_updated_at ON table_name;
CREATE TRIGGER table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION update_table_name_updated_at();
```

### Applying Migrations

```bash
# Apply all pending migrations
supabase db push

# Check migration status
supabase db status

# Reset database (DANGER - deletes all data)
supabase db reset
```

### Database Best Practices

**Guidelines**:
- ✅ Always include `IF NOT EXISTS` for safety
- ✅ Include `organization_id` on all tenant tables
- ✅ Create indexes on foreign keys
- ✅ Enable RLS on all tables
- ✅ Use TIMESTAMPTZ for all timestamps
- ✅ Use UUID for all primary keys
- ❌ Never delete migrations that have been deployed
- ❌ Never modify deployed migrations (create new ones)

---

## API Development

### Creating API Routes

**File Location**: `app/api/[endpoint]/route.ts`

**Template**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { secureErrorHandler } from '@/lib/utils/secure-error-handler'

// Input validation schema
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
})

// GET /api/endpoint
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Query data (RLS automatically filters by organization)
    const { data, error } = await supabase
      .from('table_name')
      .select('*')

    if (error) throw error

    return NextResponse.json({ data })
  } catch (error) {
    return secureErrorHandler(error, 'Failed to fetch data')
  }
}

// POST /api/endpoint
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate input
    const body = await request.json()
    const validatedData = createSchema.parse(body)

    // Insert data
    const { data, error } = await supabase
      .from('table_name')
      .insert(validatedData)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }
    return secureErrorHandler(error, 'Failed to create record')
  }
}
```

### API Standards

**Requirements**:
- ✅ Authentication check on all protected endpoints
- ✅ Input validation using Zod schemas
- ✅ Secure error handling (no internal details exposed)
- ✅ Rate limiting for sensitive endpoints
- ✅ Proper HTTP status codes
- ✅ Consistent response format

**Response Format**:
```typescript
// Success
{
  data: T | T[],
  pagination?: {
    total: number,
    page: number,
    limit: number,
    pages: number
  }
}

// Error
{
  error: string,
  details?: any
}
```

---

## Component Development

### shadcn/ui Components

**Adding New Components**:
```bash
npx shadcn-ui@latest add [component-name]

# Examples
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
npx shadcn-ui@latest add table
```

Components are added to `components/ui/`

### Custom Components

**Creating a Feature Component**:

```typescript
// components/customers/CustomerCard.tsx
'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Customer } from '@/types/database'

interface Props {
  customer: Customer
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

export default function CustomerCard({ customer, onEdit, onDelete }: Props) {
  return (
    <Card className="p-4">
      <h3 className="font-semibold">{customer.name}</h3>
      <p className="text-sm text-gray-600">{customer.email}</p>

      <div className="mt-4 flex gap-2">
        <Button onClick={() => onEdit(customer.id)} variant="outline">
          Edit
        </Button>
        <Button onClick={() => onDelete(customer.id)} variant="destructive">
          Delete
        </Button>
      </div>
    </Card>
  )
}
```

### Tailwind CSS

**Utility-First Approach**:
```typescript
// ✅ Good - Use utility classes
<div className="flex items-center gap-4 p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-2xl font-bold">Title</h2>
</div>

// ❌ Avoid - Custom CSS
<div className="custom-container">
  <h2 className="custom-title">Title</h2>
</div>
```

**Responsive Design**:
```typescript
<div className="
  w-full
  md:w-1/2
  lg:w-1/3
  p-4
  md:p-6
  lg:p-8
">
  Mobile-first responsive content
</div>
```

---

## Git Workflow

### Branch Strategy

```
main            # Production branch
  ↓
feature/xxx    # Feature branches
bugfix/xxx     # Bug fix branches
hotfix/xxx     # Emergency fixes
```

### Creating Feature Branch

```bash
# Create and switch to feature branch
git checkout -b feature/add-job-completion

# Work on feature...
git add .
git commit -m "feat: Add job completion tracking"

# Push to remote
git push origin feature/add-job-completion
```

### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:
```bash
git commit -m "feat: Add customer feedback system"
git commit -m "fix: Resolve authentication redirect loop"
git commit -m "docs: Update API reference with new endpoints"
git commit -m "refactor: Extract estimate calculation to service"
```

### Pre-Commit Checklist

Before committing:

```bash
# 1. Type check
npm run type-check

# 2. Lint
npm run lint

# 3. Run tests
npm run test:run

# 4. Test build
npm run build
```

Or use the combined command:
```bash
npm run check-all
```

---

## Deployment

### Vercel Deployment

**Automatic Deployment**:
- Push to `main` branch
- Vercel detects change
- Builds and deploys automatically
- Available at https://hazardos.app

**Manual Deployment**:
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Deploy to production
vercel --prod
```

### Environment Variables

**Production Variables** (Set in Vercel Dashboard):
```
NEXT_PUBLIC_SUPABASE_URL=https://inzwwbbbdookxkkotbxj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[production-key]
NEXT_PUBLIC_APP_URL=https://hazardos.app
UPSTASH_REDIS_REST_URL=[redis-url]
UPSTASH_REDIS_REST_TOKEN=[redis-token]
```

### Deployment Checklist

- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] ESLint shows no errors
- [ ] Production build succeeds
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Documentation updated
- [ ] Changelog updated (if applicable)

---

## Troubleshooting

### Common Issues

#### Build Errors

**Issue**: TypeScript compilation errors
```bash
# Check errors
npm run type-check

# Fix imports, type mismatches
```

**Issue**: Module not found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Database Issues

**Issue**: Migration fails
```bash
# Check migration status
supabase db status

# View migration history
supabase db migrations list

# Reset if needed (DANGER - deletes data)
supabase db reset
```

**Issue**: RLS policy blocking queries
- Check if user is authenticated
- Verify `get_user_organization_id()` returns correct value
- Check policy conditions in Supabase Dashboard

#### Development Server Issues

**Issue**: Hot reload not working
```bash
# Restart dev server
# Sometimes Next.js cache gets corrupted
rm -rf .next
npm run dev
```

**Issue**: Environment variables not loading
- Restart dev server after changing `.env.local`
- Verify variable names start with `NEXT_PUBLIC_` for client-side access
- Check for typos in variable names

### Getting Help

1. **Check Documentation**: docs/ folder
2. **Search Codebase**: Look for similar implementations
3. **Check Git History**: `git log --grep="keyword"`
4. **Ask Team**: Contact mark.hope@asymmetric.pro

---

## Resources

### Official Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [React Docs](https://react.dev)
- [TypeScript Docs](https://www.typescriptlang.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Supabase Docs](https://supabase.com/docs)

### Internal Documentation
- [Architecture](./architecture.md)
- [API Reference](./API-REFERENCE.md)
- [Features](./FEATURES.md)
- [Database Schema](./MIGRATION-GUIDE.md)

### Tools
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [GitHub Repository](https://github.com/markahope-aag/hazardos)

---

**Happy Coding!** 🚀
