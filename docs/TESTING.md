# HazardOS Testing Guide

**Comprehensive testing documentation for the HazardOS platform**

> **Last Updated**: February 1, 2026
> **Status**: Active Development

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Structure and Organization](#test-structure-and-organization)
3. [Testing Stack](#testing-stack)
4. [Running Tests](#running-tests)
5. [Writing Tests](#writing-tests)
6. [Test Patterns and Best Practices](#test-patterns-and-best-practices)
7. [Mocking Strategies](#mocking-strategies)
8. [Test Coverage](#test-coverage)
9. [CI/CD Integration](#cicd-integration)

---

## Testing Philosophy

### Core Principles

HazardOS follows a pragmatic testing approach focused on reliability and maintainability:

1. **Simple** - Tests should be easy to understand and maintain
2. **Non-Flaky** - Tests must produce reliable, deterministic results
3. **Useful** - Test real behavior and business logic, not implementation details
4. **Minimal Mocking** - Mock only external dependencies (APIs, databases), test real code paths

### Testing Priorities

```
Integration Tests > Unit Tests > E2E Tests
      (Preferred)     (Targeted)   (Critical paths)
```

**Why Integration Tests?**
- Test real user workflows
- Catch integration bugs early
- Provide confidence in feature completeness
- Test multiple components working together

**When to Use Unit Tests**:
- Complex utility functions
- Business logic calculations
- Validation schemas
- Pure functions with multiple edge cases

**When to Use E2E Tests**:
- Critical user journeys
- Multi-page workflows
- Payment processes
- Authentication flows

### Mobile-First Testing

Given HazardOS's mobile-first design, tests should:
- Verify touch-friendly interactions
- Test offline functionality
- Validate responsive layouts
- Check mobile performance

---

## Test Structure and Organization

### Directory Structure

```
test/
├── setup.ts                    # Global test configuration
├── helpers/
│   └── mock-data.ts           # Shared mock data generators
├── api/                        # API route tests
│   ├── customers.test.ts      # GET/POST /api/customers
│   ├── jobs.test.ts           # Jobs API
│   ├── jobs-id.test.ts        # Job operations
│   ├── invoices.test.ts       # Invoice API
│   ├── estimates.test.ts      # Estimates API
│   ├── proposals.test.ts      # Proposal generation
│   ├── proposals-id.test.ts   # Proposal operations
│   ├── analytics.test.ts      # Analytics endpoints
│   ├── settings-pricing.test.ts # Pricing configuration
│   └── integrations.test.ts   # External integrations
├── components/                 # Component tests
│   ├── ui/
│   │   ├── button.test.tsx
│   │   └── input.test.tsx
│   └── customers/
│       ├── CustomerForm.test.tsx
│       ├── CustomerSearch.test.tsx
│       └── CustomerStatusBadge.test.tsx
├── services/                   # Service layer tests
│   └── customers.test.ts
├── hooks/                      # Custom hook tests
│   └── use-customers.test.tsx
├── integration/                # Integration tests
│   └── customer-workflow.test.tsx
├── performance/                # Performance tests
│   └── large-dataset.test.tsx
├── validations/                # Schema validation tests
│   ├── customer.test.ts
│   └── site-survey.test.ts
├── lib/                        # Library function tests
│   └── date-utils.test.ts
└── types/                      # Type definition tests
    └── database.test.ts
```

### Test File Naming

- **Unit tests**: `*.test.ts` or `*.test.tsx`
- **Integration tests**: `*-workflow.test.tsx`
- **Performance tests**: `*-performance.test.tsx`
- Place tests near the code they test or in `/test` directory

---

## Testing Stack

### Core Testing Framework

| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | 4.0.18 | Test runner and assertion library |
| **@testing-library/react** | 16.3.2 | React component testing utilities |
| **@testing-library/user-event** | 14.6.1 | User interaction simulation |
| **@testing-library/jest-dom** | 6.9.1 | Custom DOM matchers |
| **happy-dom** | 20.4.0 | Fast DOM implementation |
| **jsdom** | 27.4.0 | DOM environment for tests |
| **@vitest/coverage-v8** | 4.0.18 | Code coverage reporting |

### Configuration

**vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    globals: true,
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
```

**test/setup.ts** provides:
- Global test mocks (Next.js router, Supabase client)
- Browser API mocks (ResizeObserver, IntersectionObserver, matchMedia)
- Environment variables
- Testing library extensions

---

## Running Tests

### Available Commands

```bash
# Run all tests in watch mode (development)
npm run test

# Run tests once (CI/CD)
npm run test:run

# Generate coverage report
npm run test:coverage

# Run tests with UI (browser-based)
npm run test:ui

# Run tests in watch mode
npm run test:watch
```

### Running Specific Tests

```bash
# Run specific test file
npm run test customers.test.ts

# Run tests matching pattern
npm run test -- --grep "Customer API"

# Run tests in specific directory
npm run test test/api/

# Run tests with coverage for specific file
npm run test:coverage -- customers.test.ts
```

### Development Workflow

```bash
# 1. Start dev server (terminal 1)
npm run dev

# 2. Run tests in watch mode (terminal 2)
npm run test

# 3. Make code changes - tests auto-rerun
```

### Pre-Commit Testing

```bash
# Run all quality checks before committing
npm run pre-commit

# This runs:
# - TypeScript type checking
# - ESLint linting
# - Full test suite
# - Production build
```

---

## Writing Tests

### Test Structure

Follow the **AAA Pattern**: Arrange, Act, Assert

```typescript
describe('Feature Name', () => {
  describe('Specific Behavior', () => {
    it('should do something when condition is met', async () => {
      // Arrange - Set up test data and mocks
      const mockData = createMockCustomer({ name: 'Test Customer' })
      vi.mocked(CustomersService.getCustomer).mockResolvedValue(mockData)

      // Act - Execute the behavior being tested
      const result = await getCustomer('customer-id')

      // Assert - Verify the outcome
      expect(result).toEqual(mockData)
      expect(CustomersService.getCustomer).toHaveBeenCalledWith('customer-id')
    })
  })
})
```

### API Route Testing

Test Next.js API routes using the NextRequest API:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/customers/route'

describe('Customers API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/customers', () => {
    it('should return customers list', async () => {
      // Mock the service
      const mockCustomers = createMockCustomerArray(2)
      const { CustomersService } = await import('@/lib/supabase/customers')
      vi.mocked(CustomersService.getCustomers).mockResolvedValue(mockCustomers)

      // Create request
      const request = new NextRequest('http://localhost:3000/api/customers')

      // Execute
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.customers).toEqual(mockCustomers)
    })

    it('should handle query parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/customers?status=prospect')
      await GET(request)

      expect(CustomersService.getCustomers).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ status: 'prospect' })
      )
    })
  })

  describe('POST /api/customers', () => {
    it('should create customer with valid data', async () => {
      const newCustomer = { name: 'New Customer', email: 'new@example.com' }
      const createdCustomer = createMockCustomer(newCustomer)

      vi.mocked(CustomersService.createCustomer).mockResolvedValue(createdCustomer)

      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify(newCustomer),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.name).toBe(newCustomer.name)
    })

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/customers', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@example.com' }),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('name')
    })
  })
})
```

### Component Testing

Test React components with user interactions:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CustomerForm from '@/components/customers/CustomerForm'

describe('CustomerForm', () => {
  it('should submit form with valid data', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(<CustomerForm onSubmit={onSubmit} />)

    // Fill out form
    await user.type(screen.getByLabelText(/name/i), 'John Doe')
    await user.type(screen.getByLabelText(/email/i), 'john@example.com')

    // Submit
    await user.click(screen.getByRole('button', { name: /save/i }))

    // Verify
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'John Doe',
          email: 'john@example.com'
        })
      )
    })
  })

  it('should show validation errors', async () => {
    const user = userEvent.setup()

    render(<CustomerForm onSubmit={vi.fn()} />)

    // Submit without filling required fields
    await user.click(screen.getByRole('button', { name: /save/i }))

    // Verify error messages
    expect(screen.getByText(/name is required/i)).toBeInTheDocument()
  })
})
```

### Integration Testing

Test complete user workflows:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CustomerListPage from '@/app/(dashboard)/customers/page'

describe('Customer Workflow Integration', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  it('should complete full customer creation workflow', async () => {
    const user = userEvent.setup()

    // Mock initial empty list
    vi.mocked(CustomersService.getCustomers).mockResolvedValue([])

    const Wrapper = createWrapper()
    render(<Wrapper><CustomerListPage /></Wrapper>)

    // 1. Open create modal
    await user.click(screen.getByRole('button', { name: /new customer/i }))
    expect(screen.getByText(/create customer/i)).toBeInTheDocument()

    // 2. Fill form
    await user.type(screen.getByLabelText(/name/i), 'New Customer')
    await user.type(screen.getByLabelText(/email/i), 'new@example.com')

    // 3. Submit
    vi.mocked(CustomersService.createCustomer).mockResolvedValue(
      createMockCustomer({ name: 'New Customer' })
    )
    await user.click(screen.getByRole('button', { name: /save/i }))

    // 4. Verify customer created
    await waitFor(() => {
      expect(CustomersService.createCustomer).toHaveBeenCalled()
    })

    // 5. Verify modal closed
    await waitFor(() => {
      expect(screen.queryByText(/create customer/i)).not.toBeInTheDocument()
    })
  })
})
```

### Hook Testing

Test custom React hooks:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCustomers } from '@/lib/hooks/use-customers'

describe('useCustomers', () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    return ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }

  it('should fetch customers', async () => {
    const mockCustomers = createMockCustomerArray(2)
    vi.mocked(CustomersService.getCustomers).mockResolvedValue(mockCustomers)

    const { result } = renderHook(() => useCustomers(), {
      wrapper: createWrapper()
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockCustomers)
  })
})
```

---

## Test Patterns and Best Practices

### 1. Use Descriptive Test Names

```typescript
// ❌ Bad
it('works', () => { ... })

