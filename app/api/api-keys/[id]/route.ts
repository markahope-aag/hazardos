import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ApiKeyService } from '@/lib/services/api-key-service'
import { ROLES } from '@/lib/auth/roles'

/**
 * DELETE /api/api-keys/[id]
 * Revoke (soft-disable) an API key. Admin-only. The api-key-list Revoke button
 * calls this — ST10: the route did not exist, so revoke always failed. RLS on
 * api_keys scopes the update to the caller's org, so a cross-org id no-ops.
 */
export const DELETE = createApiHandlerWithParams(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN },
  async (_request, _context, params) => {
    await ApiKeyService.revoke(params.id)
    return NextResponse.json({ success: true })
  },
)
