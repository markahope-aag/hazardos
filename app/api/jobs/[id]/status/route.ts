import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import type { JobStatus } from '@/types/jobs'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

const validStatuses: JobStatus[] = [
  'scheduled',
  'in_progress',
  'completed',
  'invoiced',
  'paid',
  'closed',
  'cancelled',
]

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { status } = await request.json()

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const job = await JobsService.updateStatus(id, status)

    return NextResponse.json(job)
  } catch (error) {
    console.error('Job status error:', error)
    return createSecureErrorResponse(error)
  }
}
