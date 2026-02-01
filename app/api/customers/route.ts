import { NextResponse } from 'next/server'
import { CustomersService } from '@/lib/supabase/customers'
import { createApiHandler } from '@/lib/utils/api-handler'
import { customerListQuerySchema, createCustomerSchema } from '@/lib/validations/customers'
import type { CustomerInsert, CustomerStatus } from '@/types/database'

/**
 * GET /api/customers
 * List customers with optional filtering
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: customerListQuerySchema,
  },
  async (_request, context, _body, query) => {
    const customers = await CustomersService.getCustomers(context.profile.organization_id, {
      status: query.status as CustomerStatus | undefined,
      search: query.search,
      limit: query.limit,
      offset: query.offset,
    })

    return NextResponse.json({ customers })
  }
)

/**
 * POST /api/customers
 * Create a new customer
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createCustomerSchema,
  },
  async (_request, context, body) => {
    const customerData: CustomerInsert = {
      organization_id: context.profile.organization_id,
      name: body.name,
      company_name: body.company_name || null,
      email: body.email || null,
      phone: body.phone || null,
      address_line1: body.address_line1 || null,
      address_line2: body.address_line2 || null,
      city: body.city || null,
      state: body.state || null,
      zip: body.zip || null,
      status: body.status || 'lead',
      source: body.source || null,
      communication_preferences: body.communication_preferences || { email: true, sms: false, mail: false },
      marketing_consent: body.marketing_consent || false,
      marketing_consent_date: body.marketing_consent && body.marketing_consent_date ? body.marketing_consent_date : null,
      notes: body.notes || null,
      created_by: context.user.id,
    }

    const customer = await CustomersService.createCustomer(customerData)

    return NextResponse.json({ customer }, { status: 201 })
  }
)
