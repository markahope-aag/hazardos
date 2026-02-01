import { NextRequest, NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import { createClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ id: string; itemId: string }> }

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { itemId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    const checklistItem = await JobCompletionService.updateChecklistItem(itemId, {
      is_completed: body.is_completed,
      completion_notes: body.completion_notes,
      evidence_photo_ids: body.evidence_photo_ids,
    })

    return NextResponse.json(checklistItem)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
