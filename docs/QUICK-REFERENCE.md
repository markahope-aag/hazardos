# HazardOS Quick Reference Guide

**Fast reference for common tasks and commands**

> **Last Updated**: February 1, 2026

---

## Development Commands

### Project Setup
```bash
# Clone repository
git clone https://github.com/markahope-aag/hazardos.git
cd hazardos

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Start development server
npm run dev
```

### Common Commands
```bash
# Development
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript compilation check
npm run check-all        # Run all checks (type + lint + test + build)

# Testing
npm run test             # Run tests (watch mode)
npm run test:run         # Run tests once
npm run test:coverage    # Generate coverage report
npm run test:ui          # Run tests with UI

# Database
supabase db push         # Apply migrations
supabase db status       # Check migration status
supabase migration new <name>  # Create new migration
```

---

## Database Quick Reference

### Creating a Migration

```bash
# Create migration file
supabase migration new add_feature_name

# Edit the generated file in supabase/migrations/

# Apply migration
supabase db push

# Verify
supabase db status
```

### Common SQL Patterns

**Create Table with RLS**:
```sql
-- Create table
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_table_name_org ON table_name(organization_id);

-- RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access their org data"
  ON table_name FOR ALL
  USING (organization_id = get_user_organization_id());

-- Updated trigger
CREATE OR REPLACE FUNCTION update_table_name_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER table_name_updated_at
  BEFORE UPDATE ON table_name
  FOR EACH ROW EXECUTE FUNCTION update_table_name_updated_at();
```

---

## API Development Quick Reference

### Create API Route

**File**: `app/api/endpoint/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
})

export async function GET(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('table_name')
    .select('*')

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const validated = schema.parse(body)

  const { data, error } = await supabase
    .from('table_name')
    .insert(validated)
    .select()
    .single()

  if (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}
```

---

## Component Development Quick Reference

### Server Component (Default)

```typescript
// app/(dashboard)/page.tsx
import { createServerClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = createServerClient()
  const { data } = await supabase.from('table_name').select('*')

  return (
    <div>
      {data?.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

### Client Component

```typescript
// components/FeatureComponent.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  initialData: Data[]
}

export default function FeatureComponent({ initialData }: Props) {
  const [data, setData] = useState(initialData)

  const handleAction = async () => {
    // client-side logic
  }

  return (
    <div>
      <Button onClick={handleAction}>Action</Button>
    </div>
  )
}
```

### Form with React Hook Form + Zod

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
})

type FormData = z.infer<typeof schema>

export default function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    // handle response
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('name')} />
      {form.formState.errors.name && (
        <span>{form.formState.errors.name.message}</span>
      )}

      <Input {...form.register('email')} type="email" />
      {form.formState.errors.email && (
        <span>{form.formState.errors.email.message}</span>
      )}

      <Button type="submit" disabled={form.formState.isSubmitting}>
        Submit
      </Button>
    </form>
  )
}
```

---

## Git Quick Reference

### Feature Development

```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes
git add .
git commit -m "feat: Add feature description"

# Push to remote
git push origin feature/feature-name

# Create PR on GitHub
```

### Commit Message Format

```bash
# Format: type(scope): description

# Examples
git commit -m "feat: Add job completion tracking"
git commit -m "fix: Resolve authentication bug"
git commit -m "docs: Update API reference"
git commit -m "refactor: Extract service logic"
git commit -m "test: Add customer API tests"
git commit -m "chore: Update dependencies"
```

### Common Git Tasks

```bash
# Update from main
git checkout main
git pull origin main
git checkout feature/my-feature
git merge main

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# View commit history
git log --oneline --graph

# View changes
git diff
git diff --staged
```

---

## Supabase Quick Reference

### Query Patterns

```typescript
import { createServerClient } from '@/lib/supabase/server'

const supabase = createServerClient()

// Select all
const { data } = await supabase.from('customers').select('*')

// Select specific columns
const { data } = await supabase
  .from('customers')
  .select('id, name, email')

// Filter
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(10)

// Insert
const { data } = await supabase
  .from('customers')
  .insert({ name: 'John Doe', email: 'john@example.com' })
  .select()
  .single()

// Update
const { data } = await supabase
  .from('customers')
  .update({ status: 'inactive' })
  .eq('id', customerId)
  .select()
  .single()

// Delete
const { error } = await supabase
  .from('customers')
  .delete()
  .eq('id', customerId)

// Join
const { data } = await supabase
  .from('jobs')
  .select(`
    *,
    customer:customers(id, name, email),
    estimate:estimates(*)
  `)
```

### Storage Operations

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload('path/filename.jpg', file)

// Get public URL
const { data } = supabase.storage
  .from('bucket-name')
  .getPublicUrl('path/filename.jpg')

// Download file
const { data, error } = await supabase.storage
  .from('bucket-name')
  .download('path/filename.jpg')

// Delete file
const { error } = await supabase.storage
  .from('bucket-name')
  .remove(['path/filename.jpg'])
```

---

## TypeScript Quick Reference

### Common Type Patterns

```typescript
// Database types (auto-generated)
import { Database } from '@/types/database'

type Customer = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']

// Component props
interface Props {
  customer: Customer
  onSave: (customer: Customer) => void
  onDelete?: (id: string) => void  // Optional
}

// API response
interface ApiResponse<T> {
  data?: T
  error?: string
  pagination?: {
    total: number
    page: number
    limit: number
  }
}

// Enums
type Status = 'draft' | 'submitted' | 'approved' | 'rejected'

// Utility types
type PartialCustomer = Partial<Customer>
type RequiredCustomer = Required<Customer>
type CustomerWithoutId = Omit<Customer, 'id'>
type CustomerIdAndName = Pick<Customer, 'id' | 'name'>
```

---

## Environment Variables

### Required Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://inzwwbbbdookxkkotbxj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional Variables

```env
# Rate Limiting
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token

# QuickBooks
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3000/api/integrations/quickbooks/callback
```

---

## Troubleshooting

### Development Server Issues

```bash
# Server won't start
rm -rf .next node_modules package-lock.json
npm install
npm run dev

# TypeScript errors
npm run type-check

# Environment variables not loading
# Restart dev server after .env.local changes
```

### Database Issues

```bash
# Migration fails
supabase db status  # Check what's applied
supabase db reset   # DANGER: Deletes all data

# Can't connect to database
# Check .env.local for correct credentials
# Verify network connection to Supabase
```

### Build Issues

```bash
# Build fails
npm run type-check  # Find TypeScript errors
npm run lint        # Find linting errors
rm -rf .next        # Clear build cache
npm run build       # Try again
```

---

## Useful Links

### Documentation
- [Architecture](./architecture.md)
- [API Reference](./API-REFERENCE.md)
- [Features](./FEATURES.md)
- [Development Guide](./DEVELOPMENT.md)

### External
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Dashboards
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [GitHub Repository](https://github.com/markahope-aag/hazardos)

---

## Contact

**Platform Owner**: Mark Hope
**Email**: mark.hope@asymmetric.pro
**GitHub**: @markahope-aag

---

**Last Updated**: February 1, 2026
