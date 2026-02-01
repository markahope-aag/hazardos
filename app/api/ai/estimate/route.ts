import { NextResponse } from 'next/server'
import { AIEstimateService } from '@/lib/services/ai-estimate-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { aiEstimateSchema } from '@/lib/validations/ai'

/**
 * POST /api/ai/estimate
 * Generate AI-powered estimate suggestions
 */
export const POST = createApiHandler(
  {
    rateLimit: 'heavy',
    bodySchema: aiEstimateSchema,
  },
  async (_request, context, body) => {
    const suggestion = await AIEstimateService.suggestEstimate(
      context.profile.organization_id,
      {
        hazard_types: body.hazard_types,
        property_type: body.property_type,
        square_footage: body.square_footage,
        photos: body.photos,
        site_survey_notes: body.site_survey_notes,
        customer_notes: body.customer_notes,
      }
    )

    return NextResponse.json(suggestion)
  }
)
