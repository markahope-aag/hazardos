import { NextResponse } from 'next/server'
import { PhotoAnalysisService, PhotoAnalysisContext } from '@/lib/services/photo-analysis-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * POST /api/ai/photo-analysis
 * Analyze photos for hazard identification
 */
export const POST = createApiHandler(
  {
    rateLimit: 'heavy',
  },
  async (_request, context, body) => {
    // Support single image or multiple images
    if (body.images && Array.isArray(body.images)) {
      // Multiple images
      const images = body.images.map((img: { base64: string; context?: PhotoAnalysisContext }) => ({
        base64: img.base64,
        context: img.context,
      }))

      if (images.length === 0) {
        throw new SecureError('VALIDATION_ERROR', 'At least one image is required')
      }

      const result = await PhotoAnalysisService.analyzeMultiplePhotos(
        context.profile.organization_id,
        images
      )

      return NextResponse.json(result)
    } else if (body.image) {
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
    } else {
      throw new SecureError('VALIDATION_ERROR', 'Image data is required (image or images field)')
    }
  }
)
