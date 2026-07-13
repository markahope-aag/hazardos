import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * X27: "Server returns 500 — toast, no crash." Read queries previously landed
 * in isError silently. reportQueryError bridges query failures to the toaster:
 * server/network errors toast; 4xx client errors and opted-out queries don't.
 */

const toast = vi.hoisted(() => vi.fn())
vi.mock('@/components/ui/use-toast', () => ({ toast, useToast: () => ({ toast }) }))

import { reportQueryError } from '@/components/providers/query-provider'

function withStatus(status: number, message = 'boom'): Error {
  return Object.assign(new Error(message), { status })
}

describe('reportQueryError (X27 global read-error toast)', () => {
  beforeEach(() => toast.mockClear())

  it('toasts on a 500 server error', () => {
    reportQueryError(withStatus(500, 'Internal Server Error'), {})
    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'Internal Server Error' })
    )
  })

  it('toasts on a network/unknown error with no status', () => {
    reportQueryError(new Error('Failed to fetch'), {})
    expect(toast).toHaveBeenCalledTimes(1)
  })

  it('does NOT toast on a 4xx client error', () => {
    reportQueryError(withStatus(404, 'Not Found'), {})
    reportQueryError(withStatus(403, 'Forbidden'), {})
    expect(toast).not.toHaveBeenCalled()
  })

  it('does NOT toast when the query opts out via meta', () => {
    reportQueryError(withStatus(500), { meta: { suppressGlobalErrorToast: true } })
    expect(toast).not.toHaveBeenCalled()
  })
})
