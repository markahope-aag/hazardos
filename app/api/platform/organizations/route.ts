import { NextResponse } from 'next/server'
import { PlatformAdminService } from '@/lib/services/platform-admin-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { organizationFiltersSchema } from '@/lib/validations/platform'
import { SecureError } from '@/lib/utils/secure-error-handler'
import type { OrganizationFilters } from '@/types/platform-admin'

/**
 * GET /api/platform/organizations
 * List organizations (platform admin only)
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema: organizationFiltersSchema,
    allowedRoles: ['platform_owner', 'platform_admin'],
  },
  async (_request, _context, _body, query) => {
    const isAdmin = await PlatformAdminService.isPlatformAdmin()
    if (!isAdmin) {
      throw new SecureError('FORBIDDEN', 'Platform admin access required')
    }

    const filters: OrganizationFilters = {
      search: query.search,
      status: query.status,
      planSlug: query.planSlug,
      sortBy: query.sortBy as OrganizationFilters['sortBy'] || 'created_at',
      sortOrder: query.sortOrder as 'asc' | 'desc' || 'desc',
      page: query.page || 1,
      limit: query.limit || 20,
    }

    const result = await PlatformAdminService.getOrganizations(filters)
    return NextResponse.json(result)
  }
)
