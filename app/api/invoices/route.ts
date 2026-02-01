import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    console.error('Invoices GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.customer_id) {
      return NextResponse.json({ error: 'customer_id is required' }, { status: 400 })
    }
    if (!body.due_date) {
      return NextResponse.json({ error: 'due_date is required' }, { status: 400 })
    }

    const invoice = await InvoicesService.create(body)

    return NextResponse.json(invoice, { status: 201 })
  } catch (error) {
    console.error('Invoices POST error:', error)
    return createSecureErrorResponse(error)
  }
}
