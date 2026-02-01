import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { JobsService } from '@/lib/services/jobs-service'
import type { JobStatus } from '@/types/jobs'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

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
      throw new SecureError('UNAUTHORIZED')
    }

    const { id } = await params
    const { status } = await request.json()

    validateRequired(status, 'status')

    if (!validStatuses.includes(status)) {
      throw new SecureError('VALIDATION_ERROR', `Invalid status. Must be one of: ${validStatuses.join(', ')}`)
    }

    const job = await JobsService.updateStatus(id, status)

    return NextResponse.json(job)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
