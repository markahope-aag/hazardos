# HazardOS Security Documentation

**Comprehensive security architecture and best practices for the HazardOS platform**

> **Last Updated**: February 1, 2026
> **Status**: Production Ready

---

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Authentication and Authorization](#authentication-and-authorization)
3. [Data Protection and Encryption](#data-protection-and-encryption)
4. [Rate Limiting](#rate-limiting)
5. [Secure Error Handling](#secure-error-handling)
6. [Input Validation and Sanitization](#input-validation-and-sanitization)
7. [OWASP Considerations](#owasp-considerations)
8. [Security Best Practices for Contributors](#security-best-practices-for-contributors)
9. [Incident Response Procedures](#incident-response-procedures)

---

## Security Architecture

### Defense in Depth

HazardOS implements multiple layers of security to protect user data and prevent unauthorized access:

```
┌────────────────────────────────────────────────────────┐
│              Layer 1: Network Security                 │
│  - HTTPS only in production                            │
│  - CORS configuration                                  │
│  - Security headers (HSTS, CSP, etc.)                  │
└────────────────┬───────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────┐
│          Layer 2: Application Security                 │
│  - Rate limiting (Redis/Memory)                        │
│  - Request size limits                                 │
│  - Timeout handling                                    │
└────────────────┬───────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────┐
│       Layer 3: Authentication & Authorization          │
│  - Supabase Auth (JWT tokens)                          │
│  - Role-based access control (RBAC)                    │
│  - Session management                                  │
└────────────────┬───────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────┐
│            Layer 4: Data Security                      │
│  - Row Level Security (RLS)                            │
│  - Multi-tenant isolation                              │
│  - Encrypted data at rest                              │
│  - Secure error handling                               │
└────────────────┬───────────────────────────────────────┘
                 │
┌────────────────▼───────────────────────────────────────┐
│          Layer 5: Input Validation                     │
│  - Zod schema validation                               │
│  - SQL injection prevention                            │
│  - XSS prevention                                      │
│  - CSRF protection                                     │
└────────────────────────────────────────────────────────┘
```

### Security Principles

1. **Least Privilege**: Users and services have only the permissions they need
2. **Zero Trust**: Verify every request, assume nothing is secure
3. **Defense in Depth**: Multiple security layers protect critical data
4. **Fail Secure**: Errors result in denied access, not granted access
5. **Secure by Default**: Security is built in, not added later

---

## Authentication and Authorization

### Supabase Authentication

HazardOS uses Supabase Auth for secure user authentication:

```typescript
// Client-side authentication
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure-password'
})

// Session stored in HTTP-only cookie
// JWT token automatically included in requests
```

**Authentication Features**:
- Password-based authentication
- JWT token-based sessions
- Automatic token refresh
- HTTP-only cookies for token storage
- Session expiration and timeout
- Password reset flow
- Email verification

### Multi-Tenant Architecture

**Tenant Isolation**:
- Each organization is a separate tenant
- `organization_id` on all tenant-scoped tables
- Row Level Security (RLS) enforces data isolation
- No cross-tenant data access possible

**Implementation**:
```sql
-- Example RLS policy for customers table
CREATE POLICY "Users can only access their organization's customers"
  ON customers
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- Helper function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;
```

### Role-Based Access Control (RBAC)

**Role Hierarchy**:

```
Platform Roles (Cross-Organization):
├── platform_owner       # Full system access
└── platform_admin       # Platform administration

Tenant Roles (Organization-Scoped):
├── tenant_owner         # Organization owner
├── admin                # Full organization access
├── estimator            # Create surveys, estimates, proposals
├── technician           # Execute jobs, time tracking
└── viewer               # Read-only access
```

**Permission Matrix**:

| Action | platform_owner | platform_admin | tenant_owner | admin | estimator | technician | viewer |
|--------|---------------|----------------|--------------|-------|-----------|------------|--------|
| View all organizations | ✓ | ✓ | - | - | - | - | - |
| Manage organization | ✓ | ✓ | ✓ | ✓ | - | - | - |
| Manage users | ✓ | ✓ | ✓ | ✓ | - | - | - |
| Create site surveys | ✓ | ✓ | ✓ | ✓ | ✓ | - | - |
| Create estimates | ✓ | ✓ | ✓ | ✓ | ✓ | - | - |
| View jobs | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Execute jobs | ✓ | ✓ | ✓ | ✓ | - | ✓ | - |
| Track time | ✓ | ✓ | ✓ | ✓ | - | ✓ | - |
| View reports | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**Implementation**:

```typescript
// lib/hooks/use-multi-tenant-auth.ts
export function useMultiTenantAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)

  // Fetch user, profile, and organization
  useEffect(() => {
    async function fetchUserData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profile?.organization_id) {
        const { data: org } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', profile.organization_id)
          .single()

        setOrganization(org)
      }

      setProfile(profile)
      setUser(user)
    }

    fetchUserData()
  }, [])

  return {
    user,
    profile,
    organization,
    isPlatformUser: profile?.is_platform_user ?? false,
    canAccessPlatformAdmin: ['platform_owner', 'platform_admin'].includes(profile?.role),
    canAccessTenantAdmin: ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'].includes(profile?.role)
  }
}

// Usage in components
const { profile, canAccessTenantAdmin } = useMultiTenantAuth()

if (!canAccessTenantAdmin) {
  return <Unauthorized />
}
```

### API Route Authentication

All API routes verify authentication:

```typescript
// app/api/customers/route.ts
export async function GET(request: NextRequest) {
  const supabase = createClient()

  // Verify authentication
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Get user's organization for data filtering
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // RLS automatically filters data by organization_id
  const { data: customers } = await supabase
    .from('customers')
    .select('*')

  return NextResponse.json({ customers })
}
```

---

## Data Protection and Encryption

### Data at Rest

**Database Encryption**:
- PostgreSQL transparent data encryption (TDE)
- AES-256 encryption for stored data
- Managed by Supabase infrastructure

**Storage Encryption**:
- All files encrypted at rest in Supabase Storage
- Client-side encryption available for sensitive documents
- Encryption keys managed by Supabase

### Data in Transit

**Transport Security**:
- HTTPS/TLS 1.3 required for all connections
- Certificate pinning for mobile apps
- Secure WebSocket connections for real-time features

**Configuration**:
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      }
    ]
  }
}
```

### Sensitive Data Handling

**Storage Policies**:
- RLS policies protect file access
- Signed URLs for temporary access
- Automatic expiration of temporary URLs

```typescript
// Generate signed URL for temporary access
const { data } = await supabase
  .storage
  .from('job-completion-photos')
  .createSignedUrl('path/to/photo.jpg', 3600) // 1 hour expiration
```

**Data Masking**:
- Credit card numbers: Display last 4 digits only
- SSN: Display last 4 digits only
- Passwords: Never logged or displayed
- API keys: Masked in logs and UI

### Row Level Security (RLS)

All tables have RLS enabled with policies:

```sql
-- Enable RLS on table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy for tenant isolation
CREATE POLICY "tenant_isolation" ON customers
  FOR ALL
  USING (organization_id = get_user_organization_id())
  WITH CHECK (organization_id = get_user_organization_id());

-- Policy for platform admins
CREATE POLICY "platform_admin_access" ON customers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('platform_owner', 'platform_admin')
    )
  );
```

**RLS Testing**:
```typescript
// Test RLS is working
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('organization_id', 'other-org-id') // Should return empty

if (data?.length === 0) {
  console.log('✓ RLS working correctly')
}
```

---

## Rate Limiting

### Implementation Strategy

HazardOS uses a dual-strategy approach:
1. **Redis-based rate limiting** (production, recommended)
2. **Memory-based rate limiting** (development, fallback)

### Redis Rate Limiting

**Configuration**:
```typescript
// lib/middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10s'),
  analytics: true,
})

