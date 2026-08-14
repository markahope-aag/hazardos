import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { throwDbError } from '@/lib/utils/secure-error-handler'

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
  // Email appearance — drive the shared template wrapper. Hex colors
  // are validated as #-prefixed 3- or 6-digit codes; logo + signature
  // are free-form. Empty string → null (clears the value).
  email_header_color: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, 'Use a hex color like #1f2937')
    .optional()
    .or(z.literal('')),
  email_accent_color: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, 'Use a hex color like #f97316')
    .optional()
    .or(z.literal('')),
  email_logo_url: z.string().url().max(2048).optional().or(z.literal('')),
  email_signature: z.string().max(2000).optional().or(z.literal('')),
  // Survey photo retention window in days. The DB enforces 90–3650
  // via CHECK constraint; we mirror it here so the API rejects bad
  // values with a structured error rather than a Postgres error.
  photo_retention_days: z.number().int().min(90).max(3650).optional(),
  // Bounds for the scheduling time pickers, stored as HH:MM (the DB column
  // is a `time`, which accepts the seconds-less form). The DB also enforces
  // end > start; we check it here so the user gets a readable message
  // instead of a constraint violation.
  business_hours_start: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Use a 24-hour time like 06:00')
    .optional(),
  business_hours_end: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Use a 24-hour time like 19:00')
    .optional(),
  // Per-org boilerplate text that pre-fills the OPP wizard's four
  // protective-measures sections. Stored as a single JSONB column so
  // adding a fifth section (state variants) doesn't need a migration.
  opp_defaults: z
    .object({
      containment: z.string().max(4000).optional(),
      ventilation: z.string().max(4000).optional(),
      work_practices: z.string().max(4000).optional(),
      final_cleaning: z.string().max(4000).optional(),
    })
    .optional(),
})
  // The form always submits both bounds together, so an inverted range can
  // be caught before it reaches the CHECK constraint. A partial update that
  // sends only one bound falls through to the DB check.
  .refine(
    (body) =>
      !body.business_hours_start ||
      !body.business_hours_end ||
      body.business_hours_end > body.business_hours_start,
    {
      message: 'Closing time must be later than opening time',
      path: ['business_hours_end'],
    },
  )

// Returns the caller's own organization record.
export const GET = createApiHandler(
  { rateLimit: 'general' },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('organizations')
      .select('id, name, email, phone, website, license_number, address, city, state, zip, timezone, email_from_name, email_reply_to, email_domain, email_domain_status, email_header_color, email_accent_color, email_logo_url, email_signature, photo_retention_days, opp_defaults, business_hours_start, business_hours_end')
      .eq('id', context.profile.organization_id)
      .single()
    if (error) throwDbError(error, 'load organization')
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
    // and object fields (opp_defaults JSONB) are passed through verbatim
    // — they can't be "cleared" to null via empty string.
    const updates: Record<string, string | number | null | object> = {}
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined) continue
      if (typeof value === 'number' || (typeof value === 'object' && value !== null)) {
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
    if (error) throwDbError(error, 'update organization')

    return NextResponse.json({ organization: data })
  },
)
