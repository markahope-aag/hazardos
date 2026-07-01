import { describe, it, expect, vi, beforeEach } from 'vitest'

// withCronLogging must write cron_runs via the SERVICE-ROLE client — a cron has
// no user session, so the cookie client would be rejected by RLS. These tests
// pin that contract plus the ok / failed / insert-rejected paths.
const { adminMock, fromMock } = vi.hoisted(() => {
  const fromMock = vi.fn()
  return { adminMock: vi.fn(() => ({ from: fromMock })), fromMock }
})

vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: adminMock }))
vi.mock('@/lib/services/notification-service', () => ({
  NotificationService: { createForRole: vi.fn(async () => {}) },
}))

import { withCronLogging } from '@/lib/services/cron-runner'

function makeSupabase(insertResult: { data: { id: string } | null; error: unknown }) {
  const single = vi.fn(async () => insertResult)
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  const eq = vi.fn(async () => ({ error: null }))
  const update = vi.fn(() => ({ eq }))
  return { builder: { insert, update }, spies: { insert, update, eq } }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('withCronLogging', () => {
  it('writes a cron_runs row via the service-role client and returns the run id', async () => {
    const { builder, spies } = makeSupabase({ data: { id: 'run-1' }, error: null })
    fromMock.mockReturnValue(builder)

    const result = await withCronLogging('credential-expiry', async () => ({
      summary: { scanned: 3 },
      failureCount: 0,
    }))

    expect(adminMock).toHaveBeenCalled() // service-role, not the cookie client
    expect(spies.insert).toHaveBeenCalledWith(
      expect.objectContaining({ cron_name: 'credential-expiry', status: 'running' }),
    )
    expect(spies.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'ok' }))
    expect(result).toEqual(expect.objectContaining({ run_id: 'run-1', status: 'ok' }))
  })

  it('reports partial status when the work returns a non-zero failureCount', async () => {
    const { builder, spies } = makeSupabase({ data: { id: 'run-2' }, error: null })
    fromMock.mockReturnValue(builder)

    const result = await withCronLogging('appointment-reminders', async () => ({
      summary: { sent: 1 },
      failureCount: 2,
    }))

    expect(spies.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'partial', failure_count: 2 }))
    expect(result.status).toBe('partial')
  })

  it('marks the run failed and rethrows when the work throws', async () => {
    const { builder, spies } = makeSupabase({ data: { id: 'run-3' }, error: null })
    fromMock.mockReturnValue(builder)

    await expect(
      withCronLogging('photo-lifecycle', async () => {
        throw new Error('boom')
      }),
    ).rejects.toThrow('boom')

    expect(spies.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }))
  })

  it('still runs the work and returns run_id null when the log insert is rejected', async () => {
    const { builder, spies } = makeSupabase({ data: null, error: { message: 'RLS denied' } })
    fromMock.mockReturnValue(builder)

    const result = await withCronLogging('credential-expiry', async () => ({
      summary: { scanned: 0 },
      failureCount: 0,
    }))

    expect(result.run_id).toBeNull()
    expect(result.status).toBe('ok')
    // No runId, so no update attempt — but the work still completed.
    expect(spies.update).not.toHaveBeenCalled()
  })
})
