# HazardOS Multi-Tenant Setup Guide

## Overview

HazardOS is now configured as a multi-tenant SaaS platform with the following architecture:

### Tenant Hierarchy
1. **Platform Owner** (Mark Hope) - Full platform control
2. **Platform Admin** - Platform management access
3. **Tenant Owner** - Organization owner with full tenant access
4. **Admin** - Organization admin with management capabilities
5. **Estimator** - Can create assessments and estimates
6. **Technician** - Can view jobs and update progress
7. **Viewer** - Read-only access

## Database Setup

Run these SQL files in order in your Supabase SQL Editor:

1. **Base Schema**: `docs/database/01-schema.sql`
2. **RLS Policies**: `docs/database/02-rls-policies.sql`
3. **Sample Data**: `docs/database/03-sample-data.sql`
4. **Multi-Tenant Schema**: `docs/database/04-multi-tenant-schema.sql`
5. **Multi-Tenant RLS**: `docs/database/05-multi-tenant-rls.sql`
6. **Platform Owner Setup**: `docs/database/06-setup-platform-owner.sql`

## Platform Owner Setup

### Mark Hope as Platform Owner

1. **Create Auth User**: In Supabase Auth dashboard, create user:
   - Email: `mark.hope@asymmetric.pro`
   - Password: (set your preferred password)
   - Email Confirmed: ✓ Yes

2. **Run Setup Script**: Execute `06-setup-platform-owner.sql`

3. **Access Platform Admin**: Visit `/platform-admin` after logging in

## Multi-Tenant Features

### Tenant Isolation
- **Row Level Security**: Each tenant can only access their own data
- **Organization-based filtering**: All queries automatically filter by organization
- **Platform override**: Platform owners/admins can access all tenant data

### Usage Tracking
- **Monthly limits**: Assessments, users, storage per organization
- **Real-time tracking**: Automatic usage updates via database triggers
- **Billing integration ready**: Usage data structured for billing systems

### Subscription Tiers
- **Trial**: 30 days, 5 users, 25 assessments/month
- **Starter**: 5 users, 50 assessments/month
- **Professional**: 25 users, 500 assessments/month
- **Enterprise**: Unlimited users and assessments

## Platform Admin Interface

### Features Available at `/platform-admin`:

1. **Overview Dashboard**
   - Total tenants and users
   - Platform health status
   - Recent activity feed

2. **Tenant Management** (`/platform-admin/tenants`)
   - View all organizations
   - Manage subscriptions
   - Suspend/activate tenants
   - View usage statistics

3. **Platform Settings** (`/platform-admin/settings`)
   - Global platform configuration
   - Feature flags
   - Maintenance mode

4. **Usage Analytics** (`/platform-admin/usage`)
   - Cross-tenant usage reports
   - Billing data export
   - Performance metrics

5. **Audit Logs** (`/platform-admin/audit`)
   - Platform-wide activity tracking
   - Security monitoring
   - Compliance reporting

## Tenant Onboarding

### Self-Service Registration
- **Onboarding Flow**: `/onboard` - Complete organization setup
- **Email Verification**: Required for new accounts
- **Automatic Trial**: 30-day trial with starter features

### Admin-Created Tenants
- Platform admins can create tenants directly
- Invitation system for adding users to organizations
- Bulk user import capabilities

## Security Features

### Data Isolation
- **RLS Policies**: Database-level tenant isolation
- **API Security**: All endpoints respect tenant boundaries
- **Audit Logging**: Complete activity tracking

### Role-Based Access Control
- **Granular Permissions**: Role-specific feature access
- **Organization Hierarchy**: Clear admin/user relationships
- **Platform Override**: Super admin access when needed

## Development & Testing

### Sample Organizations Created
1. **Demo Environmental Services** (ID: 11111111-1111-1111-1111-111111111111)
   - Trial tier, basic features
   - Test users: demo.admin@hazardos.app, demo.estimator@hazardos.app

2. **Pro Remediation Co** (ID: 22222222-2222-2222-2222-222222222222)
   - Professional tier, all features
   - Test users: pro.admin@hazardos.app, pro.estimator@hazardos.app

### Testing Multi-Tenancy
1. Create test users for different organizations
2. Verify data isolation between tenants
3. Test role-based access controls
4. Validate usage tracking and limits

## API Integration

### Tenant Context
- All API calls automatically include tenant context
- Usage tracking integrated into API endpoints
- Rate limiting per tenant/subscription tier

### Webhooks & Events
- Tenant lifecycle events (created, suspended, cancelled)
- Usage threshold alerts
- Billing events for subscription changes

## Next Steps

1. **Complete Database Setup**: Run all SQL migration files
2. **Create Platform Owner**: Set up Mark Hope's account
3. **Test Multi-Tenancy**: Create test organizations and users
4. **Configure Billing**: Integrate with Stripe or billing provider
5. **Set Up Monitoring**: Platform health and usage monitoring

## Support & Maintenance

### Platform Owner Responsibilities
- Tenant management and support
- Platform configuration and updates
- Billing and subscription management
- Security monitoring and compliance

### Tenant Self-Service
- Organization settings management
- User invitation and role management
- Usage monitoring and billing
- Feature configuration within limits

---

**Platform Owner**: Mark Hope (mark.hope@asymmetric.pro)  
**Platform URL**: https://hazardos.app  
**Admin Interface**: https://hazardos.app/platform-admin