// ✅ Good
it('should return customer list when authenticated user requests', () => { ... })
```

### 2. Test Behavior, Not Implementation

```typescript
// ❌ Bad - Testing implementation details
it('should call useState with initial value', () => { ... })

// ✅ Good - Testing user-facing behavior
it('should display customer name in the list', () => { ... })
```

### 3. Avoid Over-Mocking

```typescript
// ❌ Bad - Mocking too much
vi.mock('react')
vi.mock('react-dom')
vi.mock('@/components/ui/button')

// ✅ Good - Mock only external dependencies
vi.mock('@/lib/supabase/customers')
```

### 4. Use Test Data Builders

```typescript
// Create reusable test data generators
export const createMockCustomer = (overrides = {}) => ({
  id: 'customer-1',
  name: 'Test Customer',
  email: 'test@example.com',
  ...overrides
})

// Use in tests
const customer = createMockCustomer({ name: 'John Doe' })
```

### 5. Test Error Cases

```typescript
describe('Error Handling', () => {
  it('should show error message when API fails', async () => {
    vi.mocked(CustomersService.getCustomers).mockRejectedValue(
      new Error('API Error')
    )

    render(<CustomerList />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

### 6. Test Accessibility

```typescript
describe('Accessibility', () => {
  it('should have proper ARIA labels', () => {
    render(<CustomerForm />)

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
  })

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<CustomerForm />)

    await user.tab()
    expect(document.activeElement).toHaveAttribute('name', 'name')
  })
})
```

### 7. Test Mobile Interactions

```typescript
describe('Mobile Responsiveness', () => {
  it('should render properly on mobile viewport', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375 })

    render(<CustomerList />)

    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('should have touch-friendly button sizes', () => {
    render(<CustomerForm />)

    const button = screen.getByRole('button', { name: /save/i })
    const styles = getComputedStyle(button)
    const height = parseInt(styles.height)

    expect(height).toBeGreaterThanOrEqual(44) // Minimum touch target
  })
})
```

### 8. Test Async Operations

```typescript
it('should handle async data loading', async () => {
  vi.mocked(CustomersService.getCustomers).mockImplementation(
    () => new Promise(resolve => setTimeout(() => resolve([]), 100))
  )

  render(<CustomerList />)

  // Show loading state
  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  // Wait for data
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
  })
})
```

---

## Mocking Strategies

### Mock Supabase Client

Global Supabase mock in `test/setup.ts`:

```typescript
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  }),
}))
```

### Mock Next.js Router

```typescript
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))
```

### Mock Services

```typescript
// Mock at the module level
vi.mock('@/lib/supabase/customers', () => ({
  CustomersService: {
    getCustomers: vi.fn(),
    createCustomer: vi.fn(),
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
  }
}))

// Use in tests
const { CustomersService } = await import('@/lib/supabase/customers')
vi.mocked(CustomersService.getCustomers).mockResolvedValue(mockData)
```

### Mock Environment Variables

```typescript
// In test/setup.ts
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
```

### Mock Browser APIs

```typescript
// In test/setup.ts
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
})
```

---

## Test Coverage

### Current Test Suite

**API Route Tests** (26 test files):
- `test/api/customers.test.ts` - Customer management API
- `test/api/jobs.test.ts` - Job listing and creation
- `test/api/jobs-id.test.ts` - Job operations by ID
- `test/api/jobs-complete.test.ts` - Job completion workflow
- `test/api/invoices.test.ts` - Invoice management
- `test/api/invoices-payments.test.ts` - Invoice payment processing
- `test/api/estimates.test.ts` - Estimate creation and listing
- `test/api/estimates-approve.test.ts` - Estimate approval workflow
- `test/api/proposals.test.ts` - Proposal management
- `test/api/proposals-id.test.ts` - Proposal operations
- `test/api/proposals-sign.test.ts` - Proposal signing
- `test/api/analytics.test.ts` - Analytics endpoints
- `test/api/settings-pricing.test.ts` - Pricing configuration
- `test/api/integrations.test.ts` - External integrations
- `test/api/integrations-quickbooks-customer.test.ts` - QuickBooks customer sync
- `test/api/integrations-quickbooks-invoice.test.ts` - QuickBooks invoice sync
- `test/api/commissions.test.ts` - Commission management
- `test/api/billing-checkout.test.ts` - Stripe checkout
- `test/api/billing-subscription.test.ts` - Subscription management
- `test/api/billing-portal.test.ts` - Customer billing portal
- `test/api/billing-plans.test.ts` - Subscription plans
- `test/api/billing-features.test.ts` - Feature gating
- `test/api/billing-invoices.test.ts` - Stripe invoices
- `test/api/webhooks-stripe.test.ts` - Stripe webhooks
- `test/api/ai-estimate.test.ts` - AI estimate generation
- `test/api/ai-photo-analysis.test.ts` - AI photo analysis

**Service Tests** (6 test files):
- `test/services/customers.test.ts` - Customer service
- `test/services/estimate-calculator.test.ts` - Estimate calculations (24 tests)
- `test/services/quickbooks-service.test.ts` - QuickBooks integration
- `test/services/sms-service.test.ts` - SMS communications
- `test/services/ai-estimate-service.test.ts` - AI estimate service
- `test/services/api-key-service.test.ts` - API key management

**Middleware Tests** (2 test files):
- `test/middleware/rate-limit.test.ts` - Rate limiting middleware
- `test/middleware/api-key-auth.test.ts` - API key authentication

**Auth Tests** (1 test file):
- `test/lib/api-handler-auth.test.ts` - API authentication handlers

**Hook Tests** (2 test files):
- `test/hooks/use-customers.test.tsx` - Customer hooks
- `test/hooks/use-multi-tenant-auth.test.tsx` - Multi-tenant auth hooks

**Integration Tests** (2 test files):
- `test/integration/customer-workflow.test.tsx` - End-to-end customer flow
- `test/integration/auth-multi-tenant-isolation.test.ts` - Multi-tenant isolation

### Coverage Goals

| Category | Target | Current | Status |
|----------|--------|---------|--------|
| **Overall** | 80% | ~40% | In Progress |
| **Critical Paths** | 100% | ~65% | In Progress |
| **API Routes** | 90% | ~56% (26/46) | In Progress |
| **Services** | 95% | ~85% (6/7) | Good |
| **Middleware** | 100% | 100% (2/2) | Excellent |
| **Auth Handlers** | 100% | 100% | Excellent |
| **Components** | 70% | ~8% (5/61) | Pending |
| **Utilities** | 100% | ~85% | Good |
| **Integration Tests** | - | 2 workflows | Good |

**Test Suite Statistics:**
- Total Test Files: 61
- Total Test Cases: ~1,157
- Lines of Test Code: ~13,917
- API Test Files: 26
- Service Test Files: 6
- Component Test Files: 5
- Middleware Test Files: 2
- Integration Test Files: 2

### API Test Suite Details

#### Test Coverage by Route

**Customers API** (`test/api/customers.test.ts` - 15 test cases):
- GET /api/customers - List, search, filter, pagination
- POST /api/customers - Create with validation
- Authentication and authorization
- Input sanitization and security
- Error handling (database errors, malformed JSON)

**Jobs API** (`test/api/jobs.test.ts` - 11 test cases):
- GET /api/jobs - List jobs with filtering
- POST /api/jobs - Create new jobs
- Status filtering and pagination
- Secure error handling
- Foreign key validation

**Jobs [id] API** (`test/api/jobs-id.test.ts` - 9 test cases):
- GET /api/jobs/[id] - Retrieve job by ID
- PATCH /api/jobs/[id] - Update job
- DELETE /api/jobs/[id] - Delete job
- Not found scenarios
- Permission checks

**Invoices API** (`test/api/invoices.test.ts` - 8 test cases):
- GET /api/invoices - List with pagination
- POST /api/invoices - Create invoices
- Status filtering
- Database constraint handling
- Complex query support

**Estimates API** (`test/api/estimates.test.ts` - 8 test cases):
- GET /api/estimates - List estimates
- POST /api/estimates - Create estimates
- Validation and error handling
- Foreign key constraints
- Search functionality

**Proposals API** (`test/api/proposals.test.ts` - 8 test cases):
- GET /api/proposals - List proposals
- POST /api/proposals - Create proposals
- Estimate linkage validation
- RPC function calls
- Malformed input handling

**Proposals [id] API** (`test/api/proposals-id.test.ts` - 6 test cases):
- GET /api/proposals/[id] - Retrieve proposal
- PATCH /api/proposals/[id] - Update proposal
- Status transitions
- Not found scenarios

**Analytics API** (`test/api/analytics.test.ts` - 8 test cases):
- GET /api/analytics/jobs-by-status - Job distribution
- GET /api/analytics/revenue - Revenue analytics
- Date range filtering
- RPC function error handling
- Permission-based access control

**Settings Pricing API** (`test/api/settings-pricing.test.ts` - 6 test cases):
- GET /api/settings/pricing - Retrieve pricing configuration
- PATCH /api/settings/pricing - Update pricing
- Validation of pricing data
- Multi-tenant isolation

**Integrations API** (`test/api/integrations.test.ts` - 5 test cases):
- QuickBooks OAuth flow
- Sync operations
- Connection status
- Error handling

### Test Quality Standards

All tests follow these security and quality standards:

**Security Testing**:
- No internal error details exposed to clients
- Generic error messages for production safety
- Authentication required for all protected routes
- Authorization checks for multi-tenant isolation
- Input validation with Zod schemas
- SQL injection prevention via parameterized queries
- Rate limiting verification
- API key authentication testing

**Error Handling Testing**:
- 401 Unauthorized for missing authentication
- 403 Forbidden for insufficient permissions
- 400 Bad Request for validation errors
- 404 Not Found for missing resources
- 500 Internal Server Error for server issues
- Error responses include error type and user-friendly message
- Webhook signature validation

**Test Structure**:
- Descriptive test names following "should [expected behavior] when [condition]" pattern
- AAA pattern (Arrange, Act, Assert)
- Proper mock cleanup with `beforeEach(() => vi.clearAllMocks())`
- Comprehensive edge case coverage
- Integration tests for complex workflows
- Performance tests for critical paths

**Service Testing**:
- Business logic validation
- External API mocking (QuickBooks, Twilio, Stripe)
- Error recovery scenarios
- Data transformation verification
- Cache behavior testing

### Generating Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html

# Run specific test file
npm run test test/api/customers.test.ts

# Run tests in watch mode during development
npm run test
```

### Coverage Report Locations

```
coverage/
├── index.html          # HTML coverage report
├── lcov.info           # LCOV format for CI tools
└── coverage-summary.json
```

### Test Coverage Analysis Script

The project includes an automated coverage analysis tool:

```bash
# Analyze test coverage and generate report
node scripts/analyze-test-coverage.js
```

This script:
- Scans all API routes, components, services, and hooks
- Compares against existing test files
- Generates detailed coverage report
- Identifies critical gaps
- Provides prioritized recommendations

### Critical Coverage Areas

**Must be tested (100% coverage)**:
- Authentication and authorization logic
- Payment processing
- Data validation and sanitization
- Security-related functions
- Error handling utilities

**High priority (90%+ coverage)**:
- API routes
- Database operations
- Business logic services
- Core user workflows

**Standard coverage (70%+ coverage)**:
- UI components
- Form handlers
- State management
- Utility functions

**Lower priority (<70% acceptable)**:
- Type definitions
- Configuration files
- Development utilities
- Mock data generators

### Monitoring Coverage

```bash
# Run coverage with threshold enforcement
npm run test:coverage -- --coverage.statements=80 --coverage.branches=80
```

---

## CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run type checking
        run: npm run type-check

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test:run

      - name: Generate coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false

      - name: Build application
        run: npm run build
```

### Pre-Commit Hook

Use Husky for pre-commit testing:

```bash
# Install Husky
npm install -D husky

# Create pre-commit hook
npx husky add .husky/pre-commit "npm run pre-commit"
```

### Testing in Vercel Previews

Vercel automatically runs build process, which includes type-checking:

```json
{
  "scripts": {
    "build": "next build",
    "vercel-build": "npm run type-check && npm run lint && npm run test:run && npm run build"
  }
}
```

---

## Troubleshooting

### Common Issues

**Issue: Tests timing out**
```typescript
// Increase timeout for slow operations
it('should complete long operation', async () => {
  // ...
}, 10000) // 10 second timeout
```

**Issue: Flaky tests due to timing**
```typescript
// Use waitFor instead of fixed delays
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument()
}, { timeout: 5000 })
```

**Issue: Mock not working**
```typescript
// Clear mocks between tests
beforeEach(() => {
  vi.clearAllMocks()
})
```

**Issue: Can't find test file**
```typescript
// Check vitest.config.ts alias configuration
resolve: {
  alias: {
    '@': path.resolve(__dirname, './'),
  },
}
```

### Debug Mode

```bash
# Run tests with debugging
npm run test -- --inspect-brk

# Run with verbose output
npm run test -- --reporter=verbose
```

---

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [User Event](https://testing-library.com/docs/user-event/intro)

### Internal Documentation
- [Development Guide](./DEVELOPMENT.md)
- [API Reference](./API-REFERENCE.md)
- [Architecture Guide](./architecture.md)

### Examples
- See `test/` directory for complete examples
- Review `test/integration/customer-workflow.test.tsx` for integration patterns
- Check `test/api/customers.test.ts` for API testing patterns

---

**Document Version**: 1.0
**Last Review**: February 1, 2026
**Next Review**: March 1, 2026
