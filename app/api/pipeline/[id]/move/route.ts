import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { id } = await params
    const { stage_id, notes } = await request.json()

    if (!stage_id) {
      throw new SecureError('VALIDATION_ERROR', 'stage_id is required')
    }

    const opportunity = await PipelineService.moveOpportunity(id, stage_id, notes)
    return NextResponse.json(opportunity)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
