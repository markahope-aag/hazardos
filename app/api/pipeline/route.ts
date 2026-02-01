import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

// Get all opportunities and stages
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const [stages, opportunities, metrics] = await Promise.all([
      PipelineService.getStages(),
      PipelineService.getOpportunities(),
      PipelineService.getPipelineMetrics(),
    ])

    return NextResponse.json({ stages, opportunities, metrics })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

// Create new opportunity
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const body = await request.json()

    if (!body.customer_id || !body.name || !body.stage_id) {
      throw new SecureError('VALIDATION_ERROR', 'customer_id, name, and stage_id are required')
    }

    const opportunity = await PipelineService.createOpportunity(body)
    return NextResponse.json(opportunity, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
