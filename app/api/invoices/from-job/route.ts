import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
    }

    const invoice = await InvoicesService.createFromJob(body)

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Create invoice from job error:', error)
    return createSecureErrorResponse(error)
  }
}
