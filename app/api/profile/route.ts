import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { throwDbError } from '@/lib/utils/secure-error-handler'

const updateProfileSchema = z.object({
  first_name: z.string().max(100).optional().or(z.literal('')),
  last_name: z.string().max(100).optional().or(z.literal('')),
})

/**
 * PATCH /api/profile
 * Update the signed-in user's own profile (name). Any authenticated user can
 * edit their own row (RLS: users_can_update_own_profile). This backs the
 * /settings/profile page — the team endpoint blocks self-edits and points here
 * (ST21: neither this route nor the page existed).
 */
export const PATCH = createApiHandler(
  { rateLimit: 'general', bodySchema: updateProfileSchema },
  async (_request, context, body) => {
    const firstName = body.first_name?.trim() || null
    const lastName = body.last_name?.trim() || null
    const fullName = [firstName, lastName].filter(Boolean).join(' ') || null

    const { data, error } = await context.supabase
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName, full_name: fullName })
      .eq('id', context.user.id)
      .select('id, first_name, last_name, full_name')
      .single()

    if (error) throwDbError(error, 'update profile')
    return NextResponse.json({ profile: data })
  },
)
