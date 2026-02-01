import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InvoicesService } from '@/lib/services/invoices-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const method = body.method || 'email'

    const invoice = await InvoicesService.send(id, method)

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Invoice send error:', error)
    return NextResponse.json({ error: 'Failed to send invoice' }, { status: 500 })
  }
}
