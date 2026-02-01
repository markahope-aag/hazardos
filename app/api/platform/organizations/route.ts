import { NextRequest, NextResponse } from 'next/server'
import { PlatformAdminService } from '@/lib/services/platform-admin-service'
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler'
import type { OrganizationFilters } from '@/types/platform-admin'

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await PlatformAdminService.isPlatformAdmin()
    if (!isAdmin) {
      throw new SecureError('FORBIDDEN', 'Platform admin access required')
    }

    const { searchParams } = request.nextUrl

    const filters: OrganizationFilters = {
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || undefined,
      planSlug: searchParams.get('planSlug') || undefined,
      sortBy: (searchParams.get('sortBy') as OrganizationFilters['sortBy']) || 'created_at',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '20'),
    }

    const result = await PlatformAdminService.getOrganizations(filters)
    return NextResponse.json(result)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
