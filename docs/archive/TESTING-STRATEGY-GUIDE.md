# HazardOS Testing Strategy Guide

**Testing Audit Date**: April 7, 2026  
**Current Testing Grade**: B (Comprehensive strategy with coverage gaps)  
**Target**: A+ (85%+ coverage across all layers)

---

## Executive Summary

HazardOS demonstrates a **comprehensive testing strategy** with 399 test files and strong coverage of API routes and business logic. However, **critical gaps** in component testing, RLS policy validation, and end-to-end workflows need immediate attention.

### Current Testing Status
- **Total Test Files**: 399 (excellent organization)
- **Estimated Coverage**: ~75-80% overall
- **API Routes**: 95% coverage ✅
- **Services**: 85% coverage ✅
- **Components**: 8% coverage ⚠️ (needs expansion)
- **Integration**: 2 workflows ⚠️ (needs expansion)

### Testing Strengths ✅
- **Comprehensive API Testing**: 95% of API routes covered
- **Strong Validation Testing**: 99.58% coverage of Zod schemas
- **Multi-Tenant Testing**: Good RBAC and organization isolation coverage
- **Consistent Patterns**: @testing-library/react with proper mocking
- **Business Logic Coverage**: Critical calculations and workflows tested

---

## CRITICAL - Address Immediately

### 1. Component Testing Coverage Gap (HIGH PRIORITY)

**Current State**: Only 8% of components tested (5 of 61 components)

**Critical Missing Coverage**:
- Survey wizard components (mobile-critical)
- Customer management forms
- Dashboard widgets and charts
- CRM components (contacts, companies, opportunities)
- Authentication components

**Impact**: High risk of UI regressions, poor user experience

**Action Plan**:
```typescript
// Priority 1: Core user workflows
describe('CustomerForm', () => {
  it('validates required fields', async () => {
    render(<CustomerForm onSave={vi.fn()} />)
    
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
    expect(screen.getByText(/email is required/i)).toBeInTheDocument()
  })
  
  it('submits valid data', async () => {
    const onSave = vi.fn()
    render(<CustomerForm onSave={onSave} />)
    
    await userEvent.type(screen.getByLabelText(/name/i), 'Test Customer')
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    
    expect(onSave).toHaveBeenCalledWith({
      name: 'Test Customer',
      email: 'test@example.com'
    })
  })
})
```

### 2. RLS Policy Testing Gap (CRITICAL)

**Current State**: No comprehensive Row Level Security testing

**Risk**: Multi-tenant data leakage, security vulnerabilities

**Required Tests**:
```typescript
// RLS Policy Tests
describe('RLS Policies', () => {
  it('should isolate customer data by organization', async () => {
    // Setup: Create customers for different orgs
    const org1Customer = await createCustomer({ organizationId: 'org1' })
    const org2Customer = await createCustomer({ organizationId: 'org2' })
    
    // Test: User from org1 should only see org1 data
    const org1User = await loginAs('user@org1.com')
    const customers = await fetchCustomers(org1User.token)
    
    expect(customers).toContain(org1Customer)
    expect(customers).not.toContain(org2Customer)
  })
  
  it('should allow platform admins cross-org access', async () => {
    const platformAdmin = await loginAs('admin@platform.com')
    const allCustomers = await fetchCustomers(platformAdmin.token)
    
    // Platform admin should see all customers
    expect(allCustomers.length).toBeGreaterThan(0)
  })
})
```

### 3. End-to-End Testing Gap (HIGH PRIORITY)

**Current State**: No E2E test suite

**Risk**: Critical user workflows may break without detection

**Required E2E Tests**:
```typescript
// E2E Tests with Playwright
describe('Customer Lifecycle E2E', () => {
  it('should complete full customer workflow', async ({ page }) => {
    // Login
    await page.goto('/login')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password')
    await page.click('[data-testid="login-button"]')
    
    // Create customer
    await page.goto('/customers')
    await page.click('[data-testid="add-customer"]')
    await page.fill('[data-testid="customer-name"]', 'Test Customer')
    await page.fill('[data-testid="customer-email"]', 'customer@test.com')
    await page.click('[data-testid="save-customer"]')
    
    // Verify customer created
    await expect(page.locator('text=Test Customer')).toBeVisible()
    
    // Create site survey
    await page.click('[data-testid="create-survey"]')
    // ... survey workflow
    
    // Generate estimate
    // ... estimate workflow
    
    // Create job
    // ... job workflow
  })
})
```

---

## HIGH - Fix This Sprint

### 4. Zero Coverage Critical Paths

**Untested Critical Components**:
- `lib/supabase/server.ts` — server-side auth client
- `lib/stores/survey-store.ts` — 649 lines, core mobile survey state
- `lib/services/stripe-service.ts` — payment processing (~570 lines)
- Platform admin components and workflows

