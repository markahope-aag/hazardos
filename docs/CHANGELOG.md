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

## [0.2.0] - 2026-02-02

### Added - Phase 7: SMS Infrastructure & Communications

#### SMS Service (Twilio Integration)
- Comprehensive SMS service with Twilio integration (`lib/services/sms-service.ts`)
- Support for platform-level shared Twilio account or organization-specific accounts
- Automatic phone number normalization to E.164 format
- Message delivery status tracking with webhook integration
- Opt-in/opt-out management with TCPA compliance
- Quiet hours enforcement based on organization timezone
- Message history and audit trail

#### SMS Templates
- Six default system templates for common scenarios:
  - Appointment reminders
  - Job status updates (en route, arrived, completed)
  - Lead notifications
  - Estimate follow-ups
  - Payment reminders
- Template variable interpolation (e.g., `{{customer_name}}`, `{{company_name}}`)
- Organization-specific custom templates
- Template management UI

#### SMS API Routes
- `POST /api/sms/send` - Send individual SMS messages
- `GET /api/sms/messages` - Retrieve message history with filtering
- `GET /api/sms/settings` - Get organization SMS settings
- `PATCH /api/sms/settings` - Update SMS configuration (admin only)
- `GET /api/sms/templates` - List all templates (system + custom)
- `POST /api/sms/templates` - Create custom templates (admin only)

#### SMS Settings UI
- Comprehensive settings page at `/settings/sms`
- Master SMS toggle with feature-specific controls
- Appointment reminder configuration (enable/disable, hours before)
- Job status update notifications toggle
- Lead notification toggle
- Payment reminder toggle
- Quiet hours configuration with timezone support
- Twilio credential management (platform or custom account)
- SMS best practices information

#### Webhooks & Automation
- `POST /api/webhooks/twilio/status` - Delivery status callback from Twilio
- `POST /api/webhooks/twilio/inbound` - Inbound SMS handler for opt-out keywords
- `GET /api/cron/appointment-reminders` - Automated hourly appointment reminder job
- Keyword detection (STOP, START, UNSUBSCRIBE, etc.)
- Automatic customer opt-out/opt-in processing

#### Database Schema
- `organization_sms_settings` table for organization-level configuration
- `sms_messages` table for complete message audit trail
- `sms_templates` table for system and custom templates
- Added `sms_opt_in`, `sms_opt_in_at`, `sms_opt_out_at` to customers table
- Added `reminder_sent_at` to jobs table
- RLS policies for multi-tenant security

#### Validation Schemas
- **Approvals** (`lib/validations/approvals.ts`)
  - Approval entity types and statuses
  - Create and process approval validation
- **Commissions** (`lib/validations/commissions.ts`)
  - Commission plans and earnings
  - Tiered commission structure validation
- **Feedback** (`lib/validations/feedback.ts`)
  - Feedback survey creation and submission
  - Rating ranges (1-5 stars, 0-10 NPS)
  - Testimonial approval
- **Notifications** (`lib/validations/notifications.ts`)
  - Notification types (15 types)
  - Priority levels (low, normal, high, urgent)
  - Create notification validation
- **Pipeline** (`lib/validations/pipeline.ts`)
  - Opportunity management
  - Pipeline stage validation
  - Move opportunity validation
- **Settings** (`lib/validations/settings.ts`)
  - Labor rate validation
  - Disposal fee validation
  - Material cost validation
  - Travel rate validation
- **Platform** (`lib/validations/platform.ts`)
  - Organization filters
  - Sort and pagination parameters
- **Reports** (`lib/validations/reports.ts`)
  - Report types and configurations
  - Date range types (9 options)
  - Chart types (bar, line, pie, area)
  - Filter operators
  - Export formats (xlsx, csv, pdf)

#### Platform Admin API
- `GET /api/platform/organizations` - List organizations with filtering/sorting
- `GET /api/platform/stats` - Platform-wide statistics and growth metrics
- Organization filters (search, status, plan)
- Platform metrics (total orgs, users, jobs, revenue, MRR)

### Changed

#### SMS Infrastructure
- Customer table updated with SMS opt-in/opt-out tracking
- Jobs table updated with reminder tracking
- Enhanced notification system to support SMS delivery

#### Type Safety
- Added comprehensive TypeScript types for SMS (`types/sms.ts`)
- Zod validation schemas for all new features
- Type-safe API handlers with validation

### Security

#### TCPA Compliance
- Customer opt-in required before SMS delivery
- Quiet hours enforcement (default: 21:00-08:00)
- Automatic opt-out keyword detection
- Timestamp tracking for all consent changes
- Opt-out instructions in all messages

#### Data Protection
- Twilio credentials encrypted at rest
- RLS policies enforce organization isolation on all SMS tables
- Webhook endpoints validated for Twilio signatures
- SMS message content sanitized in logs

#### Input Validation
- Comprehensive Zod schemas for all API endpoints
- Phone number format validation and normalization
- Template variable sanitization
- Rate limiting on all SMS endpoints

### Fixed
- Phone number normalization edge cases
- Timezone handling for quiet hours
- Template variable interpolation with special characters
- Webhook signature validation

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
