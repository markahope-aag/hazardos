import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'

// PATCH body: every field is optional; empty string → null so the form can
// clear a value.
const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  website: z.string().max(500).optional().or(z.literal('')),
  license_number: z.string().max(100).optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  city: z.string().max(120).optional().or(z.literal('')),
  state: z.string().max(40).optional().or(z.literal('')),
  zip: z.string().max(20).optional().or(z.literal('')),
})

// Returns the caller's own organization record.
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('organizations')
      .select('id, name, email, phone, website, license_number, address, city, state, zip')
      .eq('id', context.profile.organization_id)
      .single()
    if (error) throw error
    return NextResponse.json({ organization: data })
  },
)

// Updates the caller's own organization. Role-gated to admins and above
// — a technician shouldn't be able to rename the company.
export const PATCH = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: updateSchema,
    allowedRoles: ['platform_owner', 'platform_admin', 'tenant_owner', 'admin'],
  },
  async (_request, context, body) => {
    // Convert empty strings to null so clearing a field works.
    const updates: Record<string, string | null> = {}
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue
      updates[key] = value === '' ? null : (value as string)
    }

    const { data, error } = await context.supabase
      .from('organizations')
      .update(updates)
      .eq('id', context.profile.organization_id)
      .select()
      .single()
    if (error) throw error

    return NextResponse.json({ organization: data })
  },
)
