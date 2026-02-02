import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/sms/templates/route'
import { SmsService } from '@/lib/services/sms-service'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/sms-service', () => ({
  SmsService: {
    getTemplates: vi.fn(),
    createTemplate: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('SMS Templates API', () => {
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

  describe('GET /api/sms/templates', () => {
    it('should list SMS templates', async () => {
      setupAuthenticatedUser()

      const mockTemplates = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Appointment Reminder',
          message_type: 'appointment_reminder',
          body: 'Your appointment is tomorrow at {time}',
          organization_id: 'org-123'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Job Status Update',
          message_type: 'job_status',
          body: 'Your job status: {status}',
          organization_id: 'org-123'
        }
      ]
      vi.mocked(SmsService.getTemplates).mockResolvedValue(mockTemplates)

      const request = new NextRequest('http://localhost:3000/api/sms/templates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data).toHaveLength(2)
      expect(SmsService.getTemplates).toHaveBeenCalledWith('org-123')
    })

    it('should return empty array when no templates', async () => {
      setupAuthenticatedUser()

      vi.mocked(SmsService.getTemplates).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/sms/templates')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('should return 401 for unauthenticated user', async () => {
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/sms/templates')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/sms/templates', () => {
    it('should create SMS template', async () => {
      setupAuthenticatedUser('admin')

      const newTemplate = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        organization_id: 'org-123',
        name: 'Custom Template',
        message_type: 'general',
        body: 'Custom message: {message}'
      }
      vi.mocked(SmsService.createTemplate).mockResolvedValue(newTemplate)

      const request = new NextRequest('http://localhost:3000/api/sms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Custom Template',
          message_type: 'general',
          body: 'Custom message: {message}'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.name).toBe('Custom Template')
      expect(SmsService.createTemplate).toHaveBeenCalledWith(
        'org-123',
        expect.objectContaining({
          name: 'Custom Template',
          message_type: 'general'
        })
      )
    })

    it('should reject creation from non-admin user', async () => {
      setupAuthenticatedUser('user')

      const request = new NextRequest('http://localhost:3000/api/sms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Template',
          message_type: 'general',
          body: 'Message'
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
    })

    it('should validate required fields', async () => {
      setupAuthenticatedUser('admin')

      const request = new NextRequest('http://localhost:3000/api/sms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Template'
          // Missing message_type and body
        })
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should handle service errors securely', async () => {
      setupAuthenticatedUser('admin')

      vi.mocked(SmsService.createTemplate).mockRejectedValue(
        new Error('Database error')
      )

      const request = new NextRequest('http://localhost:3000/api/sms/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Template',
          message_type: 'general',
          body: 'Message'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('An internal server error occurred')
    })
  })
})
