import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { createPhotoSchema } from '@/lib/validations/jobs'

/**
 * GET /api/jobs/[id]/photos
 * Get photos for a job
 */
export const GET = createApiHandlerWithParams(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    const photos = await JobCompletionService.getPhotos(params.id)
    return NextResponse.json(photos)
  }
)

/**
 * POST /api/jobs/[id]/photos
 * Upload a photo for a job
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'upload',
    bodySchema: createPhotoSchema,
  },
  async (_request, _context, params, body) => {
    const photo = await JobCompletionService.createPhoto({
      job_id: params.id,
      ...body,
    })

    return NextResponse.json(photo, { status: 201 })
  }
)