export async function applyRateLimit(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success, limit, reset, remaining } = await ratelimit.limit(ip)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    )
  }

  return null
}
```

**Environment Variables**:
```env
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### Memory Rate Limiting

**Fallback Implementation**:
```typescript
// lib/middleware/memory-rate-limit.ts
interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

export async function applyMemoryRateLimit(
  request: NextRequest,
  type: 'general' | 'auth' | 'upload' = 'general'
) {
  const ip = request.ip ?? '127.0.0.1'
  const key = `${ip}:${type}`

  const limits = {
    general: { requests: 100, window: 60000 },  // 100/min
    auth: { requests: 10, window: 60000 },      // 10/min
    upload: { requests: 20, window: 60000 }     // 20/min
  }

  const { requests, window } = limits[type]
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + window })
    return null
  }

  if (entry.count >= requests) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  entry.count++
  return null
}
```

### Unified Rate Limiting

**Smart Selection**:
```typescript
// lib/middleware/unified-rate-limit.ts
const hasRedis = Boolean(
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
)

export async function applyUnifiedRateLimit(
  request: NextRequest,
  type: 'general' | 'auth' | 'upload' = 'general'
) {
  if (hasRedis) {
    try {
      return await applyRateLimit(request, type)
    } catch {
      // Fall back to memory if Redis fails
      return await applyMemoryRateLimit(request, type)
    }
  }

  return await applyMemoryRateLimit(request, type)
}

// Middleware wrapper for easy use
export function withUnifiedRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: 'general' | 'auth' | 'upload' = 'general'
) {
  return async (request: NextRequest) => {
    const rateLimitResponse = await applyUnifiedRateLimit(request, type)
    if (rateLimitResponse) return rateLimitResponse

    return handler(request)
  }
}
```

