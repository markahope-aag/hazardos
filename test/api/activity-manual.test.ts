import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/activity/manual/route'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ single: vi.fn() }))
    }))
  }))
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/activity-service', () => ({
  Activity: {
    note: vi.fn(),
    call: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

import { Activity } from '@/lib/services/activity-service'

describe('Manual Activity API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile = {
    organization_id: 'org-123',
    role: 'admin'
  }

  describe('POST /api/activity/manual', () => {
    it('should log a manual note activity', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
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

      vi.mocked(Activity.note).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/activity/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          entity_type: 'customer',
          entity_id: 'customer-123',
          entity_name: 'ABC Construction',
          content: 'Customer called to discuss project timeline'
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Activity.note).toHaveBeenCalledWith(
        'customer',
        'customer-123',
        'ABC Construction',
        'Customer called to discuss project timeline'
      )
    })

    it('should log a manual call activity', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
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

      vi.mocked(Activity.call).mockResolvedValue(undefined)

      const request = new NextRequest('http://localhost:3000/api/activity/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'call',
          entity_type: 'lead',
          entity_id: 'lead-456',
          entity_name: 'XYZ Company',
          call_direction: 'outbound',
          call_duration: 180,
          content: 'Discussed estimate for asbestos removal'
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Activity.call).toHaveBeenCalledWith(
        'lead',
        'lead-456',
        'XYZ Company',
        {
          direction: 'outbound',
          duration: 180,
          notes: 'Discussed estimate for asbestos removal'
        }
      )
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/activity/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          entity_type: 'customer',
          entity_id: 'customer-123',
          entity_name: 'ABC Construction',
          content: 'Test note'
        })
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
