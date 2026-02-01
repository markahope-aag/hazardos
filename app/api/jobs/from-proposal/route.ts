import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    validateRequired(body.proposal_id, 'proposal_id')
    validateRequired(body.scheduled_start_date, 'scheduled_start_date')

    // Validate date format
    const scheduledDate = new Date(body.scheduled_start_date)
    if (isNaN(scheduledDate.getTime())) {
      throw new SecureError('VALIDATION_ERROR', 'Invalid scheduled_start_date format. Use YYYY-MM-DD')
    }

    // Verify proposal is signed
    const { data: proposal, error: propError } = await supabase
      .from('proposals')
      .select('status')
      .eq('id', body.proposal_id)
      .single()

    if (propError || !proposal) {
      throw new SecureError('NOT_FOUND', 'Proposal not found')
    }

    if (proposal.status !== 'signed' && proposal.status !== 'accepted') {
      throw new SecureError('VALIDATION_ERROR', 'Proposal must be signed or accepted before creating a job')
    }

    const job = await JobsService.createFromProposal(body)

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
