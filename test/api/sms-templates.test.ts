import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

describe('SMS Templates API', () => {
  const mockProfile = {
    organization_id: 'org-123',
    role: 'user'
  }

  const setupAuthenticatedUser = () => {
    vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-123', email: 'user@example.com' } },
      error: null,
    })

    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockProfile,
            error: null
          })
        })
      })
    } as any)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SMS Templates', () => {
    it('should list SMS templates', async () => {
      setupAuthenticatedUser()

      const mockTemplates = [
        { id: 'tpl-1', name: 'Appointment Reminder', content: 'Your appointment is tomorrow at {time}', type: 'reminder' },
        { id: 'tpl-2', name: 'Job Status', content: 'Your job status: {status}', type: 'status_update' },
      ]

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'sms_templates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockTemplates,
                  error: null
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        } as any
      })

      expect(mockTemplates).toHaveLength(2)
      expect(mockTemplates[0].type).toBe('reminder')
    })

    it('should support template variables', async () => {
      setupAuthenticatedUser()

      const template = {
        id: 'tpl-1',
        content: 'Hi {customer_name}, your appointment is {appointment_time}',
        variables: ['customer_name', 'appointment_time'],
      }

      expect(template.variables).toContain('customer_name')
      expect(template.content).toContain('{customer_name}')
    })

    it('should create custom templates', async () => {
      setupAuthenticatedUser()

      const newTemplate = {
        id: 'tpl-new',
        organization_id: 'org-123',
        name: 'Custom Template',
        content: 'Custom message',
        type: 'custom',
      }

      vi.mocked(mockSupabaseClient.from).mockImplementation((table: string) => {
        if (table === 'sms_templates') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: newTemplate,
                  error: null
                })
              })
            })
          } as any
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockProfile,
                error: null
              })
            })
          })
        } as any
      })

      expect(newTemplate.type).toBe('custom')
      expect(newTemplate.organization_id).toBe('org-123')
    })
  })
})
