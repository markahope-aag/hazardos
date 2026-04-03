import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { SecureError } from '@/lib/utils/secure-error-handler'

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
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
  status: z.enum(['active', 'inactive']).optional(),
})

export const GET = createApiHandlerWithParams(
  {},
  async (_request, context, params) => {
    const { id } = params

    const { data, error } = await context.supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)
      .single()

    if (error || !data) {
      throw new SecureError('NOT_FOUND', 'Company not found')
    }

    return NextResponse.json(data)
  }
)

export const PATCH = createApiHandlerWithParams(
  { bodySchema: updateCompanySchema },
  async (_request, context, params, body) => {
    const { id } = params

    const { data, error } = await context.supabase
      .from('companies')
      .update(body)
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)
      .select()
      .single()

    if (error) throw error
    if (!data) throw new SecureError('NOT_FOUND', 'Company not found')

    return NextResponse.json(data)
  }
)

export const DELETE = createApiHandlerWithParams(
  { allowedRoles: ['admin', 'tenant_owner', 'platform_admin', 'platform_owner'] },
  async (_request, context, params) => {
    const { id } = params

    const { error } = await context.supabase
      .from('companies')
      .delete()
      .eq('id', id)
      .eq('organization_id', context.profile.organization_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  }
)
