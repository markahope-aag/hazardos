
# HazardOS Test Coverage Report
Generated: 2026-02-01T22:59:45.082Z

## Executive Summary
- **Total Files**: 491
- **Tested Files**: 1
- **Overall Coverage**: 0%
- **Test Files**: 149
- **Total Tests**: 1472

## Coverage by Category


### API
- **Files**: 139
- **Tested**: 0
- **Coverage**: 0%
- **Status**: ❌ Critical

### COMPONENTS
- **Files**: 0
- **Tested**: 0
- **Coverage**: 0%
- **Status**: ❌ Critical

### LIB
- **Files**: 0
- **Tested**: 0
- **Coverage**: 0%
- **Status**: ❌ Critical

### TYPES
- **Files**: 2
- **Tested**: 1
- **Coverage**: 50%
- **Status**: ⚠️ Needs Improvement

### HOOKS
- **Files**: 0
- **Tested**: 0
- **Coverage**: 0%
- **Status**: ❌ Critical

### SERVICES
- **Files**: 0
- **Tested**: 0
- **Coverage**: 0%
- **Status**: ❌ Critical

### UTILS
- **Files**: 0
- **Tested**: 0
- **Coverage**: 0%
- **Status**: ❌ Critical

### VALIDATIONS
- **Files**: 0
- **Tested**: 0
- **Coverage**: 0%
- **Status**: ❌ Critical


## Critical Gaps


### API_COVERAGE (CRITICAL)
**Description**: 139 API routes have no tests
**Impact**: High risk of production bugs, security vulnerabilities
**Files**: app/(dashboard)/settings/api/page.tsx, app/api/activity/manual/route.ts, app/api/ai/estimate/route.ts, app/api/ai/photo-analysis/route.ts, app/api/ai/voice/transcribe/route.ts (+5 more)


## Top Priority Untested Files

- **app/api/activity/manual/route.ts** (api)
- **app/api/ai/estimate/route.ts** (api)
- **app/api/ai/photo-analysis/route.ts** (api)
- **app/api/ai/voice/transcribe/route.ts** (api)
- **app/api/analytics/jobs-by-status/route.ts** (api)
- **app/api/analytics/revenue/route.ts** (api)
- **app/api/analytics/variance/route.ts** (api)
- **app/api/approvals/pending/route.ts** (api)
- **app/api/approvals/route.ts** (api)
- **app/api/approvals/[id]/route.ts** (api)
- **app/api/billing/checkout/route.ts** (api)
- **app/api/billing/features/route.ts** (api)
- **app/api/billing/invoices/route.ts** (api)
- **app/api/billing/plans/route.ts** (api)
- **app/api/billing/portal/route.ts** (api)
- **app/api/billing/subscription/route.ts** (api)
- **app/api/commissions/plans/route.ts** (api)
- **app/api/commissions/route.ts** (api)
- **app/api/commissions/summary/route.ts** (api)
- **app/api/commissions/[id]/route.ts** (api)

## Recommendations


### Extremely Low Test Coverage (CRITICAL)
**Category**: OVERALL
**Description**: Current coverage is 0%. Industry standard is 80%+.
**Action**: Implement comprehensive testing strategy immediately
**Effort**: HIGH

### API Routes Need Testing (CRITICAL)
**Category**: API
**Description**: Only 0% of API routes are tested.
**Action**: Add integration tests for all API endpoints
**Effort**: HIGH

### UI Components Need Testing (HIGH)
**Category**: COMPONENTS
**Description**: Only 0% of components are tested.
**Action**: Add unit tests for critical UI components
**Effort**: MEDIUM

### Business Logic Needs Testing (HIGH)
**Category**: SERVICES
**Description**: Only 0% of services are tested.
**Action**: Add comprehensive unit tests for all business logic
**Effort**: MEDIUM


## Test File Analysis


- **test/api/activity-manual.test.ts**: 3 tests, 2 suites

- **test/api/ai-estimate.test.ts**: 13 tests, 1 suites

- **test/api/ai-photo-analysis.test.ts**: 9 tests, 5 suites

- **test/api/ai-voice-transcribe.test.ts**: 9 tests, 3 suites

