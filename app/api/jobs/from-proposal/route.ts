import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createJobFromProposalSchema } from '@/lib/validations/jobs'
import { SecureError } from '@/lib/utils/secure-error-handler'

export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createJobFromProposalSchema,
  },
  async (_request, context, body, _query) => {
    // Validate date format
    const scheduledDate = new Date(body.scheduled_start_date)
    if (isNaN(scheduledDate.getTime())) {
      throw new SecureError('VALIDATION_ERROR', 'Invalid scheduled_start_date format. Use YYYY-MM-DD')
    }

    // Verify proposal is signed
    const { data: proposal, error: propError } = await context.supabase
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
  }
)