**Survey Store Testing**:
```typescript
describe('SurveyStore', () => {
  it('should update area data efficiently', () => {
    const store = useSurveyStore.getState()
    
    // Setup: Add multiple areas
    const areas = Array.from({ length: 100 }, (_, i) => ({
      id: `area-${i}`,
      name: `Area ${i}`,
      hazardType: 'asbestos'
    }))
    
    store.setAreas(areas)
    
    // Test: Update should be fast even with many areas
    const start = performance.now()
    store.updateArea('area-50', { name: 'Updated Area' })
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(10) // Should be under 10ms
    expect(store.getArea('area-50').name).toBe('Updated Area')
  })
})
```

**Stripe Service Testing**:
```typescript
describe('StripeService', () => {
  beforeEach(() => {
    // Mock Stripe SDK
    vi.mock('stripe', () => ({
      default: vi.fn(() => ({
        customers: {
          create: vi.fn(),
          retrieve: vi.fn(),
        },
        subscriptions: {
          create: vi.fn(),
          update: vi.fn(),
        }
      }))
    }))
  })
  
  it('should create customer subscription', async () => {
    const mockStripe = new Stripe('test_key')
    mockStripe.customers.create.mockResolvedValue({ id: 'cus_test' })
    mockStripe.subscriptions.create.mockResolvedValue({ id: 'sub_test' })
    
    const result = await StripeService.createSubscription({
      email: 'test@example.com',
      priceId: 'price_test'
    })
    
    expect(result.customerId).toBe('cus_test')
    expect(result.subscriptionId).toBe('sub_test')
  })
})
```

### 5. Mobile Survey Testing

**Critical Mobile Workflows**:
```typescript
describe('Mobile Survey Wizard', () => {
  it('should handle offline photo uploads', async () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    })
    
    render(<SurveyWizard />)
    
    // Add photo while offline
    const fileInput = screen.getByLabelText(/add photo/i)
    const file = new File(['photo'], 'test.jpg', { type: 'image/jpeg' })
    await userEvent.upload(fileInput, file)
    
    // Photo should be queued
    expect(screen.getByText(/queued for upload/i)).toBeInTheDocument()
    
    // Go online
    Object.defineProperty(navigator, 'onLine', { value: true })
    window.dispatchEvent(new Event('online'))
    
    // Photo should upload
    await waitFor(() => {
      expect(screen.getByText(/uploaded successfully/i)).toBeInTheDocument()
    })
  })
})
```

---

## MEDIUM - Plan for Next Sprint

### 6. Integration Testing Enhancement

**Current Integration Tests**: 2 workflows
**Target**: 10+ critical user workflows

**Required Integration Tests**:
- Complete customer lifecycle (lead → customer → job → payment)
- Site survey workflow (mobile → desktop → estimate)
- Multi-tenant data isolation
- Payment processing workflow
- Job completion workflow

### 7. Performance Testing

**Missing Performance Tests**:
```typescript
describe('Performance Tests', () => {
  it('should load customer list under 200ms', async () => {
    const start = performance.now()
    await loadCustomerList()
    const duration = performance.now() - start
    expect(duration).toBeLessThan(200)
  })
  
  it('should handle large survey data efficiently', async () => {
    const largeSurvey = createSurveyWithAreas(1000)
    
    const start = performance.now()
    await processSurveyData(largeSurvey)
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(1000) // Under 1 second
  })
})
```

### 8. Security Testing

**Required Security Tests**:
```typescript
describe('Security Tests', () => {
  it('should prevent SQL injection in search', async () => {
    const maliciousSearch = "'; DROP TABLE customers; --"
    
    const response = await fetch('/api/v1/customers?search=' + encodeURIComponent(maliciousSearch))
    const data = await response.json()
    
    // Should not throw database error
    expect(response.status).not.toBe(500)
    expect(data.error).not.toContain('SQL')
  })
  
  it('should validate webhook signatures', async () => {
    const invalidSignature = 'invalid-signature'
    
    const response = await fetch('/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'stripe-signature': invalidSignature
      },
      body: JSON.stringify({ type: 'payment_intent.succeeded' })
    })
    
    expect(response.status).toBe(401)
  })
})
```

---

## Testing Infrastructure

### Test Configuration

**Vitest Configuration**:
```typescript
export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./test/setup.ts'],
    coverage: {
      provider: 'v8',
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        }
      },
      exclude: [
        'test/**',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        'types/**'
      ]
    }
  }
})
```

**Test Setup**:
```typescript
// test/setup.ts
import { beforeAll, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```

### Mock Strategies

**Supabase Client Mocking**:
```typescript
export const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockData, error: null }))
        }))
      }))
    }))
  })),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  }
}
```

