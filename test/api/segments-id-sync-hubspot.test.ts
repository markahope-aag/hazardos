import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/segments/[id]/sync/hubspot/route'
import { SegmentationService } from '@/lib/services/segmentation-service'

const mockSupabaseClient = { from: vi.fn() }

vi.mock('@/lib/services/segmentation-service', () => ({
  SegmentationService: { syncToHubSpot: vi.fn() }
}))

vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  const errorHandler = await import('@/lib/utils/secure-error-handler')
  return {
    ...actual,
    createApiHandlerWithParams: (options: any, handler: any) => {
      return async (request: any, props: any) => {
        try {
          const mockContext = {
            user: { id: 'user-123' },
            profile: { organization_id: 'org-123', role: 'admin' },
            supabase: mockSupabaseClient,
            log: { info: vi.fn() },
            requestId: 'test-id'
          }
          const params = await props.params
          return await handler(request, mockContext, params, {}, {})
        } catch (error) {
          return errorHandler.createSecureErrorResponse(error, {
            error: vi.fn(), warn: vi.fn(), info: vi.fn()
          })
        }
      }
    }
  }
})

describe('Segments Sync HubSpot API', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should sync segment to HubSpot', async () => {
    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: 'integration-123' }, error: null })
            })
          })
        })
      })
    } as any)
    vi.mocked(SegmentationService.syncToHubSpot).mockResolvedValue(undefined)
    const request = new NextRequest('http://localhost:3000/api/segments/segment-1/sync/hubspot', { method: 'POST' })
    const response = await POST(request, { params: Promise.resolve({ id: 'segment-1' }) })
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should return error if HubSpot not connected', async () => {
    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: null, error: null })
            })
          })
        })
      })
    } as any)
    const request = new NextRequest('http://localhost:3000/api/segments/segment-1/sync/hubspot', { method: 'POST' })
    const response = await POST(request, { params: Promise.resolve({ id: 'segment-1' }) })
    const data = await response.json()
    expect(response.status).toBe(400)
    expect(data.error).toBeTruthy()
  })
})
