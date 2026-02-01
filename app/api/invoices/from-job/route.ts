import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    validateRequired(body.job_id, 'job_id')

    const invoice = await InvoicesService.createFromJob(body)

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
