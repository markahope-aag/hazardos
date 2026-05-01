import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { throwDbError } from '@/lib/utils/secure-error-handler'
import { ROLES } from '@/lib/auth/roles'

/**
 * GET /api/team
 * List active team members in the caller's organization. Used by the
 * job-create form's technician picker, and any other surface that needs
 * to enumerate org members. Tenant-read so estimators and field staff
 * can assemble crews; deactivated members are hidden so they don't show
 * up in assignment dropdowns.
 */
export const GET = createApiHandler(
  { allowedRoles: ROLES.TENANT_READ },
  async (_request, context) => {
    const { data, error } = await context.supabase
      .from('profiles')
      .select('id, first_name, last_name, email, phone, role, last_login_at, is_active')
      .eq('organization_id', context.profile.organization_id)
      .eq('is_active', true)
      .order('first_name')

    if (error) throwDbError(error, 'fetch team members')

    return NextResponse.json({ members: data || [] })
  },
)
