import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import { sanitizeSearchQuery } from '@/lib/utils/sanitize'

const companyQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().optional(),
})

const createCompanySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  website: z.string().url().optional().nullable(),
  industry: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional().default('active'),
})

export const GET = createApiHandler(
  { querySchema: companyQuerySchema },
  async (request, context, _body, query) => {
    let dbQuery = context.supabase
      .from('companies')
      .select('*', { count: 'exact' })
      .eq('organization_id', context.profile.organization_id)
      .order('name', { ascending: true })
      .range(query.offset, query.offset + query.limit - 1)

    if (query.status) {
      dbQuery = dbQuery.eq('status', query.status)
    }

    if (query.search) {
      const safe = sanitizeSearchQuery(query.search)
      dbQuery = dbQuery.or(`name.ilike.%${safe}%,email.ilike.%${safe}%,industry.ilike.%${safe}%`)
    }

    const { data, error, count } = await dbQuery

    if (error) throwDbError(error, 'fetch companies')

    return NextResponse.json({
      companies: data,
      total: count,
      limit: query.limit,
      offset: query.offset,
    })
  }
)

export const POST = createApiHandler(
  { bodySchema: createCompanySchema },
  async (_request, context, body) => {
    const { data, error } = await context.supabase
      .from('companies')
      .insert({
        ...body,
        organization_id: context.profile.organization_id,
        created_by: context.user.id,
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create company')

    return NextResponse.json(data, { status: 201 })
  }
)
