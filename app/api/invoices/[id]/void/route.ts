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

    const invoice = await InvoicesService.void(id)

    return NextResponse.json(invoice)
  } catch (error) {
    console.error('Invoice void error:', error)
    return NextResponse.json({ error: 'Failed to void invoice' }, { status: 500 })
  }
}