### Usage in API Routes

```typescript
// app/api/customers/route.ts
import { withUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

export const GET = withUnifiedRateLimit(async (request: NextRequest) => {
  // Your handler code
}, 'general')

export const POST = withUnifiedRateLimit(async (request: NextRequest) => {
  // Your handler code
}, 'general')

// app/api/auth/login/route.ts
export const POST = withUnifiedRateLimit(async (request: NextRequest) => {
  // Login handler
}, 'auth')

// app/api/photos/upload/route.ts
export const POST = withUnifiedRateLimit(async (request: NextRequest) => {
  // Upload handler
}, 'upload')
```

### Rate Limit Tiers

| Tier | Endpoint Type | Limit | Window | Use Case |
|------|---------------|-------|--------|----------|
| **general** | Most API routes | 1000 req | 1 hour | Standard API access |
| **auth** | Login, signup | 10 req | 1 minute | Prevent brute force |
| **upload** | File uploads | 20 req | 1 minute | Prevent abuse |
| **heavy** | PDF generation, reports | 5 req | 1 minute | Resource-intensive ops |

---

## Secure Error Handling

### Error Security Principles

1. **Never expose internal details** to clients
2. **Log full errors** server-side for debugging
3. **Use structured error types** for consistent handling
4. **Provide user-friendly messages** without technical jargon

### Implementation

**Secure Error Types**:
```typescript
// lib/utils/secure-error-handler.ts
export type SafeErrorType =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'BAD_REQUEST'

const SAFE_ERROR_MESSAGES: Record<SafeErrorType, string> = {
  VALIDATION_ERROR: 'The provided data is invalid',
  NOT_FOUND: 'The requested resource was not found',
  UNAUTHORIZED: 'Authentication is required',
  FORBIDDEN: 'You do not have permission to access this resource',
  RATE_LIMITED: 'Too many requests. Please try again later',
  CONFLICT: 'The resource already exists or conflicts with existing data',
  BAD_REQUEST: 'The request is invalid',
}

export class SecureError extends Error {
  public readonly type: SafeErrorType
  public readonly statusCode: number
  public readonly field?: string
  public readonly isSecureError = true

  constructor(type: SafeErrorType, message?: string, field?: string) {
    super(message || SAFE_ERROR_MESSAGES[type])
    this.type = type
    this.statusCode = STATUS_CODES[type]
    this.field = field
    this.name = 'SecureError'
  }
}
```

