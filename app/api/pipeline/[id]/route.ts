import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { PipelineService } from '@/lib/services/pipeline-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { id } = await params
    const opportunity = await PipelineService.getOpportunity(id)

    if (!opportunity) {
      throw new SecureError('NOT_FOUND', 'Opportunity not found')
    }

    return NextResponse.json(opportunity)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { id } = await params
    const body = await request.json()

    const opportunity = await PipelineService.updateOpportunity(id, body)
    return NextResponse.json(opportunity)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new SecureError('UNAUTHORIZED')

    const { id } = await params
    await PipelineService.deleteOpportunity(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
