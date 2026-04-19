import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { customerListQuerySchema, createCustomerSchema } from '@/lib/validations/customers'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'
import type { CustomerInsert } from '@/types/database'

/**
 * GET /api/customers
 * List customers with optional filtering.
 *
 * We intentionally run the query against `context.supabase` (the server-side
 * client from createApiHandler, scoped to the caller's cookie session)
 * rather than going through CustomersService. CustomersService holds a
 * browser-only client captured at module load, which has no auth context
 * on the server — calling it from an API route returns an empty list
 * because RLS filters everything out. Duplicating the query shape here is
 * cheaper than carrying that ambiguity.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: customerListQuerySchema,
  },
  async (_request, context, _body, query) => {
    let dbQuery = context.supabase
      .from('customers')
      .select(
        '*, company:companies!company_id(id, name), account_owner:profiles!account_owner_id(id, first_name, last_name, full_name), open_jobs:jobs!customer_id(id)',
      )
      .eq('organization_id', context.profile.organization_id)
      .order('created_at', { ascending: false })

    if (query.status) dbQuery = dbQuery.eq('status', query.status)
    if (query.search) {
      const s = sanitizeSearchQuery(query.search)
      dbQuery = dbQuery.or(
        `name.ilike.%${s}%,company_name.ilike.%${s}%,email.ilike.%${s}%,phone.ilike.%${s}%`,
      )
    }
    if (query.limit) dbQuery = dbQuery.limit(query.limit)
    if (query.offset) {
      const limit = query.limit || 25
      dbQuery = dbQuery.range(query.offset, query.offset + limit - 1)
    }

    const { data, error } = await dbQuery
    if (error) throw error

    return NextResponse.json({ customers: data || [] })
  },
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

    const { data: customer, error } = await context.supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ customer }, { status: 201 })
  },
)
