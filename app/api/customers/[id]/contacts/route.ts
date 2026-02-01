import { NextResponse } from 'next/server'
import { ContactsService } from '@/lib/services/contacts-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { createContactSchema } from '@/lib/validations/customers'

/**
 * GET /api/customers/[id]/contacts
 * List all contacts for a customer
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, _context, params) => {
    const contacts = await ContactsService.list(params.id)
    return NextResponse.json(contacts)
  }
)

/**
 * POST /api/customers/[id]/contacts
 * Create a new contact
 */
export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: createContactSchema,
  },
  async (_request, _context, params, body) => {
    const contact = await ContactsService.create({
      customer_id: params.id,
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
  }
)
