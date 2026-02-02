# HazardOS Deployment Guide

**Complete guide for deploying HazardOS to production**

> **Last Updated**: February 2, 2026  
> **Status**: Production Ready  
> **Current Deployment**: https://hazardos.app

---

## Table of Contents

1. [Deployment Architecture](#deployment-architecture)
2. [Vercel Deployment](#vercel-deployment)
3. [Environment Variables](#environment-variables)
4. [Database Setup](#database-setup)
5. [Domain Configuration](#domain-configuration)
6. [SSL/TLS Configuration](#ssltls-configuration)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Backup and Recovery](#backup-and-recovery)
9. [Deployment Checklist](#deployment-checklist)
10. [Troubleshooting](#troubleshooting)

---

## Deployment Architecture

### Production Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        Production Stack                      │
├─────────────────────────────────────────────────────────────┤
│ Frontend & API: Vercel (Next.js 16)                        │
│ Database: Supabase (PostgreSQL)                            │
│ Authentication: Supabase Auth                              │
│ File Storage: Supabase Storage                             │
│ Rate Limiting: Upstash Redis                               │
│ Payments: Stripe                                           │
│ SMS: Twilio                                                │
│ Email: Resend                                              │
│ Monitoring: Vercel Analytics + Sentry                     │
│ Domain: hazardos.app (Vercel DNS)                         │
└─────────────────────────────────────────────────────────────┘
```

### Infrastructure Components

| Service | Provider | Purpose | Status |
|---------|----------|---------|--------|
| **Hosting** | Vercel | Next.js app hosting | ✅ Active |
| **Database** | Supabase | PostgreSQL with RLS | ✅ Active |
| **Authentication** | Supabase Auth | JWT-based auth | ✅ Active |
| **File Storage** | Supabase Storage | Photos, PDFs, documents | ✅ Active |
| **Rate Limiting** | Upstash Redis | DoS protection | ✅ Active |
| **Payments** | Stripe | Subscription billing | ✅ Active |
| **SMS** | Twilio | Customer notifications | ✅ Active |
| **Email** | Resend | Transactional emails | ✅ Active |
| **Monitoring** | Sentry | Error tracking | ✅ Active |
| **Analytics** | Vercel Analytics | Performance metrics | ✅ Active |

---

## Vercel Deployment

### Automatic Deployment

HazardOS is configured for automatic deployment from the main branch:

1. **Push to main branch** triggers automatic build
2. **Build process** includes:
   - TypeScript compilation
   - ESLint validation
   - Test suite execution
   - Production build
3. **Deployment** to https://hazardos.app

### Manual Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Build Configuration

**vercel.json**:
```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "crons": [
    {
      "path": "/api/cron/appointment-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Build Scripts**:
```json
{
  "scripts": {
    "build": "next build",
    "vercel-build": "npm run type-check && npm run lint && npm run test:run && npm run build"
  }
}
```

---

## Environment Variables

### Required Variables

**Vercel Environment Variables** (Production):

```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://inzwwbbbdookxkkotbxj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration (Required)
NEXT_PUBLIC_APP_URL=https://hazardos.app
NODE_ENV=production

# Rate Limiting (Required)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Stripe (Required for billing)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Twilio (Required for SMS)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+15551234567

# Resend (Required for email)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@hazardos.app

# Sentry (Optional - Error tracking)
SENTRY_DSN=https://your-sentry-dsn
SENTRY_ORG=your-org
SENTRY_PROJECT=hazardos

# Cron Security (Required)
CRON_SECRET=your-secure-random-string

# API Keys (Optional - for external API access)
API_KEY_SECRET=your-api-key-secret
```

### Setting Environment Variables

**Via Vercel Dashboard**:
1. Go to Vercel Dashboard → Project → Settings → Environment Variables
2. Add each variable with appropriate environment (Production, Preview, Development)
3. Redeploy after adding variables

**Via Vercel CLI**:
```bash
# Add environment variable
vercel env add VARIABLE_NAME

# List environment variables
vercel env ls

# Remove environment variable
vercel env rm VARIABLE_NAME
```

---

## Database Setup

### Supabase Configuration

**Project Details**:
- **Project ID**: `inzwwbbbdookxkkotbxj`
- **Region**: `us-east-1`
- **Database**: PostgreSQL 15
- **Connection**: Direct connection via Supabase client

### Migration Deployment

```bash
# Apply all migrations to production
supabase db push --project-ref inzwwbbbdookxkkotbxj

# Check migration status
supabase db status --project-ref inzwwbbbdookxkkotbxj

# Generate migration diff
supabase db diff --schema public
```

### Database Security

**Row Level Security (RLS)**:
- ✅ Enabled on all tables
- ✅ Multi-tenant isolation enforced
- ✅ Role-based access control

**Backup Strategy**:
- ✅ Automatic daily backups (Supabase)
- ✅ Point-in-time recovery available
- ✅ Manual backup before major deployments

---

## Domain Configuration

### DNS Configuration

**Domain**: `hazardos.app`  
**DNS Provider**: Vercel DNS

**DNS Records**:
```
A     hazardos.app        → 76.76.19.61
AAAA  hazardos.app        → 2606:4700:10::6816:1b3d
CNAME www.hazardos.app    → hazardos.app
CNAME api.hazardos.app    → hazardos.app
```

### Custom Domain Setup

1. **Add domain in Vercel**:
   ```bash
   vercel domains add hazardos.app
   ```

2. **Configure DNS records** as shown above

3. **Verify domain ownership**:
   ```bash
   vercel domains verify hazardos.app
   ```

---

## SSL/TLS Configuration

### Automatic SSL

Vercel automatically provides SSL certificates via Let's Encrypt:
- ✅ Automatic certificate generation
- ✅ Automatic renewal
- ✅ HTTP to HTTPS redirect
- ✅ HSTS headers enabled

### Security Headers

**Configured in `next.config.mjs`**:
```javascript
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
    value: 'DENY'
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

---

## Monitoring and Logging

### Error Tracking (Sentry)

**Configuration**:
```javascript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
})
```

**Monitoring**:
- ✅ Client-side error tracking
- ✅ Server-side error tracking
- ✅ Performance monitoring
- ✅ User session tracking

### Analytics (Vercel)

**Metrics Tracked**:
- Page views and unique visitors
- Core Web Vitals (LCP, FID, CLS)
- API response times
- Error rates
- Geographic distribution

### Structured Logging

**Production Logging**:
- ✅ JSON-structured logs via Pino
- ✅ Request correlation IDs
- ✅ User and organization context
- ✅ Performance timing
- ✅ Sensitive data redaction

**Log Levels**:
- `error`: Server errors, failed operations
- `warn`: Client errors, validation failures
- `info`: Request completion, business events
- `debug`: Development debugging (disabled in production)

---

## Backup and Recovery

### Database Backups

**Supabase Automatic Backups**:
- ✅ Daily automated backups
- ✅ 7-day retention for free tier
- ✅ Point-in-time recovery available
- ✅ Cross-region backup replication

**Manual Backup Process**:
```bash
# Create manual backup
supabase db dump --project-ref inzwwbbbdookxkkotbxj > backup-$(date +%Y%m%d).sql

# Restore from backup
supabase db reset --project-ref inzwwbbbdookxkkotbxj
psql -h db.inzwwbbbdookxkkotbxj.supabase.co -U postgres -d postgres < backup-20260202.sql
```

### File Storage Backups

**Supabase Storage**:
- ✅ Automatic replication across availability zones
- ✅ 99.9% durability guarantee
- ✅ Versioning available for critical files

### Application Code Backups

**Git Repository**:
- ✅ Primary: GitHub (markahope-aag/hazardos)
- ✅ All deployment history preserved
- ✅ Branch protection on main branch

---

## Deployment Checklist

### Pre-Deployment

- [ ] **Code Quality**
  - [ ] All tests passing (`npm run test:run`)
  - [ ] TypeScript compilation successful (`npm run type-check`)
  - [ ] ESLint validation passed (`npm run lint`)
  - [ ] Production build successful (`npm run build`)

- [ ] **Database**
  - [ ] Migrations tested in staging
  - [ ] Backup created before deployment
  - [ ] Migration rollback plan prepared

- [ ] **Environment Variables**
  - [ ] All required variables configured in Vercel
  - [ ] Secrets rotated if compromised
  - [ ] API keys and tokens verified

- [ ] **Dependencies**
  - [ ] Package vulnerabilities checked (`npm audit`)
  - [ ] Dependencies up to date
  - [ ] No breaking changes in updates

### Post-Deployment

- [ ] **Verification**
  - [ ] Application loads successfully
  - [ ] Authentication working
  - [ ] Database connectivity verified
  - [ ] API endpoints responding
  - [ ] File uploads working

- [ ] **Monitoring**
  - [ ] Error rates within normal range
  - [ ] Performance metrics acceptable
  - [ ] No critical alerts triggered
  - [ ] User feedback monitored

- [ ] **Documentation**
  - [ ] Deployment notes updated
  - [ ] Changelog updated
  - [ ] Team notified of deployment

### Rollback Plan

**Immediate Rollback** (if critical issues):
```bash
# Rollback to previous deployment
vercel rollback

# Or deploy specific commit
vercel --prod --force
```

**Database Rollback** (if needed):
```bash
# Restore from backup
supabase db reset --project-ref inzwwbbbdookxkkotbxj
# Apply backup file
```

---

## Troubleshooting

### Common Issues

#### Build Failures

**Issue**: TypeScript compilation errors
```bash
# Check types locally
npm run type-check

# Fix type errors and redeploy
```

**Issue**: Test failures
```bash
# Run tests locally
npm run test:run

# Fix failing tests and redeploy
```

#### Runtime Issues

**Issue**: Environment variables not loaded
- Verify variables are set in Vercel dashboard
- Check variable names match exactly
- Redeploy after adding variables

**Issue**: Database connection failures
- Verify Supabase credentials
- Check network connectivity
- Review RLS policies

**Issue**: Rate limiting errors
- Verify Upstash Redis configuration
- Check rate limit thresholds
- Monitor Redis usage

#### Performance Issues

**Issue**: Slow API responses
- Check database query performance
- Review API route implementations
- Monitor Vercel function duration

**Issue**: High error rates
- Check Sentry error reports
- Review application logs
- Verify third-party service status

### Support Contacts

- **Technical Issues**: mark.hope@asymmetric.pro
- **Vercel Support**: Vercel Dashboard → Help
- **Supabase Support**: Supabase Dashboard → Support
- **Emergency**: Contact platform owner directly

---

## Security Considerations

### Production Security Checklist

- [x] **HTTPS enforced** with HSTS headers
- [x] **Security headers** configured (CSP, X-Frame-Options, etc.)
- [x] **Rate limiting** active on all endpoints
- [x] **Input validation** with Zod schemas
- [x] **SQL injection protection** via parameterized queries
- [x] **XSS protection** via Next.js built-in sanitization
- [x] **CSRF protection** via SameSite cookies
- [x] **Sensitive data redaction** in logs
- [x] **Multi-tenant isolation** via RLS policies
- [x] **API key authentication** for external access
- [x] **Webhook signature verification** for third-party services

### Monitoring Security

- **Error tracking** for security-related failures
- **Rate limit monitoring** for potential attacks
- **Authentication failure tracking**
- **Suspicious activity detection**

---

**Deployment Status**: ✅ Production Ready  
**Last Deployment**: February 2, 2026  
**Next Review**: March 1, 2026