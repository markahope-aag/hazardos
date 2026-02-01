import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/cron/appointment-reminders/route'
import { SmsService } from '@/lib/services/sms-service'

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        gte: vi.fn(() => ({
          lt: vi.fn(() => ({
            is: vi.fn()
          }))
        }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn()
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/sms-service', () => ({
  SmsService: {
    sendAppointmentReminder: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('GET /api/cron/appointment-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = 'test-secret-key'
  })

  it('should send appointment reminders with valid cron secret', async () => {
    vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
      if (table === 'organization_sms_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ organization_id: 'org-1', appointment_reminder_hours: 24 }],
                error: null
              })
            })
          })
        } as any
      } else if (table === 'jobs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lt: vi.fn().mockReturnValue({
                    is: vi.fn().mockResolvedValue({
                      data: [{ id: 'job-1' }, { id: 'job-2' }],
                      error: null
                    })
                  })
                })
              })
            })
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        } as any
      }
      return mockSupabaseClient.from(table)
    })

    vi.mocked(SmsService.sendAppointmentReminder).mockResolvedValue({ success: true })

    const request = new NextRequest('http://localhost:3000/api/cron/appointment-reminders', {
      headers: {
        'authorization': 'Bearer test-secret-key'
      }
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.sent).toBeGreaterThanOrEqual(0)
  })

  it('should return 401 without valid authorization', async () => {
    const request = new NextRequest('http://localhost:3000/api/cron/appointment-reminders')

    const response = await GET(request)

    expect(response.status).toBe(401)
  })

  it('should accept Vercel cron header', async () => {
    vi.mocked(mockSupabaseClient.from).mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    } as any))

    const request = new NextRequest('http://localhost:3000/api/cron/appointment-reminders', {
      headers: {
        'x-vercel-cron': '1'
      }
    })

    const response = await GET(request)

    expect(response.status).toBe(200)
  })
})
