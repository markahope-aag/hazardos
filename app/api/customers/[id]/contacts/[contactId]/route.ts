import { NextResponse } from 'next/server'
import { ContactsService } from '@/lib/services/contacts-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateContactSchema } from '@/lib/validations/customers'
import { SecureError } from '@/lib/utils/secure-error-handler'

/**
 * GET /api/customers/[id]/contacts/[contactId]
 * Get a specific contact
 */
export const GET = createApiHandlerWithParams<
  unknown,
  unknown,
  { id: string; contactId: string }
>(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    const contact = await ContactsService.get(params.contactId)

    if (!contact) {
      throw new SecureError('NOT_FOUND', 'Contact not found')
    }

    return NextResponse.json(contact)
  }
)

/**
 * PATCH /api/customers/[id]/contacts/[contactId]
 * Update a contact
 */
export const PATCH = createApiHandlerWithParams<
  typeof updateContactSchema._type,
  unknown,
  { id: string; contactId: string }
>(
  {
    rateLimit: 'general',
    bodySchema: updateContactSchema,
  },
  async (_request, _context, params, body) => {
    const contact = await ContactsService.update(params.contactId, {
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
  }
)

/**
 * DELETE /api/customers/[id]/contacts/[contactId]
 * Delete a contact
 */
export const DELETE = createApiHandlerWithParams<
  unknown,
  unknown,
  { id: string; contactId: string }
>(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    await ContactsService.delete(params.contactId)
    return NextResponse.json({ message: 'Contact deleted successfully' })
  }
)
