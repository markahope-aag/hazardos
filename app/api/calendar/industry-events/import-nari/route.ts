import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * POST /api/calendar/industry-events/import-nari
 *
 * One-shot importer for the NARI of Madison 2026 calendar (18 events).
 * Idempotent — calling twice doesn't duplicate events. Returns the
 * count actually inserted on this call (zero if everything was already
 * present).
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, context) => {
    const { data, error } = await context.supabase.rpc(
      'import_nari_madison_2026',
      { p_organization_id: context.profile.organization_id },
    )

    if (error) throwDbError(error, 'import NARI events')

    return NextResponse.json({ inserted: data ?? 0 })
  },
)
