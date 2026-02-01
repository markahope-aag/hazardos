import { NextResponse } from 'next/server'
import { PhotoAnalysisService, PhotoAnalysisContext } from '@/lib/services/photo-analysis-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { photoAnalysisSchema } from '@/lib/validations/ai'

/**
 * POST /api/ai/photo-analysis
 * Analyze photos for hazard identification
 */
export const POST = createApiHandler(
  {
    rateLimit: 'heavy',
    bodySchema: photoAnalysisSchema,
  },
  async (_request, context, body) => {
    // Check if this is multiple images or single image
    if ('images' in body) {
      // Multiple images
      const images = body.images.map((img) => ({
        base64: img.base64,
        context: img.context as PhotoAnalysisContext | undefined,
      }))

      const result = await PhotoAnalysisService.analyzeMultiplePhotos(
        context.profile.organization_id,
        images
      )

      return NextResponse.json(result)
    } else {
      // Single image
      const photoContext: PhotoAnalysisContext | undefined = body.context ? {
        property_type: body.context.property_type,
        known_hazards: body.context.known_hazards,
        additional_context: body.context.additional_context,
      } : undefined

      const analysis = await PhotoAnalysisService.analyzePhoto(
        context.profile.organization_id,
        body.image,
        photoContext
      )

      return NextResponse.json(analysis)
    }
  }
)
