import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/ai/voice/transcribe/route'
import { VoiceService } from '@/lib/services/voice-service'

const mockSupabaseClient = {
  auth: { getUser: vi.fn() },
  from: vi.fn()
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient))
}))

vi.mock('@/lib/services/voice-service', () => ({
  VoiceService: {
    transcribe: vi.fn(),
    getRecentTranscriptions: vi.fn()
  }
}))

vi.mock('@/lib/middleware/unified-rate-limit', () => ({
  applyUnifiedRateLimit: vi.fn(() => Promise.resolve(null))
}))

// Mock createApiHandler for GET endpoint
vi.mock('@/lib/utils/api-handler', async (importOriginal) => {
  const actual = await importOriginal() as any
  return {
    ...actual,
    createApiHandler: (options: any, handler: any) => {
      return async (request: any) => {
        const mockContext = {
          user: { id: 'user-123', email: 'test@example.com' },
          profile: { organization_id: 'org-123', role: 'admin' },
          log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
          requestId: 'test-request-id'
        }

        const url = new URL(request.url)
        const query: any = {}
        url.searchParams.forEach((value, key) => {
          query[key] = value
        })

        return await handler(request, mockContext, {}, query)
      }
    }
  }
})

describe('AI Voice Transcribe API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com'
  }

  describe('POST /api/ai/voice/transcribe', () => {
    it('should transcribe audio from base64 JSON', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null
            })
          })
        })
      } as any)

      const mockTranscription = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        text: 'This is a test transcription of the audio file.',
        confidence: 0.95,
        duration: 5.2,
        created_at: new Date().toISOString()
      }

      vi.mocked(VoiceService.transcribe).mockResolvedValue(mockTranscription)

      // Create base64 encoded audio (just a simple test string)
      const audioBase64 = Buffer.from('test audio data').toString('base64')

      const request = new NextRequest('http://localhost:3000/api/ai/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioBase64,
          format: 'webm',
          context: {
            context_type: 'job_note',
            job_id: '550e8400-e29b-41d4-a716-446655440010'
          }
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.text).toBe('This is a test transcription of the audio file.')
      expect(data.confidence).toBe(0.95)
      expect(VoiceService.transcribe).toHaveBeenCalledWith(
        'org-123',
        'user-123',
        expect.any(Buffer),
        'webm',
        expect.objectContaining({
          context_type: 'job_note'
        })
      )
    })

    it('should transcribe audio from FormData', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null
            })
          })
        })
      } as any)

      const mockTranscription = {
        id: '550e8400-e29b-41d4-a716-446655440002',
        text: 'Customer called about asbestos removal project.',
        confidence: 0.92,
        duration: 3.8,
        created_at: new Date().toISOString()
      }

      vi.mocked(VoiceService.transcribe).mockResolvedValue(mockTranscription)

      // Create a mock File object
      const audioData = new Uint8Array([1, 2, 3, 4, 5])
      const audioFile = new File([audioData], 'recording.webm', { type: 'audio/webm' })

      const formData = new FormData()
      formData.append('audio', audioFile)
      formData.append('context', JSON.stringify({
        context_type: 'customer_note',
        customer_id: '550e8400-e29b-41d4-a716-446655440020'
      }))

      const request = new NextRequest('http://localhost:3000/api/ai/voice/transcribe', {
        method: 'POST',
        body: formData
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.text).toBe('Customer called about asbestos removal project.')
      expect(VoiceService.transcribe).toHaveBeenCalledWith(
        'org-123',
        'user-123',
        expect.any(Buffer),
        'webm',
        expect.objectContaining({
          context_type: 'customer_note'
        })
      )
    })

    it('should transcribe audio without context', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null
            })
          })
        })
      } as any)

      const mockTranscription = {
        id: '550e8400-e29b-41d4-a716-446655440003',
        text: 'General note transcription.',
        confidence: 0.88,
        duration: 2.1,
        created_at: new Date().toISOString()
      }

      vi.mocked(VoiceService.transcribe).mockResolvedValue(mockTranscription)

      const audioBase64 = Buffer.from('test audio data').toString('base64')

      const request = new NextRequest('http://localhost:3000/api/ai/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioBase64,
          format: 'mp3'
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.text).toBe('General note transcription.')
      expect(VoiceService.transcribe).toHaveBeenCalledWith(
        'org-123',
        'user-123',
        expect.any(Buffer),
        'mp3',
        undefined
      )
    })

    it('should return 401 when unauthenticated', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null
      })

      const audioBase64 = Buffer.from('test audio data').toString('base64')

      const request = new NextRequest('http://localhost:3000/api/ai/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioBase64
        })
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(401)
    })

    it('should return 400 when audio data is missing', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null
            })
          })
        })
      } as any)

      const request = new NextRequest('http://localhost:3000/api/ai/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'webm'
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBeTruthy()
    })

    it('should return 400 for invalid context type', async () => {
      // Arrange
      vi.mocked(mockSupabaseClient.auth.getUser).mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      vi.mocked(mockSupabaseClient.from).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null
            })
          })
        })
      } as any)

      const audioBase64 = Buffer.from('test audio data').toString('base64')

      const request = new NextRequest('http://localhost:3000/api/ai/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: audioBase64,
          format: 'webm',
          context: {
            context_type: 'invalid_type'
          }
        })
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toContain('Invalid context_type')
    })
  })

  describe('GET /api/ai/voice/transcribe', () => {
    it('should get recent transcriptions for organization', async () => {
      // Arrange
      const mockTranscriptions = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          text: 'First transcription',
          created_at: new Date().toISOString(),
          user_id: 'user-123'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          text: 'Second transcription',
          created_at: new Date().toISOString(),
          user_id: 'user-456'
        }
      ]

      vi.mocked(VoiceService.getRecentTranscriptions).mockResolvedValue(mockTranscriptions)

      const request = new NextRequest('http://localhost:3000/api/ai/voice/transcribe')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(VoiceService.getRecentTranscriptions).toHaveBeenCalledWith(
        'org-123',
        undefined,
        20
      )
    })

    it('should get recent transcriptions for current user only', async () => {
      // Arrange
      const mockTranscriptions = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          text: 'User transcription',
          created_at: new Date().toISOString(),
          user_id: 'user-123'
        }
      ]

      vi.mocked(VoiceService.getRecentTranscriptions).mockResolvedValue(mockTranscriptions)

      const request = new NextRequest('http://localhost:3000/api/ai/voice/transcribe?user_only=true')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(1)
      expect(VoiceService.getRecentTranscriptions).toHaveBeenCalledWith(
        'org-123',
        'user-123',
        20
      )
    })

    it('should respect custom limit parameter', async () => {
      // Arrange
      vi.mocked(VoiceService.getRecentTranscriptions).mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/ai/voice/transcribe?limit=50')

      // Act
      await GET(request)

      // Assert
      // Note: query params come in as strings, so limit will be "50"
      expect(VoiceService.getRecentTranscriptions).toHaveBeenCalledWith(
        'org-123',
        undefined,
        "50"
      )
    })
  })
})
