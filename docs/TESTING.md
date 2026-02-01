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

### Coverage Goals

| Category | Target | Current |
|----------|--------|---------|
| **Overall** | 80% | In Progress |
| **Critical Paths** | 100% | In Progress |
| **API Routes** | 90% | In Progress |
| **Components** | 70% | In Progress |
| **Utilities** | 100% | In Progress |

### Generating Coverage Reports

```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/index.html
```

### Coverage Report Locations

```
coverage/
├── index.html          # HTML coverage report
├── lcov.info           # LCOV format for CI tools
└── coverage-summary.json
```

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
