import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateCustomerSchema } from '@/lib/validations/customer-api'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'
import type { CustomerUpdate } from '@/types/database'

/**
 * GET /api/customers/[id]
 * Get a specific customer
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, context, params) => {
    // Use the server-side, RLS-aware client from the handler context.
    // CustomersService binds to a browser client at module load, so it
    // can't see the authenticated session when called from a route.
    const { data: customer, error } = await context.supabase
      .from('customers')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (error) throwDbError(error, 'customer operation')
    if (!customer) {
      throw new SecureError('NOT_FOUND', 'Customer not found')
    }
    return NextResponse.json({ customer })
  }
)

/**
 * PATCH /api/customers/[id]
 * Update a customer
 */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: updateCustomerSchema,
  },
  async (_request, context, params, body) => {
    const updateData: CustomerUpdate = {}

    if (body.name !== undefined) updateData.name = body.name
    if (body.company_name !== undefined) updateData.company_name = body.company_name
    if (body.email !== undefined) updateData.email = body.email
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.address_line1 !== undefined) updateData.address_line1 = body.address_line1
    if (body.address_line2 !== undefined) updateData.address_line2 = body.address_line2
    if (body.city !== undefined) updateData.city = body.city
    if (body.state !== undefined) updateData.state = body.state
    if (body.zip !== undefined) updateData.zip = body.zip
    if (body.status !== undefined) updateData.status = body.status
    if (body.source !== undefined) updateData.source = body.source
    if (body.communication_preferences !== undefined) updateData.communication_preferences = body.communication_preferences
    if (body.marketing_consent !== undefined) updateData.marketing_consent = body.marketing_consent
    if (body.marketing_consent_date !== undefined) updateData.marketing_consent_date = body.marketing_consent_date
    if (body.notes !== undefined) updateData.notes = body.notes

    const { data: customer, error } = await context.supabase
      .from('customers')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) throwDbError(error, 'customer operation')
    if (!customer) {
      throw new SecureError('NOT_FOUND', 'Customer not found')
    }
    return NextResponse.json({ customer })
  }
)

/**
 * DELETE /api/customers/[id]
 * Delete a customer
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, context, params) => {
    const { error } = await context.supabase
      .from('customers')
      .delete()
      .eq('id', params.id)

    if (error) {
      // The guard_customer_delete trigger raises a deliberately user-facing
      // message (P0001) when the contact has linked jobs/invoices that would
      // cascade-delete. Surface it as a 409 with that text, rather than letting
      // throwDbError flatten it to a generic 500.
      if (error.code === 'P0001') {
        throw new SecureError('CONFLICT', error.message)
      }
      throwDbError(error, 'customer operation')
    }
    return NextResponse.json({ message: 'Customer deleted successfully' })
  }
)