**Error Response Handler**:
```typescript
export function createSecureErrorResponse(error: unknown): NextResponse {
  // Log full error server-side (not exposed to client)
  console.error('API Error:', error)

  // Check if it's our secure error type
  if (error instanceof SecureError) {
    return NextResponse.json(
      { error: error.message, type: error.type, field: error.field },
      { status: error.statusCode }
    )
  }

  // Convert common errors to safe errors
  if (error && typeof error === 'object') {
    const errorObj = error as { message?: string; code?: string }

    // Supabase auth errors
    if (errorObj.message?.includes('JWT')) {
      return NextResponse.json(
        { error: SAFE_ERROR_MESSAGES.UNAUTHORIZED, type: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Database constraint errors
    if (errorObj.code === '23505') {
      return NextResponse.json(
        { error: SAFE_ERROR_MESSAGES.CONFLICT, type: 'CONFLICT' },
        { status: 409 }
      )
    }
  }

  // Generic error (no details exposed)
  return NextResponse.json(
    {
      error: 'An internal server error occurred',
      type: 'INTERNAL_ERROR',
      // In development, include more details
      ...(process.env.NODE_ENV === 'development' && {
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    },
    { status: 500 }
  )
}
```

**Usage in API Routes**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Throw secure errors
    if (!body.name) {
      throw new SecureError('VALIDATION_ERROR', 'Name is required', 'name')
    }

    // Business logic
    const result = await createCustomer(body)

    return NextResponse.json(result)
  } catch (error) {
    // All errors handled securely
    return createSecureErrorResponse(error)
  }
}
```

### Error Logging

**Server-Side Logging**:
```typescript
// Production error logging
if (process.env.NODE_ENV === 'production') {
  // Send to error tracking service (Sentry, LogRocket, etc.)
  Sentry.captureException(error, {
    extra: {
      userId: user?.id,
      organizationId: profile?.organization_id,
      endpoint: request.url,
      method: request.method,
    }
  })
}
```

**What Gets Logged**:
- Full error stack trace
- Request context (URL, method, headers)
- User and organization IDs
- Timestamp
- Environment

**What Never Gets Logged**:
- Passwords
- API keys
- Credit card numbers
- Social security numbers
- Other PII/sensitive data

---

## Input Validation and Sanitization

### Validation Strategy

All user input is validated using Zod schemas:

```typescript
// lib/validations/customer.ts
import { z } from 'zod'

export const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  company_name: z.string().max(200).optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable(),
  phone: z.string()
    .regex(/^[0-9\s\-\(\)]+$/, 'Invalid phone number')
    .optional()
    .nullable(),
  address_line1: z.string().max(200).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().length(2).optional().nullable(),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional().nullable(),
  status: z.enum(['lead', 'prospect', 'customer', 'inactive']),
  source: z.enum(['referral', 'website', 'advertising', 'cold_call', 'trade_show', 'other']).optional().nullable(),
  marketing_consent: z.boolean().default(false),
  notes: z.string().max(2000).optional().nullable(),
})

export type CustomerInput = z.infer<typeof customerSchema>
```

### API Route Validation

```typescript
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate with Zod
    const validatedData = customerSchema.parse(body)

    // validatedData is now type-safe and validated
    const result = await createCustomer(validatedData)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          type: 'VALIDATION_ERROR',
          details: error.errors
        },
        { status: 400 }
      )
    }

    return createSecureErrorResponse(error)
  }
}
```

### SQL Injection Prevention

**Parameterized Queries**:
All database queries use parameterized statements via Supabase client:

```typescript
// ✅ Safe - Parameterized query
const { data } = await supabase
  .from('customers')
  .select('*')
  .eq('id', userId)  // Automatically parameterized