- **test/api/analytics-jobs-by-status.test.ts**: 3 tests, 1 suites

- **test/api/analytics-revenue.test.ts**: 1 tests, 1 suites

- **test/api/analytics-variance.test.ts**: 4 tests, 2 suites

- **test/api/analytics.test.ts**: 9 tests, 3 suites

- **test/api/approvals-id.test.ts**: 6 tests, 3 suites

- **test/api/approvals-pending.test.ts**: 1 tests, 1 suites

- **test/api/approvals.test.ts**: 5 tests, 3 suites

- **test/api/billing-checkout.test.ts**: 12 tests, 1 suites

- **test/api/billing-features.test.ts**: 3 tests, 2 suites

- **test/api/billing-invoices.test.ts**: 4 tests, 2 suites

- **test/api/billing-plans.test.ts**: 3 tests, 2 suites

- **test/api/billing-portal.test.ts**: 3 tests, 2 suites

- **test/api/billing-subscription.test.ts**: 15 tests, 3 suites

- **test/api/commissions-id.test.ts**: 2 tests, 2 suites

- **test/api/commissions-plans.test.ts**: 4 tests, 3 suites

- **test/api/commissions-summary.test.ts**: 3 tests, 2 suites

- **test/api/commissions.test.ts**: 3 tests, 3 suites

- **test/api/cron-appointment-reminders.test.ts**: 3 tests, 1 suites

- **test/api/customers-contacts.test.ts**: 1 tests, 1 suites

- **test/api/customers-id.test.ts**: 15 tests, 4 suites

- **test/api/customers.test.ts**: 11 tests, 3 suites

- **test/api/errors-report.test.ts**: 3 tests, 2 suites

- **test/api/estimate-line-items.test.ts**: 1 tests, 1 suites

- **test/api/estimates-approve.test.ts**: 2 tests, 1 suites

- **test/api/estimates-id.test.ts**: 10 tests, 4 suites

- **test/api/estimates-line-items.test.ts**: 1 tests, 1 suites

- **test/api/estimates.test.ts**: 9 tests, 3 suites

- **test/api/feedback-id-approve-testimonial.test.ts**: 1 tests, 1 suites

- **test/api/feedback-id-send.test.ts**: 1 tests, 1 suites

- **test/api/feedback-stats.test.ts**: 2 tests, 2 suites

- **test/api/feedback-testimonials.test.ts**: 1 tests, 1 suites

- **test/api/feedback-token.test.ts**: 1 tests, 1 suites

- **test/api/feedback.test.ts**: 2 tests, 3 suites

- **test/api/integrations-google-calendar.test.ts**: 5 tests, 4 suites

- **test/api/integrations-hubspot.test.ts**: 8 tests, 4 suites

- **test/api/integrations-mailchimp.test.ts**: 1 tests, 1 suites

- **test/api/integrations-outlook-calendar.test.ts**: 10 tests, 4 suites

- **test/api/integrations-quickbooks-customer.test.ts**: 8 tests, 1 suites

- **test/api/integrations-quickbooks-invoice.test.ts**: 7 tests, 1 suites

- **test/api/integrations-quickbooks-status.test.ts**: 3 tests, 2 suites

- **test/api/integrations.test.ts**: 14 tests, 6 suites

- **test/api/invoices-from-job.test.ts**: 1 tests, 1 suites

- **test/api/invoices-line-items.test.ts**: 7 tests, 4 suites

- **test/api/invoices-payments.test.ts**: 2 tests, 3 suites

- **test/api/invoices-send.test.ts**: 1 tests, 1 suites

- **test/api/invoices-stats.test.ts**: 1 tests, 1 suites

- **test/api/invoices-void.test.ts**: 1 tests, 1 suites

- **test/api/invoices.test.ts**: 12 tests, 3 suites

- **test/api/job-management-sub-routes.test.ts**: 1 tests, 1 suites

- **test/api/jobs-available-crew.test.ts**: 1 tests, 1 suites

- **test/api/jobs-calendar.test.ts**: 1 tests, 1 suites

- **test/api/jobs-change-orders.test.ts**: 1 tests, 1 suites

