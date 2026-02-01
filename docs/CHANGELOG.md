# HazardOS Changelog

All notable changes to the HazardOS project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### In Progress
- Test coverage expansion (target: 80%+ overall coverage)
- Component testing suite
- Integration test workflows

### Planned
- Mobile survey wizard UI enhancements
- User registration and invitation system
- Advanced estimate builder interface
- Equipment tracking
- Customer portal improvements

---

## [0.1.1] - 2026-02-01

### Added - API Standardization & Testing

#### Comprehensive API Test Suite
- Added 10 API test files covering critical endpoints
- Customers API tests (15 test cases)
- Jobs API tests (11 test cases for listing/creation, 9 for operations)
- Invoices API tests (8 test cases)
- Estimates API tests (8 test cases)
- Proposals API tests (14 test cases)
- Analytics API tests (8 test cases)
- Settings/Pricing API tests (6 test cases)
- Integrations API tests (5 test cases)
- Total: 84+ comprehensive test cases

#### API Standardization
- Standardized error handling across all API routes
- Consistent validation using Zod schemas
- Secure error responses (no internal details exposed)
- Unified authentication checks
- Multi-tenant authorization enforcement
- Input sanitization and validation

#### Code Quality Improvements
- Updated component architecture with proper TypeScript types
- Improved validation schemas across forms
- Enhanced Supabase client configuration
- Updated middleware and rate limiting
- Refactored survey store for better state management

### Changed

#### API Error Handling
- All API routes now return consistent error response structure:
  ```json
  {
    "error": "User-friendly error message",
    "type": "ERROR_TYPE"
  }
  ```
- Error types: UNAUTHORIZED, FORBIDDEN, VALIDATION_ERROR, NOT_FOUND, INTERNAL_ERROR
- Internal error details logged server-side only
- Database errors sanitized for production safety

#### Component Updates
- CustomerForm - Enhanced validation and error handling
- DeleteCustomerDialog - Improved confirmation flow
- SimpleSiteSurveyForm - Updated validation
- SurveyWizard - Better state management
- PhotoCapture - Improved error handling
- Various dashboard components optimized

#### Service Layer Updates
- Updated Supabase client initialization
- Enhanced photo upload service with compression
- Improved survey service with validation
- Updated database service layer
- Enhanced middleware with rate limiting

### Fixed
- TypeScript compilation errors in test files
- Validation schema edge cases
- Component prop type mismatches
- Service layer error handling
- Database query optimization

### Security
- Implemented secure error handling (no stack traces in responses)
- Enhanced input validation across all API routes
- Rate limiting on all public endpoints
- Multi-tenant data isolation verified
- Authentication checks standardized

---

## [0.1.0] - 2026-02-01

### Added - Phase 4: Job Completion & Feedback

#### Job Completion System
- Time entry tracking with work types (regular, overtime, travel, setup, cleanup, supervision)
- Material usage tracking with variance calculation
- Completion photo documentation (before, during, after, issue, documentation)
- Completion checklists (safety, quality, cleanup, documentation, custom)
- Variance analysis (hours and cost)
- Customer digital signature capture
- Job completion workflow (draft → submitted → approved/rejected)
- API endpoints for job completion operations

#### Customer Feedback System
- Token-based public feedback surveys
- Multi-category ratings (overall, quality, communication, timeliness, value)
- Net Promoter Score (NPS) tracking
- Testimonial collection with approval workflow
- Review request system for external platforms (Google, Yelp, Facebook, BBB, HomeAdvisor, Angi)
- Feedback statistics and analytics
- Automated survey email sending

#### Analytics & Reporting
- Variance analysis API
- Jobs by status distribution
- Revenue analytics
- Material variance tracking
- Estimator performance metrics

#### QuickBooks Integration
- OAuth 2.0 connection flow
- Customer sync (bi-directional)
- Invoice sync to QuickBooks
- Connection status monitoring
- Sync logging and error tracking

#### Activity Logging
- Comprehensive audit trail for all user actions
- System event tracking
- Activity feed on dashboard
- IP address and user agent logging

### Added - Phase 3: Security & Infrastructure

#### Security Improvements
- Rate limiting with Upstash Redis
- Secure error handling (no internal details exposed)
- Input validation with Zod schemas
- Enhanced RLS policies
- CSRF protection verification

