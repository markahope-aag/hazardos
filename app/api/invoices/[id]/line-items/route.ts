import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InvoicesService } from '@/lib/services/invoices-service'
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    validateRequired(body.description, 'description')
    if (!body.quantity || body.quantity <= 0) {
      throw new SecureError('VALIDATION_ERROR', 'Valid quantity is required')
    }
    if (body.unit_price === undefined) {
      throw new SecureError('VALIDATION_ERROR', 'unit_price is required')
    }

    const lineItem = await InvoicesService.addLineItem(id, body)

    return NextResponse.json(lineItem, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()
    const { line_item_id, ...updates } = body

    validateRequired(line_item_id, 'line_item_id')

    const lineItem = await InvoicesService.updateLineItem(line_item_id, updates)

    return NextResponse.json(lineItem)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const { searchParams } = new URL(request.url)
    const lineItemId = searchParams.get('line_item_id')

    if (!lineItemId) {
      throw new SecureError('VALIDATION_ERROR', 'line_item_id is required')
    }

    await InvoicesService.deleteLineItem(lineItemId)

    return NextResponse.json({ success: true })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
