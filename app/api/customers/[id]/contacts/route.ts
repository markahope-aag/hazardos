import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContactsService } from '@/lib/services/contacts-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

// GET /api/customers/[id]/contacts - List all contacts for a customer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const contacts = await ContactsService.list(id)

    return NextResponse.json(contacts)
  } catch (error) {
    if (error instanceof SecureError) {
      return createSecureErrorResponse(error)
    }
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

// POST /api/customers/[id]/contacts - Create a new contact
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    const contact = await ContactsService.create({
      customer_id: id,
      name: body.name,
      title: body.title,
      email: body.email,
      phone: body.phone,
      mobile: body.mobile,
      role: body.role,
      is_primary: body.is_primary,
      preferred_contact_method: body.preferred_contact_method,
      notes: body.notes,
    })

    return NextResponse.json(contact, { status: 201 })
  } catch (error) {
    if (error instanceof SecureError) {
      return createSecureErrorResponse(error)
    }
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
