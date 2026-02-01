import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

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

    const body = await request.json()

    if (!body.description) {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }
    if (!body.quantity || body.quantity <= 0) {
      return NextResponse.json({ error: 'Valid quantity is required' }, { status: 400 })
    }
    if (body.unit_price === undefined) {
      return NextResponse.json({ error: 'unit_price is required' }, { status: 400 })
    }

    const lineItem = await InvoicesService.addLineItem(id, body)

    return NextResponse.json(lineItem, { status: 201 })
  } catch (error) {
    console.error('Add line item error:', error)
    return createSecureErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { line_item_id, ...updates } = body

    if (!line_item_id) {
      return NextResponse.json({ error: 'line_item_id is required' }, { status: 400 })
    }

    const lineItem = await InvoicesService.updateLineItem(line_item_id, updates)

    return NextResponse.json(lineItem)
  } catch (error) {
    console.error('Update line item error:', error)
    return NextResponse.json({ error: 'Failed to update line item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lineItemId = searchParams.get('line_item_id')

    if (!lineItemId) {
      return NextResponse.json({ error: 'line_item_id is required' }, { status: 400 })
    }

    await InvoicesService.deleteLineItem(lineItemId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete line item error:', error)
    return NextResponse.json({ error: 'Failed to delete line item' }, { status: 500 })
  }
}
