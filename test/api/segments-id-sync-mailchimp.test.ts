import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/segments/[id]/sync/mailchimp/route'
import { SegmentationService } from '@/lib/services/segmentation-service'

const mockSupabaseClient = { from: vi.fn() }

vi.mock('@/lib/services/segmentation-service', () => ({
  SegmentationService: { syncToMailchimp: vi.fn() }
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
          let body = {}
          if (options.bodySchema) {
            try { body = await request.json() } catch {}
          }
          return await handler(request, mockContext, params, body, {})
        } catch (error) {
          return errorHandler.createSecureErrorResponse(error, {
            error: vi.fn(), warn: vi.fn(), info: vi.fn()
          })
        }
      }
    }
  }
})

describe('Segments Sync Mailchimp API', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should sync with provided list_id', async () => {
    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { settings: { default_list_id: 'list-default' } }, error: null })
            })
          })
        })
      })
    } as any)
    vi.mocked(SegmentationService.syncToMailchimp).mockResolvedValue(undefined)
    const request = new NextRequest('http://localhost:3000/api/segments/segment-1/sync/mailchimp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: 'list-123' })
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'segment-1' }) })
    const _data = await response.json()
    expect(response.status).toBe(200)
    expect(SegmentationService.syncToMailchimp).toHaveBeenCalledWith('segment-1', 'list-123')
  })

  it('should use default list_id', async () => {
    vi.mocked(mockSupabaseClient.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { settings: { default_list_id: 'list-default' } }, error: null })
            })
          })
        })
      })
    } as any)
    vi.mocked(SegmentationService.syncToMailchimp).mockResolvedValue(undefined)
    const request = new NextRequest('http://localhost:3000/api/segments/segment-1/sync/mailchimp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const _response = await POST(request, { params: Promise.resolve({ id: 'segment-1' }) })
    expect(SegmentationService.syncToMailchimp).toHaveBeenCalledWith('segment-1', 'list-default')
  })
})
