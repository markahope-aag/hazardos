import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '@/app/api/estimates/[id]/route'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  update: vi.fn(() => mockSupabaseClient),
  delete: vi.fn(() => mockSupabaseClient),
  single: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

describe('Estimate By ID API', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default auth mock - authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })

    // Default profile mock
    mockSupabaseClient.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          ...mockSupabaseClient,
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'profile-123',
              organization_id: 'org-123',
              role: 'admin'
            },
            error: null,
          }),
        }
      }
      return mockSupabaseClient
    })
  })

  describe('GET /api/estimates/[id]', () => {
    it('should return estimate with all relations', async () => {
      // Arrange
      const mockEstimate = {
        id: 'est-123',
        estimate_number: 'EST-001',
        project_name: 'Asbestos Removal',
        status: 'draft',
        total: 5000,
        site_survey: { id: 'survey-1', job_name: 'Test Job' },
        customer: { id: 'cust-1', company_name: 'Acme Corp' },
        created_by_user: { id: 'user-1', first_name: 'John' },
        approved_by_user: null,
        line_items: [
          { id: 'item-1', description: 'Labor', total_price: 3000, sort_order: 0 },
          { id: 'item-2', description: 'Materials', total_price: 2000, sort_order: 1 },
        ],
      }

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockEstimate,
                error: null,
              }),
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123')

      // Act
      const response = await GET(request, { params: Promise.resolve({ id: 'est-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.estimate).toBeDefined()
      expect(data.estimate.line_items).toHaveLength(2)
    })

    it('should return 404 for non-existent estimate', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/non-existent')

      // Act
      const response = await GET(request, { params: Promise.resolve({ id: 'non-existent' }) })

      // Assert
      expect(response.status).toBe(404)
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123')

      // Act
      const response = await GET(request, { params: Promise.resolve({ id: 'est-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('PATCH /api/estimates/[id]', () => {
    it('should update estimate details', async () => {
      // Arrange
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'est-123', status: 'draft' },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: 'est-123',
                      project_name: 'Updated Project',
                      status: 'draft',
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return mockSupabaseClient
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_name: 'Updated Project',
          markup_percent: 20,
        }),
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'est-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.estimate).toBeDefined()
    })

    it('should update estimate status', async () => {
      // Arrange
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'estimates') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'est-123', status: 'draft' },
                    error: null,
                  }),
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'est-123', status: 'sent' },
                    error: null,
                  }),
                }),
              }),
            }),
          }
        }
        return mockSupabaseClient
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'sent',
        }),
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'est-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.estimate.status).toBe('sent')
    })

    it('should return 404 for non-existent estimate', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/non-existent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: 'Updated' }),
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'non-existent' }) })

      // Assert
      expect(response.status).toBe(404)
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_name: 'Updated' }),
      })

      // Act
      const response = await PATCH(request, { params: Promise.resolve({ id: 'est-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe('DELETE /api/estimates/[id]', () => {
    it('should delete estimate with admin role', async () => {
      // Arrange
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'est-123' }) })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should reject deletion from non-admin role', async () => {
      // Arrange
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            ...mockSupabaseClient,
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'profile-123',
                organization_id: 'org-123',
                role: 'crew'
              },
              error: null,
            }),
          }
        }
        return mockSupabaseClient
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'est-123' }) })

      // Assert
      expect(response.status).toBe(403)
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/estimates/est-123', {
        method: 'DELETE',
      })

      // Act
      const response = await DELETE(request, { params: Promise.resolve({ id: 'est-123' }) })

      // Assert
      expect(response.status).toBe(401)
    })
  })
})
