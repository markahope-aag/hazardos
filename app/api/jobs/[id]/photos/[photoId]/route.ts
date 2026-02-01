import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updatePhotoSchema } from '@/lib/validations/jobs'

/**
 * PATCH /api/jobs/[id]/photos/[photoId]
 * Update a photo
 */
export const PATCH = createApiHandlerWithParams<
  typeof updatePhotoSchema._type,
  unknown,
  { id: string; photoId: string }
>(
  {
    rateLimit: 'general',
    bodySchema: updatePhotoSchema,
  },
  async (_request, _context, params, body) => {
    const photo = await JobCompletionService.updatePhoto(params.photoId, body)
    return NextResponse.json(photo)
  }
)

/**
 * DELETE /api/jobs/[id]/photos/[photoId]
 * Delete a photo
 */
export const DELETE = createApiHandlerWithParams<
  unknown,
  unknown,
  { id: string; photoId: string }
>(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    await JobCompletionService.deletePhoto(params.photoId)
    return NextResponse.json({ success: true })
  }
)
