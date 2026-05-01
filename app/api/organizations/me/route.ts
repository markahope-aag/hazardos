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
  // IANA timezone string. Validated as non-empty; the actual list is
  // open-ended (date-fns-tz accepts any IANA zone) so we don't pin it
  // to our US-only UI picker.
  timezone: z.string().min(1).max(80).optional(),
  // Email sender customization. Domain setup is handled separately at
  // /api/organizations/me/email-domain; these two fields are free-form
  // display concerns.
  email_from_name: z.string().max(120).optional().or(z.literal('')),
  email_reply_to: z.string().email().optional().or(z.literal('')),
  // Survey photo retention window in days. The DB enforces 90–3650
  // via CHECK constraint; we mirror it here so the API rejects bad
  // values with a structured error rather than a Postgres error.
  photo_retention_days: z.number().int().min(90).max(3650).optional(),
})

// Returns the caller's own organization record.
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('organizations')
      .select('id, name, email, phone, website, license_number, address, city, state, zip, timezone, email_from_name, email_reply_to, email_domain, email_domain_status, photo_retention_days')
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
    // Convert empty strings to null so clearing a field works. Number
    // fields are passed through verbatim — they can't be "cleared" to
    // null because the column is NOT NULL with a default.
    const updates: Record<string, string | number | null> = {}
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue
      if (typeof value === 'number') {
        updates[key] = value
      } else {
        updates[key] = value === '' ? null : (value as string)
      }
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
