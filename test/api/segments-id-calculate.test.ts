import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/segments/[id]/calculate/route'
import { SegmentationService } from '@/lib/services/segmentation-service'

vi.mock('@/lib/services/segmentation-service', () => ({
  SegmentationService: {
    calculateMembers: vi.fn()
  }
}))

vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    createApiHandlerWithParams: (options: any, handler: any) => {
      return async (request: any, props: any) => {
        const mockContext = {
          user: { id: 'user-123' },
          profile: { organization_id: 'org-123', role: 'admin' },
          log: { info: vi.fn() },
          requestId: 'test-id'
        }
        const params = await props.params
        return await handler(request, mockContext, params, {}, {})
      }
    }
  }
})

describe('Segments Calculate API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should calculate segment members', async () => {
    vi.mocked(SegmentationService.calculateMembers).mockResolvedValue(125)
    const request = new NextRequest('http://localhost:3000/api/segments/550e8400-e29b-41d4-a716-446655440001/calculate', {
      method: 'POST'
    })
    const response = await POST(request, {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440001' })
    })
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.member_count).toBe(125)
    expect(SegmentationService.calculateMembers).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440001')
  })

  it('should handle empty segments', async () => {
    vi.mocked(SegmentationService.calculateMembers).mockResolvedValue(0)
    const request = new NextRequest('http://localhost:3000/api/segments/segment-2/calculate', {
      method: 'POST'
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'segment-2' }) })
    const data = await response.json()
    expect(data.member_count).toBe(0)
  })
})
