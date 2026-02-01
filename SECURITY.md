# Security Implementation

This document outlines the security measures implemented in HazardOS to protect against common vulnerabilities.

## ✅ Rate Limiting

### Implementation
- **Redis-based rate limiting** (preferred) with memory fallback
- **Multiple rate limit tiers** based on endpoint sensitivity:
  - General API: 100 requests/minute
  - Authentication: 10 requests/minute  
  - File uploads: 20 requests/minute
  - Heavy operations: 5 requests/minute

### Configuration
Rate limiting can be configured with Redis (recommended) or falls back to in-memory storage:

```env
# Optional: Redis for distributed rate limiting
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### Usage
```typescript
import { withUnifiedRateLimit } from '@/lib/middleware/unified-rate-limit'

// Apply to API routes
export const GET = withUnifiedRateLimit(getHandler, 'general')
export const POST = withUnifiedRateLimit(postHandler, 'auth')
```

## ✅ Secure Error Handling

### Implementation
- **Sanitized error messages** - Internal details never exposed to clients
- **Structured error types** with safe, user-friendly messages
- **Development vs Production** - More details in dev, sanitized in production
- **Comprehensive logging** - Full errors logged server-side for debugging

### Error Types
```typescript
type SafeErrorType = 
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND' 
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'BAD_REQUEST'
```

### Usage
```typescript
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

// Throw secure errors
throw new SecureError('UNAUTHORIZED')
throw new SecureError('VALIDATION_ERROR', 'Email is required', 'email')

// Handle any error securely
catch (error) {
  return createSecureErrorResponse(error)
}
```

## ✅ Input Validation

### Implementation
- **Required field validation** with secure error messages
- **Email format validation** 
- **Length validation** for text fields
- **Type-safe validation** using TypeScript

### Usage
```typescript
import { validateRequired, validateEmail, validateLength } from '@/lib/utils/secure-error-handler'

validateRequired(body.name, 'name')
validateEmail(body.email, 'email')
validateLength(body.password, 8, 128, 'password')
```

## 🔒 Additional Security Measures

### Authentication & Authorization
- **Supabase Auth** with JWT tokens
- **Row Level Security (RLS)** on all database tables
- **Organization-based isolation** - users only access their org's data

### Database Security
- **Parameterized queries** via Supabase client (prevents SQL injection)
- **RLS policies** enforce data access controls
- **Audit logging** for sensitive operations

### API Security
- **HTTPS only** in production
- **CORS configuration** restricts origins
- **Request size limits** prevent payload attacks
- **Timeout handling** prevents resource exhaustion

## 🚨 Security Headers

Add these headers in production:

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
    key: 'X-XSS-Protection',
    value: '1; mode=block'
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
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]
```

## 📊 Monitoring & Alerting

### Rate Limit Monitoring
- Rate limit hits are logged with IP and endpoint
- Analytics available through Upstash Redis dashboard
- Set up alerts for unusual rate limit patterns

### Error Monitoring  
- All errors logged server-side with full context
- Use error tracking service (Sentry, LogRocket) in production
- Monitor for unusual error patterns

### Security Audit Log
- Authentication events
- Data access patterns  
- Failed authorization attempts
- Rate limit violations

## 🔄 Regular Security Tasks

### Weekly
- [ ] Review error logs for security issues
- [ ] Check rate limit analytics for abuse patterns
- [ ] Verify RLS policies are working correctly

### Monthly  
- [ ] Update dependencies for security patches
- [ ] Review and rotate API keys/tokens
- [ ] Audit user access permissions

### Quarterly
- [ ] Security penetration testing
- [ ] Review and update security policies
- [ ] Audit third-party integrations