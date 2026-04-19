import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '@/app/api/organizations/me/route'

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }))
}

vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    createApiHandler: (options: any, handler: any) => {
      return async (request: any) => {
        const mockContext = {
          user: { id: 'user-123' },
          profile: { organization_id: 'org-123', role: 'admin' },
          supabase: mockSupabaseClient,
          log: { info: vi.fn(), error: vi.fn() }
        }
        
        // Parse request body if present
        let body = {}
        if (request.body) {
          try {
            const bodyText = await request.text()
            body = JSON.parse(bodyText)
          } catch {
            // ignore
          }
        }
        
        return await handler(request, mockContext, body)
      }
    }
  }
})

describe('Organizations Me API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/organizations/me', () => {
    it('should get own organization details', async () => {
      const mockOrganization = {
        id: 'org-123',
        name: 'ACME Environmental',
        email: 'contact@acme.com',
        phone: '555-0123',
        website: 'https://acme.com',
        license_number: 'ENV-12345',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '90210'
      }

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: mockOrganization,
                  error: null
                })
              }))
            }))
          }
        }
        return mockSupabaseClient.from()
      })

      const request = new NextRequest('http://localhost/api/organizations/me')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.organization).toEqual(mockOrganization)
    })

    it('should handle database errors', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection failed' }
                })
              }))
            }))
          }
        }
        return mockSupabaseClient.from()
      })

      const request = new NextRequest('http://localhost/api/organizations/me')

      await expect(async () => {
        await GET(request)
      }).rejects.toThrow()
    })
  })

  describe('PATCH /api/organizations/me', () => {
    it('should update organization details', async () => {
      const updateData = {
        name: 'ACME Environmental Services',
        email: 'info@acme.com',
        phone: '555-0456'
      }

      const updatedOrganization = {
        id: 'org-123',
        name: 'ACME Environmental Services',
        email: 'info@acme.com',
        phone: '555-0456',
        website: 'https://acme.com',
        license_number: 'ENV-12345',
        address: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '90210'
      }

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: updatedOrganization,
                    error: null
                  })
                }))
              }))
            }))
          }
        }
        return mockSupabaseClient.from()
      })

      const request = new NextRequest('http://localhost/api/organizations/me', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request)

      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.organization).toEqual(updatedOrganization)
    })

    it('should convert empty strings to null', async () => {
      const updateData = {
        name: 'ACME Environmental',
        email: '', // Empty string should become null
        phone: '555-0123',
        website: '' // Empty string should become null
      }

      const updatedOrganization = {
        id: 'org-123',
        name: 'ACME Environmental',
        email: null,
        phone: '555-0123',
        website: null
      }

      let capturedUpdates: any = {}
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            update: vi.fn((updates) => {
              capturedUpdates = updates
              return {
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: updatedOrganization,
                      error: null
                    })
                  }))
                }))
              }
            })
          }
        }
        return mockSupabaseClient.from()
      })

      const request = new NextRequest('http://localhost/api/organizations/me', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request)

      expect(response.status).toBe(200)
      expect(capturedUpdates.email).toBe(null)
      expect(capturedUpdates.website).toBe(null)
      expect(capturedUpdates.name).toBe('ACME Environmental')
      expect(capturedUpdates.phone).toBe('555-0123')
    })

    it('should handle update errors', async () => {
      const updateData = {
        name: 'ACME Environmental'
      }

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                select: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Update failed' }
                  })
                }))
              }))
            }))
          }
        }
        return mockSupabaseClient.from()
      })

      const request = new NextRequest('http://localhost/api/organizations/me', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      await expect(async () => {
        await PATCH(request)
      }).rejects.toThrow()
    })

    it('should skip undefined fields in updates', async () => {
      const updateData = {
        name: 'ACME Environmental',
        email: undefined, // Should be skipped
        phone: '555-0123'
      }

      let capturedUpdates: any = {}
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'organizations') {
          return {
            update: vi.fn((updates) => {
              capturedUpdates = updates
              return {
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: { id: 'org-123', name: 'ACME Environmental', phone: '555-0123' },
                      error: null
                    })
                  }))
                }))
              }
            })
          }
        }
        return mockSupabaseClient.from()
      })

      const request = new NextRequest('http://localhost/api/organizations/me', {
        method: 'PATCH',
        body: JSON.stringify(updateData),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PATCH(request)

      expect(response.status).toBe(200)
      expect(capturedUpdates).not.toHaveProperty('email')
      expect(capturedUpdates.name).toBe('ACME Environmental')
      expect(capturedUpdates.phone).toBe('555-0123')
    })
  })
})