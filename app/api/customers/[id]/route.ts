import { NextResponse } from 'next/server'
import { CustomersService } from '@/lib/supabase/customers'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateCustomerSchema } from '@/lib/validations/customers'
import { SecureError } from '@/lib/utils/secure-error-handler'
import type { CustomerUpdate } from '@/types/database'

/**
 * GET /api/customers/[id]
 * Get a specific customer
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, _context, params) => {
    try {
      const customer = await CustomersService.getCustomer(params.id)
      return NextResponse.json({ customer })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to fetch customer')) {
        throw new SecureError('NOT_FOUND', 'Customer not found')
      }
      throw error
    }
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
  async (_request, _context, params, body) => {
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

    try {
      const customer = await CustomersService.updateCustomer(params.id, updateData)
      return NextResponse.json({ customer })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to update customer')) {
        throw new SecureError('NOT_FOUND', 'Customer not found')
      }
      throw error
    }
  }
)

/**
 * DELETE /api/customers/[id]
 * Delete a customer
 */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'],
  },
  async (_request, _context, params) => {
    try {
      await CustomersService.deleteCustomer(params.id)
      return NextResponse.json({ message: 'Customer deleted successfully' })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to delete customer')) {
        throw new SecureError('NOT_FOUND', 'Customer not found')
      }
      throw error
    }
  }
)
