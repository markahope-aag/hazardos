import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContactsService } from '@/lib/services/contacts-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

// GET /api/customers/[id]/contacts/[contactId] - Get a specific contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { contactId } = await params
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const contact = await ContactsService.get(contactId)

    if (!contact) {
      throw new SecureError('NOT_FOUND', 'Contact not found')
    }

    return NextResponse.json(contact)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

// PATCH /api/customers/[id]/contacts/[contactId] - Update a contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { contactId } = await params
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    const contact = await ContactsService.update(contactId, {
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

    return NextResponse.json(contact)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

// DELETE /api/customers/[id]/contacts/[contactId] - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
) {
  const { contactId } = await params
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED')
    }

    await ContactsService.delete(contactId)

    return NextResponse.json({ message: 'Contact deleted successfully' })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
