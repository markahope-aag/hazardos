import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const stages = await PipelineService.getStages()
    return NextResponse.json(stages)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const body = await request.json()
    const { name, color, stage_type, probability } = body

    if (!name || !stage_type) {
      throw new SecureError('VALIDATION_ERROR', 'name and stage_type are required')
    }

    const stage = await PipelineService.createStage({
      name,
      color,
      stage_type,
      probability,
    })

    return NextResponse.json(stage)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
