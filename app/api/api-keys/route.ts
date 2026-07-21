import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ApiKeyService, type CreateApiKeyInput } from '@/lib/services/api-key-service'
import { ROLES } from '@/lib/auth/roles'

// Scope enum derived from the service so the two can't drift.
const SCOPE_VALUES = ApiKeyService.getAvailableScopes().map((s) => s.value) as [string, ...string[]]

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  scopes: z.array(z.enum(SCOPE_VALUES)).min(1, 'Select at least one scope'),
  rate_limit: z.number().int().positive().max(100000).optional(),
  expires_at: z.string().datetime().optional(),
})

/**
 * POST /api/api-keys
 * Create an API key. Admin-only. The full key is returned exactly once (the
 * service stores only a sha256 hash + prefix). The settings/api/new page posts
 * here (ST9: neither the page nor this route existed, so creation was a dead
 * link).
 */
export const POST = createApiHandler(
  { rateLimit: 'general', allowedRoles: ROLES.TENANT_ADMIN, bodySchema: createApiKeySchema },
  async (_request, context, body) => {
    const result = await ApiKeyService.create(
      context.profile.organization_id,
      context.user.id,
      // Scopes are validated against the service's own scope list above, so the
      // cast to the branded scope union is safe.
      body as CreateApiKeyInput,
    )
    return NextResponse.json(result, { status: 201 })
  },
)
