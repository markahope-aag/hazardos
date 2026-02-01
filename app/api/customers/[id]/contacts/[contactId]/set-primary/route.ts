import { NextResponse } from 'next/server'
import { ContactsService } from '@/lib/services/contacts-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'

/**
 * POST /api/customers/[id]/contacts/[contactId]/set-primary
 * Set a contact as primary
 */
export const POST = createApiHandlerWithParams<
  unknown,
  unknown,
  { id: string; contactId: string }
>(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    const contact = await ContactsService.setPrimary(params.contactId)
    return NextResponse.json(contact)
  }
)