- **test/api/jobs-checklist.test.ts**: 5 tests, 3 suites

- **test/api/jobs-complete.test.ts**: 5 tests, 4 suites

- **test/api/jobs-crew.test.ts**: 2 tests, 3 suites

- **test/api/jobs-disposal.test.ts**: 8 tests, 4 suites

- **test/api/jobs-equipment.test.ts**: 8 tests, 4 suites

- **test/api/jobs-from-proposal.test.ts**: 1 tests, 1 suites

- **test/api/jobs-id.test.ts**: 13 tests, 4 suites

- **test/api/jobs-materials.test.ts**: 4 tests, 4 suites

- **test/api/jobs-notes.test.ts**: 7 tests, 3 suites

- **test/api/jobs-status.test.ts**: 6 tests, 2 suites

- **test/api/jobs-time-entries.test.ts**: 1 tests, 1 suites

- **test/api/jobs.test.ts**: 11 tests, 3 suites

- **test/api/leads-webhook.test.ts**: 4 tests, 3 suites

- **test/api/notifications-count.test.ts**: 1 tests, 1 suites

- **test/api/notifications-mark-read.test.ts**: 1 tests, 1 suites

- **test/api/notifications-preferences.test.ts**: 1 tests, 1 suites

- **test/api/notifications-read-all.test.ts**: 1 tests, 1 suites

- **test/api/notifications.test.ts**: 5 tests, 3 suites

- **test/api/onboard-complete.test.ts**: 3 tests, 2 suites

- **test/api/openapi.test.ts**: 3 tests, 2 suites

- **test/api/pipeline.test.ts**: 2 tests, 3 suites

- **test/api/platform-organizations.test.ts**: 3 tests, 1 suites

- **test/api/platform-stats.test.ts**: 3 tests, 2 suites

- **test/api/portal-proposal.test.ts**: 5 tests, 2 suites

- **test/api/proposals-id-send.test.ts**: 1 tests, 1 suites

- **test/api/proposals-id.test.ts**: 9 tests, 4 suites

- **test/api/proposals-sign.test.ts**: 4 tests, 1 suites

- **test/api/proposals.test.ts**: 9 tests, 3 suites

- **test/api/reports-export.test.ts**: 1 tests, 1 suites

- **test/api/reports-id.test.ts**: 1 tests, 1 suites

- **test/api/reports-type-run.test.ts**: 1 tests, 1 suites

- **test/api/reports.test.ts**: 2 tests, 3 suites

- **test/api/segments-id-calculate.test.ts**: 1 tests, 1 suites

- **test/api/segments-id-sync-hubspot.test.ts**: 1 tests, 1 suites

- **test/api/segments-id-sync-mailchimp.test.ts**: 1 tests, 1 suites

- **test/api/segments.test.ts**: 2 tests, 3 suites

- **test/api/settings-disposal-fees.test.ts**: 5 tests, 5 suites

- **test/api/settings-equipment-rates.test.ts**: 5 tests, 5 suites

- **test/api/settings-labor-rates.test.ts**: 5 tests, 5 suites

- **test/api/settings-material-costs.test.ts**: 5 tests, 5 suites

- **test/api/settings-pricing.test.ts**: 4 tests, 3 suites

- **test/api/settings-travel-rates.test.ts**: 5 tests, 5 suites

- **test/api/sms-messages.test.ts**: 1 tests, 1 suites

- **test/api/sms-send.test.ts**: 5 tests, 1 suites

- **test/api/sms-settings.test.ts**: 1 tests, 1 suites

- **test/api/sms-templates.test.ts**: 1 tests, 1 suites

- **test/api/v1-customers-id.test.ts**: 1 tests, 1 suites

- **test/api/v1-customers.test.ts**: 7 tests, 3 suites

- **test/api/v1-estimates.test.ts**: 1 tests, 1 suites

- **test/api/v1-invoices.test.ts**: 1 tests, 1 suites

- **test/api/v1-jobs-id.test.ts**: 1 tests, 1 suites

- **test/api/v1-jobs.test.ts**: 1 tests, 1 suites

- **test/api/webhooks-id.test.ts**: 1 tests, 1 suites

