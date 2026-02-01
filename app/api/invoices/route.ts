import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const searchParams = request.nextUrl.searchParams
    const filters = {
      status: searchParams.get('status') || undefined,
      customer_id: searchParams.get('customer_id') || undefined,
      job_id: searchParams.get('job_id') || undefined,
      from_date: searchParams.get('from_date') || undefined,
      to_date: searchParams.get('to_date') || undefined,
      overdue_only: searchParams.get('overdue_only') === 'true',
    }

    const invoices = await InvoicesService.list(filters)
    return NextResponse.json({ invoices })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    validateRequired(body.customer_id, 'customer_id')
    validateRequired(body.due_date, 'due_date')

    const invoice = await InvoicesService.create(body)

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