// ❌ Unsafe - Never do this
const { data } = await supabase.raw(
  `SELECT * FROM customers WHERE id = '${userId}'`  // SQL injection risk!
)
```

### XSS Prevention

**Output Encoding**:
React automatically escapes output:

```typescript
// ✅ Safe - React escapes by default
<div>{customerName}</div>

// ❌ Unsafe - dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: customerName }} />
```

**Content Security Policy**:
```typescript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co;
`

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
          }
        ]
      }
    ]
  }
}
```

### CSRF Protection

**SameSite Cookies**:
```typescript
// Supabase client configuration
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: {
      getItem: (key) => Cookies.get(key),
      setItem: (key, value) => {
        Cookies.set(key, value, {
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true
        })
      },
      removeItem: (key) => Cookies.remove(key)
    }
  }
})
```

---

## OWASP Considerations

### OWASP Top 10 Mitigation

| Vulnerability | Mitigation | Implementation |
|---------------|------------|----------------|
| **A01: Broken Access Control** | RLS, RBAC | PostgreSQL RLS policies, role checks |
| **A02: Cryptographic Failures** | Encryption at rest/transit | TLS, database encryption |
| **A03: Injection** | Parameterized queries, validation | Supabase client, Zod schemas |
| **A04: Insecure Design** | Security by design | Defense in depth, least privilege |
| **A05: Security Misconfiguration** | Secure defaults | Security headers, HTTPS enforcement |
| **A06: Vulnerable Components** | Dependency scanning | npm audit, Dependabot |
| **A07: Auth Failures** | Strong auth, rate limiting | Supabase Auth, rate limits |
| **A08: Data Integrity Failures** | Input validation, checksums | Zod validation, file verification |
| **A09: Logging Failures** | Comprehensive logging | Server-side error logs, audit trail |
| **A10: SSRF** | URL validation, whitelist | Input validation, network isolation |

### Security Headers

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self)'
  }
]

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ]
  }
}
```

### Dependency Security

**Automated Scanning**:
```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Check for outdated packages
npm outdated
```

**GitHub Dependabot Configuration**:
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "markahope-aag"
    labels:
      - "dependencies"
      - "security"
```

---

## Security Best Practices for Contributors

### Code Review Checklist

Before submitting a pull request, verify:

- [ ] All user inputs are validated with Zod schemas
- [ ] No sensitive data in logs or error messages
- [ ] Authentication checked for all protected routes
- [ ] RLS policies tested and working
- [ ] No SQL queries using string concatenation
- [ ] No use of `dangerouslySetInnerHTML` without sanitization
- [ ] No hardcoded credentials or API keys
- [ ] Rate limiting applied to new endpoints
- [ ] Error handling uses secure error handler
- [ ] Tests include security scenarios

### Secure Coding Guidelines

**DO**:
- ✅ Use Zod for all input validation
- ✅ Use parameterized queries (Supabase client)
- ✅ Implement rate limiting on all public endpoints
- ✅ Use SecureError for API errors
- ✅ Test with different user roles
- ✅ Store secrets in environment variables
- ✅ Use HTTPS in production
- ✅ Implement proper session management
- ✅ Log security events
- ✅ Keep dependencies updated

**DON'T**:
- ❌ Trust user input without validation
- ❌ Expose error details to clients
- ❌ Use string concatenation for SQL queries
- ❌ Store passwords in plain text
- ❌ Commit secrets to version control
- ❌ Use weak session identifiers
- ❌ Disable security features in production
- ❌ Ignore security warnings
- ❌ Use outdated dependencies
- ❌ Skip authentication checks

### Environment Variables

**Required Variables**:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Public, safe to expose

# Rate Limiting (optional but recommended)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...  # Secret, never commit