- **test/api/webhooks-stripe.test.ts**: 15 tests, 1 suites

- **test/api/webhooks-twilio-inbound.test.ts**: 1 tests, 1 suites

- **test/api/webhooks-twilio-status.test.ts**: 1 tests, 1 suites

- **test/api/webhooks.test.ts**: 2 tests, 2 suites

- **test/components/customers/CustomerForm.test.tsx**: 10 tests, 1 suites

- **test/components/customers/CustomerSearch.test.tsx**: 12 tests, 1 suites

- **test/components/customers/CustomerStatusBadge.test.tsx**: 10 tests, 1 suites

- **test/components/ui/button.test.tsx**: 10 tests, 1 suites

- **test/components/ui/input.test.tsx**: 10 tests, 1 suites

- **test/hooks/use-customers.test.tsx**: 15 tests, 8 suites

- **test/hooks/use-multi-tenant-auth.test.tsx**: 17 tests, 8 suites

- **test/integration/auth-multi-tenant-isolation.test.ts**: 10 tests, 5 suites

- **test/integration/customer-workflow.test.tsx**: 22 tests, 10 suites

- **test/lib/api-handler-auth.test.ts**: 13 tests, 5 suites

- **test/lib/date-utils.test.ts**: 16 tests, 5 suites

- **test/lib/estimate-constants.test.ts**: 46 tests, 15 suites

- **test/lib/secure-error-handler.test.ts**: 36 tests, 4 suites

- **test/lib/survey-mappers.test.ts**: 35 tests, 4 suites

- **test/lib/utils.test.ts**: 33 tests, 4 suites

- **test/middleware/api-key-auth.test.ts**: 14 tests, 4 suites

- **test/middleware/rate-limit.test.ts**: 60 tests, 5 suites

- **test/performance/large-dataset.test.tsx**: 12 tests, 3 suites

- **test/services/ai-estimate-service.test.ts**: 26 tests, 4 suites

- **test/services/api-key-service.test.ts**: 22 tests, 8 suites

- **test/services/customers.test.ts**: 20 tests, 9 suites

- **test/services/estimate-calculator.test.ts**: 24 tests, 3 suites

- **test/services/quickbooks-service.test.ts**: 25 tests, 11 suites

- **test/services/sms-service.test.ts**: 25 tests, 14 suites

- **test/types/database.test.ts**: 11 tests, 5 suites

- **test/utils/sanitize.test.ts**: 58 tests, 10 suites

- **test/utils.test.ts**: 22 tests, 5 suites

- **test/validations/common.test.ts**: 43 tests, 14 suites

- **test/validations/customer-extended.test.ts**: 45 tests, 12 suites

- **test/validations/customer.test.ts**: 22 tests, 6 suites

- **test/validations/estimates.test.ts**: 58 tests, 9 suites

- **test/validations/invoices.test.ts**: 46 tests, 12 suites

- **test/validations/jobs.test.ts**: 69 tests, 22 suites

- **test/validations/proposals.test.ts**: 45 tests, 8 suites

- **test/validations/site-survey-extended.test.ts**: 46 tests, 11 suites

- **test/validations/site-survey.test.ts**: 15 tests, 2 suites


## Next Steps

1. **Immediate (Week 1)**:
   - Add tests for critical API routes (customers, jobs, estimates, invoices)
   - Test authentication and authorization flows
   - Add tests for payment processing

2. **Short Term (Weeks 2-4)**:
   - Test all remaining API routes
   - Add component tests for forms and critical UI
   - Test business logic services

3. **Medium Term (Weeks 5-8)**:
   - Add integration tests
   - Test error handling and edge cases
   - Add performance tests

4. **Long Term (Ongoing)**:
   - Maintain 80%+ coverage
   - Add E2E tests for critical user journeys
   - Set up automated coverage reporting

## Coverage Targets

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| api | 0% | 80% | HIGH |
| components | 0% | 80% | HIGH |
| lib | 0% | 80% | HIGH |
| types | 50% | 80% | MEDIUM |
| hooks | 0% | 80% | HIGH |
| services | 0% | 80% | HIGH |
| utils | 0% | 80% | HIGH |
| validations | 0% | 80% | HIGH |
