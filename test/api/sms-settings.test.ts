import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/sms/settings/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/sms-service', () => ({
  SmsService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { SmsService } from '@/lib/services/sms-service'

describe('SMS Settings API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  const setupAuthenticatedUser = (role = 'admin') => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockProfile, role },
            error: null
          })
        })
      })
    } as any)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/sms/settings', () => {
    it('should return SMS settings', async () => {
      setupAuthenticatedUser()

      const mockSettings = {
        sms_enabled: true,
        appointment_reminders_enabled: true,
        appointment_reminder_hours: 24,
        quiet_hours_enabled: true,
        quiet_hours_start: '21:00',
        quiet_hours_end: '08:00',
      }
      vi.mocked(SmsService.getSettings).mockResolvedValue(mockSettings)

      const request = new NextRequest('http://localhost:3000/api/sms/settings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockSettings)
      expect(SmsService.getSettings).toHaveBeenCalledWith('org-123')
    })

    it('should return default settings when none exist', async () => {
      setupAuthenticatedUser()

      vi.mocked(SmsService.getSettings).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/sms/settings')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sms_enabled).toBe(false)
    })
  })

  describe('PATCH /api/sms/settings', () => {
    it('should update SMS settings', async () => {
      setupAuthenticatedUser('admin')

      const updatedSettings = {
        sms_enabled: true,
        appointment_reminders_enabled: false,
      }
      vi.mocked(SmsService.updateSettings).mockResolvedValue(updatedSettings)

      const request = new NextRequest('http://localhost:3000/api/sms/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sms_enabled: true,
          appointment_reminders_enabled: false,
        }),
      })

      const response = await PATCH(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(updatedSettings)
      expect(SmsService.updateSettings).toHaveBeenCalledWith('org-123', expect.any(Object))
    })

    it('should reject update from non-admin user', async () => {
      setupAuthenticatedUser('user')

      const request = new NextRequest('http://localhost:3000/api/sms/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sms_enabled: true,
        }),
      })

      const response = await PATCH(request)

      expect(response.status).toBe(403)
    })
  })
})