# App Configuration
NEXT_PUBLIC_APP_URL=https://hazardos.app
```

**Security Rules**:
- Never commit `.env.local` to version control
- Use `.env.example` for documentation
- Rotate secrets regularly
- Use different credentials for dev/staging/prod
- Use secrets management service in production

### Testing Security

**Security Test Examples**:
```typescript
describe('Security', () => {
  it('should require authentication', async () => {
    // Mock unauthenticated user
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
      error: null
    })

    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('should enforce RLS', async () => {
    // Attempt to access another org's data
    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('organization_id', 'other-org-id')

    expect(data).toEqual([])
  })

  it('should validate input', async () => {
    const response = await POST(request, {
      body: JSON.stringify({ email: 'invalid-email' })
    })

    expect(response.status).toBe(400)
  })

  it('should apply rate limiting', async () => {
    // Make multiple requests rapidly
    const requests = Array.from({ length: 150 }, () => GET(request))
    const responses = await Promise.all(requests)

    const rateLimited = responses.some(r => r.status === 429)
    expect(rateLimited).toBe(true)
  })
})
```

---

## Incident Response Procedures

### Security Incident Classification

**Severity Levels**:

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **Critical** | Active attack, data breach | Immediate | Database compromise, auth bypass |
| **High** | Significant vulnerability | < 4 hours | SQL injection, XSS vulnerability |
| **Medium** | Limited impact vulnerability | < 24 hours | Information disclosure, CSRF |
| **Low** | Minor security issue | < 1 week | Missing security header |

### Incident Response Steps

**1. Detection and Analysis**
- Monitor error logs for unusual patterns
- Check rate limit analytics for abuse
- Review failed authentication attempts
- Monitor database access patterns

**2. Containment**
```bash
# If compromised, immediately:
# 1. Rotate all API keys and secrets
# 2. Invalidate all user sessions
# 3. Enable IP-based rate limiting
# 4. Review and restrict database access
```

**3. Investigation**
- Identify affected systems and data
- Determine attack vector
- Assess scope of compromise
- Preserve logs for forensics

**4. Eradication**
- Apply security patches
- Update vulnerable dependencies
- Strengthen affected security controls
- Update RLS policies if needed

**5. Recovery**
- Restore from clean backups if needed
- Reset user passwords if compromised
- Notify affected users
- Monitor for continued attack

**6. Post-Incident**
- Document incident details
- Update security procedures
- Implement additional controls
- Conduct security training

### Contact Information

**Security Team**:
- Email: mark.hope@asymmetric.pro
- Emergency: Use Vercel support for infrastructure issues

**Reporting Vulnerabilities**:
- Email: mark.hope@asymmetric.pro
- Include: Description, steps to reproduce, impact assessment
- We aim to respond within 24 hours

### Monitoring and Alerting

**Critical Alerts**:
- Multiple failed login attempts from same IP
- Unusual database query patterns
- High error rates on API endpoints
- Rate limit threshold exceeded
- RLS policy violations

**Regular Reviews**:

**Weekly**:
- Review error logs
- Check rate limit analytics
- Monitor failed authentication attempts

**Monthly**:
- Audit user access permissions
- Review and rotate API keys
- Update dependencies

**Quarterly**:
- Conduct security audit
- Penetration testing
- Review and update security policies
- Security training for team

---

## Security Resources

### Documentation
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)

### Tools
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit) - Dependency scanning
- [Snyk](https://snyk.io/) - Vulnerability detection
- [OWASP ZAP](https://www.zaproxy.org/) - Security testing

### Internal Documentation
- [Architecture Guide](./architecture.md)
- [Testing Guide](./TESTING.md)
- [API Reference](./API-REFERENCE.md)

---

## Compliance

### Data Privacy

**GDPR Compliance** (if applicable):
- Right to access: Users can export their data
- Right to deletion: Users can delete their account
- Data portability: Export in standard format
- Consent management: Marketing consent tracking

**CCPA Compliance** (if applicable):
- Data disclosure: Users can see what data we collect
- Opt-out: Users can opt out of data collection
- Data deletion: Users can request data deletion

### Audit Logging

All sensitive operations are logged in `activity_log` table:
- User authentication events
- Data access and modifications
- Permission changes
- API access patterns
- Security-related events

---

**Document Version**: 1.0
**Last Review**: February 1, 2026
**Next Review**: March 1, 2026
