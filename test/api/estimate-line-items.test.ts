import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT } from '@/app/api/estimates/[id]/line-items/route'

const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: null }))
          }))
        }))
      })),
      order: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }))
}

vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    createApiHandlerWithParams: (options: any, handler: any) => {
      return async (request: any, params: any) => {
        const mockContext = {
          user: { id: 'user-123' },
          profile: { organization_id: 'org-123', role: 'user' },
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
        
        return await handler(request, mockContext, await params.params, body)
      }
    }
  }
})

describe('Estimate Line Items API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockParams = { params: Promise.resolve({ id: 'estimate-123' }) }

  describe('GET /api/estimates/[id]/line-items', () => {
    it('should get line items for an estimate', async () => {
      const mockLineItems = [
        {
          id: 'item-1',
          estimate_id: 'estimate-123',
          item_type: 'labor',
          category: 'Inspection',
          description: 'Asbestos inspection',
          quantity: 1,
          unit: 'each',
          unit_price: 500,
          total_price: 500,
          sort_order: 0
        }
      ]

      // Mock estimate verification
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'estimates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'estimate-123' },
                    error: null
                  })
                }))
              }))
            }))
          }
        } else if (table === 'estimate_line_items') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: mockLineItems,
                  error: null
                })
              }))
            }))
          }
        }
        return mockSupabaseClient.from()
      })

      const request = new NextRequest('http://localhost/api/estimates/estimate-123/line-items')
      const response = await GET(request, mockParams)
      
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.line_items).toEqual(mockLineItems)
    })

    it('should return 404 when estimate not found', async () => {
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'estimates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Not found' }
                  })
                }))
              }))
            }))
          }
        }
        return mockSupabaseClient.from()
      })

      const request = new NextRequest('http://localhost/api/estimates/estimate-123/line-items')
      
      await expect(async () => {
        await GET(request, mockParams)
      }).rejects.toThrow('Estimate not found')
    })
  })

  describe('POST /api/estimates/[id]/line-items', () => {
    it('should add a new line item successfully', async () => {
      const newLineItem = {
        id: 'item-new',
        estimate_id: 'estimate-123',
        item_type: 'labor',
        category: 'Inspection',
        description: 'New inspection',
        quantity: 1,
        unit: 'each',
        unit_price: 300,
        total_price: 300,
        sort_order: 1
      }

      const requestBody = {
        item_type: 'labor',
        category: 'Inspection', 
        description: 'New inspection',
        quantity: 1,
        unit_price: 300,
        is_optional: false,
        is_included: true
      }

      // Mock successful flow
      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'estimates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'estimate-123', status: 'draft' },
                    error: null
                  })
                }))
              }))
            }))
          }
        } else if (table === 'estimate_line_items' && callCount++ === 0) {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    single: vi.fn().mockResolvedValue({
                      data: { sort_order: 0 },
                      error: null
                    })
                  }))
                }))
              }))
            }))
          }
        } else {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: newLineItem,
                  error: null
                })
              }))
            }))
          }
        }
      })

      const request = new NextRequest('http://localhost/api/estimates/estimate-123/line-items', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request, mockParams)
      
      expect(response.status).toBe(201)
      const json = await response.json()
      expect(json.line_item).toEqual(newLineItem)
    })

    it('should reject adding line item to sent estimate', async () => {
      const requestBody = {
        item_type: 'labor',
        category: 'Inspection',
        description: 'New inspection',
        quantity: 1,
        unit_price: 300,
        is_optional: false,
        is_included: true
      }

      mockSupabaseClient.from.mockImplementation((table) => {
        if (table === 'estimates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'estimate-123', status: 'sent' },
                    error: null
                  })
                }))
              }))
            }))
          }
        }
        return mockSupabaseClient.from()
      })

      const request = new NextRequest('http://localhost/api/estimates/estimate-123/line-items', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      await expect(async () => {
        await POST(request, mockParams)
      }).rejects.toThrow('Cannot modify line items for an estimate in this status')
    })
  })

  describe('PUT /api/estimates/[id]/line-items', () => {
    it('should bulk update line items successfully', async () => {
      const updatedLineItems = [
        {
          id: 'item-1',
          estimate_id: 'estimate-123',
          description: 'Updated inspection',
          quantity: 2,
          unit_price: 400,
          total_price: 800,
          sort_order: 0
        }
      ]

      const requestBody = {
        line_items: [
          {
            id: 'item-1',
            description: 'Updated inspection',
            quantity: 2,
            unit_price: 400
          }
        ]
      }

      // Mock the complex flow
      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table) => {
        callCount++
        if (table === 'estimates') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: { id: 'estimate-123', status: 'draft' },
                    error: null
                  })
                }))
              }))
            }))
          }
        } else if (table === 'estimate_line_items' && callCount <= 3) {
          // Mock for existing price lookup
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { quantity: 1, unit_price: 300 },
                  error: null
                })
              }))
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({
                  data: null,
                  error: null
                })
              }))
            }))
          }
        } else {
          // Final fetch
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn().mockResolvedValue({
                  data: updatedLineItems,
                  error: null
                })
              }))
            }))
          }
        }
      })

      const request = new NextRequest('http://localhost/api/estimates/estimate-123/line-items', {
        method: 'PUT',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await PUT(request, mockParams)
      
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.line_items).toEqual(updatedLineItems)
    })
  })
})
