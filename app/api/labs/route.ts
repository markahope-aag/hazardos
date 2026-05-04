import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import { createLabSchema } from '@/lib/validations/lab-reports'

export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('labs')
      .select('*')
      .eq('organization_id', context.profile.organization_id)
      .order('name', { ascending: true })

    if (error) throwDbError(error, 'list labs')
    return NextResponse.json({ labs: data || [] })
  },
)

export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createLabSchema,
  },
  async (_request, context, body) => {
    const { data, error } = await context.supabase
      .from('labs')
      .insert({
        organization_id: context.profile.organization_id,
        name: body.name,
        contact_name: body.contact_name ?? null,
        contact_email: body.contact_email ?? null,
        contact_phone: body.contact_phone ?? null,
        address: body.address ?? null,
        notes: body.notes ?? null,
        is_active: body.is_active ?? true,
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create lab')
    return NextResponse.json(data, { status: 201 })
  },
)
