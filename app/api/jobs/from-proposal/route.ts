import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.proposal_id) {
      return NextResponse.json({ error: 'proposal_id is required' }, { status: 400 })
    }

    if (!body.scheduled_start_date) {
      return NextResponse.json({ error: 'scheduled_start_date is required' }, { status: 400 })
    }

    // Validate date format
    const scheduledDate = new Date(body.scheduled_start_date)
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduled_start_date format. Use YYYY-MM-DD' },
        { status: 400 }
      )
    }

    // Verify proposal is signed
    const { data: proposal, error: propError } = await supabase
      .from('proposals')
      .select('status')
      .eq('id', body.proposal_id)
      .single()

    if (propError || !proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }

    if (proposal.status !== 'signed' && proposal.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Proposal must be signed or accepted before creating a job' },
        { status: 400 }
      )
    }

    const job = await JobsService.createFromProposal(body)

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Create job from proposal error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create job' },
      { status: 500 }
    )
  }
}
