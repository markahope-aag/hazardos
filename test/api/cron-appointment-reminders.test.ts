import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// The cron route now delegates to processDueReminders (from reminder-sender)
// and wraps the work with withCronLogging (from cron-runner). Both of those
// internals have their own unit tests — this file covers only the HTTP
// surface: authentication and response shape.

const { processDueRemindersMock, withCronLoggingMock } = vi.hoisted(() => ({
  processDueRemindersMock: vi.fn(),
  withCronLoggingMock: vi.fn(),
}))

vi.mock('@/lib/services/reminder-sender', () => ({
  processDueReminders: processDueRemindersMock,
}))

vi.mock('@/lib/services/cron-runner', () => ({
  withCronLogging: withCronLoggingMock,
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null)),
}))

import { GET } from '@/app/api/cron/appointment-reminders/route'

describe('GET /api/cron/appointment-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret-key'

    // Default happy path: withCronLogging runs the provided work and hands
    // back a shape resembling what the cron-runner would write on success.
    withCronLoggingMock.mockImplementation(async (_name: string, work: () => Promise<unknown>) => {
      const result = (await work()) as { summary?: unknown }
      return { run_id: 'run-1', status: 'ok', summary: result?.summary }
    })
    processDueRemindersMock.mockResolvedValue({ sent: 2, failed: 0, skipped: 0 })
  })

  it('returns 401 when the authorization header is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/appointment-reminders')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns 401 when the authorization header is wrong', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/appointment-reminders', {
      headers: { authorization: 'Bearer not-the-secret' },
    })
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('runs the reminder processor when the cron secret is valid', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/appointment-reminders', {
      headers: { authorization: 'Bearer test-secret-key' },
    })
    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(processDueRemindersMock).toHaveBeenCalledTimes(1)
    expect(withCronLoggingMock).toHaveBeenCalledTimes(1)

    const body = await response.json()
    expect(body.sent).toBe(2)
    expect(body.failed).toBe(0)
    expect(body.status).toBe('ok')
  })

  it('accepts Vercel cron requests via x-vercel-cron header', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/appointment-reminders', {
      headers: { 'x-vercel-cron': '1' },
    })
    const response = await GET(request)
    expect(response.status).toBe(200)
    expect(processDueRemindersMock).toHaveBeenCalled()
  })

  it('returns 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const request = new NextRequest('http://localhost:3000/api/cron/appointment-reminders', {
      headers: { authorization: 'Bearer anything' },
    })
    const response = await GET(request)
    expect(response.status).toBe(500)
  })
})