#### Testing Infrastructure
- API route tests (customers, jobs, invoices, estimates, analytics, integrations, proposals, settings)
- Test coverage reporting
- Security-focused test patterns
- Mock implementations for Supabase

### Added - Earlier Phases

#### Core Features
- Multi-tenant authentication and authorization
- Row Level Security (RLS) for data isolation
- Site survey management (mobile-optimized)
- Customer management (CRM)
- Pricing management (labor, equipment, materials, disposal, travel)
- Invoice management
- Proposal PDF generation
- PWA support with offline capability
- Photo/video upload with compression
- Database migration system

#### Database Schema
- Organizations (tenants)
- Profiles (users with roles)
- Customers
- Site surveys
- Estimates
- Jobs
- Invoices
- Pricing tables
- Job completion tables
- Feedback survey tables
- Integration tables
- Activity log

### Changed
- Renamed "Assessments" to "Site Surveys" throughout application
- Updated all API routes to use secure error handling
- Migrated to Supabase CLI-based migrations
- Improved TypeScript type safety

### Fixed
- TypeScript compilation errors in test files
- Authentication redirect loops
- Database connection pool issues
- File upload size limits
- RLS policy infinite recursion

### Security
- Implemented rate limiting on all API endpoints
- Replaced exposed error messages with generic responses
- Added server-side logging for security events
- Enhanced input validation across all forms

---

## Version History

### [0.1.0] - 2026-02-01
**Phase 4 Release**: Job Completion, Customer Feedback, Analytics, Integrations

Major features:
- Job completion tracking with time entries, materials, photos, and checklists
- Customer feedback system with NPS and testimonials
- Variance analysis and reporting
- QuickBooks integration
- Activity logging

### [0.0.3] - 2026-01-31
**Phase 3 Release**: Security & Polish

Major improvements:
- Security hardening (rate limiting, error handling)
- Comprehensive test suite
- Activity logging
- Dashboard improvements

### [0.0.2] - 2026-01-30
**Phase 2 Release**: Jobs & Invoicing

Major features:
- Jobs management system
- Invoice generation and tracking
- Scheduling system
- Pricing management

### [0.0.1] - 2026-01-29
**Phase 1 Release**: MVP

Initial features:
- Multi-tenant authentication
- Customer management
- Site survey forms
- Proposal generation
- Basic dashboard

---

## Migration Notes

### Upgrading to 0.1.0

#### Database Migrations
Run the following migrations in order:

```bash
supabase db push
```

New migrations:
- `20260215000001_job_completion.sql` - Job completion system
- `20260215000002_customer_feedback.sql` - Feedback surveys
- `20260215000003_notifications.sql` - Notification system

#### Environment Variables
Add to your `.env.local`:

```env
# Rate Limiting (Required)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# QuickBooks Integration (Optional)
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=https://hazardos.app/api/integrations/quickbooks/callback
```

#### Breaking Changes
None in this release.

#### Deprecations
- Legacy `/docs/database/` SQL files (use Supabase CLI migrations instead)
- Console logging in production (replaced with structured logging)

---

## Roadmap

### Q1 2026
- [x] Job completion system
- [x] Customer feedback
- [x] QuickBooks integration
- [ ] Mobile survey wizard
- [ ] User registration system
- [ ] Estimate builder UI

### Q2 2026
- [ ] Advanced scheduling calendar
- [ ] Equipment tracking
- [ ] Customer portal
- [ ] Online payments (Stripe)
- [ ] Automated email notifications
- [ ] Mobile native apps (iOS/Android)

### Q3 2026
- [ ] Machine learning for estimate accuracy
- [ ] Predictive analytics
- [ ] White-label platform
- [ ] API platform for integrations
- [ ] Advanced reporting suite

---

## Contributors

- **Mark Hope** - Product Owner & Lead Developer (mark.hope@asymmetric.pro)
- **AI Assistant** - Development Support (Claude)

---

## License

Proprietary - Asymmetric Marketing LLC

---

## Support

For questions or issues:
- Email: mark.hope@asymmetric.pro
- GitHub Issues: https://github.com/markahope-aag/hazardos/issues

---

**Last Updated**: February 1, 2026
