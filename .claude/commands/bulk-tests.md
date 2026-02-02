---
description: Create simple, non-flaky tests in bulk until 80% coverage is achieved
argument-hint: <target-path> (e.g., lib/utils, lib/services, components)
allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]
---

# Bulk Test Creator

Create simple, useful, non-flaky tests in bulk for the target area: **$ARGUMENTS**

## Core Principles

1. **Simple tests only** - No complex mocks, no elaborate setup
2. **Non-flaky** - Tests must pass consistently, no timing dependencies
3. **Useful** - Each test should catch real bugs, not just exist for coverage
4. **80% target** - Keep going until coverage reaches 80%

## Workflow

### Phase 1: Discovery

1. Find all source files in the target area
2. Check current coverage:
   ```bash
   npx vitest run --coverage $ARGUMENTS
   ```
3. Find existing test patterns to match project style

### Phase 2: Analyze What Needs Testing

For each source file, identify what can be tested simply:

**Prioritize (easy to test):**
- Pure functions (input → output)
- Utility functions
- Validation functions
- Formatters and transformers
- Type guards
- Simple React components (render tests)

**Defer (requires complex mocks):**
- Database operations
- External API calls
- Complex stateful components

### Phase 3: Bulk Test Creation

Create tests in batches, tracking progress:

```
Tests created: X
Current coverage: Y%
Target coverage: 80%
```

#### Test Template

```typescript
import { describe, it, expect } from 'vitest'
import { functionName } from '@/path/to/module'

describe('functionName', () => {
  it('returns expected output for typical input', () => {
    expect(functionName('input')).toBe('expected')
  })

  it('handles empty input', () => {
    expect(functionName('')).toBe('')
  })

  it('handles edge cases gracefully', () => {
    expect(functionName(null)).toBeNull()
  })
})
```

#### For React Components

```typescript
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Component } from '@/components/Component'

describe('Component', () => {
  it('renders without crashing', () => {
    expect(() => render(<Component />)).not.toThrow()
  })
})
```

### Phase 4: Validation Checkpoints

**Every 50 tests**, run validation:

```bash
# TypeScript check
npx tsc --noEmit

# Lint check
npm run lint

# Build check
npm run build

# Run new tests
npx vitest run [new-test-files]
```

**If any check fails:** Fix immediately before continuing.

### Phase 5: Coverage Check

After each batch:

```bash
npx vitest run --coverage $ARGUMENTS
```

**Continue if:** Coverage < 80%
**Stop if:** Coverage >= 80%

## Test File Conventions

| Source File | Test File Location |
|-------------|-------------------|
| `lib/utils/foo.ts` | `__tests__/lib/utils/foo.test.ts` |
| `lib/services/bar.ts` | `__tests__/lib/services/bar.test.ts` |
| `components/Foo.tsx` | `__tests__/components/Foo.test.tsx` |

## What NOT To Do

### Avoid Complex Mocks

```typescript
// BAD - Complex mock chain
vi.mock('@/lib/supabase', () => ({
  createClient: () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ data: {...} })
      }))
    }))
  })
}))

// GOOD - Test pure logic instead
import { transformData } from '@/lib/utils'
expect(transformData(input)).toEqual(expected)
```

### Avoid Timing-Dependent Tests

```typescript
// BAD - Flaky
await new Promise(r => setTimeout(r, 500))
expect(fn).toHaveBeenCalled()

// GOOD - Use fake timers
vi.useFakeTimers()
vi.advanceTimersByTime(500)
expect(fn).toHaveBeenCalled()
vi.useRealTimers()
```

## Progress Reporting

After each batch:

```
## Batch N Complete
- Tests created this batch: X
- Total tests created: Y
- Current coverage: Z%
- Target: 80%

### Validation
- TypeScript: PASS/FAIL
- Lint: PASS/FAIL
- Build: PASS/FAIL
- Tests: PASS/FAIL
```

## Final Report

When 80% coverage is achieved:

```
## Bulk Test Creation Complete

### Summary
- Total tests created: X
- Starting coverage: A%
- Final coverage: B%

### Files Created
- path/to/test1.test.ts (N tests)
- path/to/test2.test.ts (N tests)

### How to Run
npx vitest run $ARGUMENTS
npx vitest run --coverage $ARGUMENTS
```

## Autonomy Rules

**Do without asking:**
- Read source files
- Create test files
- Run tests and validation
- Fix test bugs
- Continue until 80% coverage

**Ask before doing:**
- If target area is unclear
- If source code appears buggy
- If complex mocks seem unavoidable
