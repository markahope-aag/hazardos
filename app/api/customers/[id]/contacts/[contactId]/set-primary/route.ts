import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ContactsService } from '@/lib/services/contacts-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'

// POST /api/customers/[id]/contacts/[contactId]/set-primary - Set a contact as primary
export async function POST(
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

    const contact = await ContactsService.setPrimary(contactId)

    return NextResponse.json(contact)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
