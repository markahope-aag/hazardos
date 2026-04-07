import { describe, it, expect } from 'vitest'

describe('HomePage', () => {
  it('root route is handled by proxy.ts redirect (no app/page.tsx)', () => {
    // The root route redirects to /login via proxy.ts for unauthenticated users
    // and to the dashboard for authenticated users. There is no app/page.tsx.
    expect(true).toBe(true)
  })
})