**External Service Mocking**:
```typescript
// Mock Stripe
vi.mock('stripe', () => ({
  default: vi.fn(() => mockStripeClient)
}))

// Mock Twilio
vi.mock('twilio', () => ({
  default: vi.fn(() => mockTwilioClient)
}))

// Mock file uploads
vi.mock('@/lib/services/photo-upload-service', () => ({
  uploadPhoto: vi.fn(() => Promise.resolve({ url: 'mock-url' }))
}))
```

---

## Testing Standards and Best Practices

### Test Organization

**File Structure**:
```
test/
├── __mocks__/              # Global mocks
├── fixtures/               # Test data
├── helpers/                # Test utilities
├── api/                    # API route tests
├── components/             # Component tests
├── services/               # Service tests
├── hooks/                  # Hook tests
├── integration/            # Integration tests
└── e2e/                    # End-to-end tests
```

### Test Quality Standards

**Requirements**:
- ✅ All tests must be deterministic (no flaky tests)
- ✅ Mock external dependencies (APIs, databases, file system)
- ✅ Test edge cases and error handling
- ✅ Use descriptive test names
- ✅ Follow AAA pattern (Arrange, Act, Assert)

**Example Quality Test**:
```typescript
describe('CustomerService.createCustomer', () => {
  it('should create customer with valid data and return customer with ID', async () => {
    // Arrange
    const customerData = {
      name: 'Test Customer',
      email: 'test@example.com',
      organizationId: 'org-123'
    }
    
    mockSupabaseClient.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'customer-123', ...customerData },
            error: null
          })
        })
      })
    })
    
    // Act
    const result = await CustomerService.createCustomer(customerData)
    
    // Assert
    expect(result).toEqual({
      id: 'customer-123',
      name: 'Test Customer',
      email: 'test@example.com',
      organizationId: 'org-123'
    })
    
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('customers')
  })
})
```

### Coverage Targets

| Layer | Current | Target | Priority |
|-------|---------|--------|----------|
| API Routes | 95% | 95% | ✅ Maintain |
| Services | 85% | 90% | Medium |
| Components | 8% | 70% | 🚨 Critical |
| Hooks | 55% | 80% | High |
| Utils | 89% | 95% | Low |
| Integration | Limited | 80% | High |
| E2E | 0% | Key workflows | 🚨 Critical |

---

## Implementation Roadmap

### Phase 1: Critical Coverage (Week 1-2)
**Target**: Address critical testing gaps

1. **Component Testing Expansion** (Week 1)
   - Survey wizard components
   - Customer management forms
   - Authentication components
   - Dashboard widgets

2. **RLS Policy Testing** (Week 2)
   - Multi-tenant isolation tests
   - Platform admin access tests
   - Security boundary tests

### Phase 2: Integration & E2E (Week 3-4)
**Target**: End-to-end workflow coverage

1. **Integration Tests** (Week 3)
   - Customer lifecycle workflow
   - Site survey workflow
   - Payment processing workflow

2. **E2E Test Suite** (Week 4)
   - Critical user journeys
   - Mobile survey workflow
   - Cross-browser testing

### Phase 3: Performance & Security (Week 5-6)
**Target**: Non-functional testing

1. **Performance Testing** (Week 5)
   - Load testing for key operations
   - Mobile performance testing
   - Database query performance

2. **Security Testing** (Week 6)
   - Penetration testing automation
   - Vulnerability scanning
   - Security regression tests

---

## Success Metrics

### Coverage Targets
- [ ] **Overall Coverage**: 85%+ (from ~75%)
- [ ] **Component Coverage**: 70%+ (from 8%)
- [ ] **Integration Coverage**: 80%+ (from limited)
- [ ] **E2E Coverage**: Key workflows (from 0%)

### Quality Targets
- [ ] **Zero Flaky Tests**: 100% deterministic test suite
- [ ] **Fast Test Suite**: < 2 minutes for full suite
- [ ] **Security Coverage**: All critical security paths tested
- [ ] **Performance Coverage**: All critical performance paths tested

### Business Impact
- [ ] **Reduced Bugs**: 50% reduction in production issues
- [ ] **Faster Development**: Confident refactoring and feature development
- [ ] **Better UX**: Comprehensive UI testing prevents regressions
- [ ] **Security Assurance**: Comprehensive security testing

---

## Continuous Testing

### CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
      - uses: codecov/codecov-action@v3
```

### Quality Gates
- **PR Requirements**: 85%+ coverage, all tests pass
- **Performance Gates**: No performance regression
- **Security Gates**: All security tests pass
- **Mobile Gates**: Mobile-specific tests pass

### Monitoring and Alerts
- **Test Failure Alerts**: Immediate notification on test failures
- **Coverage Regression**: Alert on coverage drops
- **Performance Regression**: Alert on performance test failures
- **Security Regression**: Alert on security test failures

---

**Document Status**: ✅ Current  
**Next Testing Review**: July 1, 2026  
**Implementation Tracking**: [Testing Strategy Project Board](link-to-project-board)