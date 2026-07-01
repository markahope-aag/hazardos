import { NextResponse } from 'next/server'
import { CredentialsService } from '@/lib/services/credentials'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { updateCredentialTypeSchema } from '@/lib/validations/credential'

/** PATCH /api/credential-types/[id] — update a credential type */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: updateCredentialTypeSchema,
  },
  async (_request, _context, params, body) => {
    const type = await CredentialsService.updateType(params.id, body)
    return NextResponse.json(type)
  },
)

/** DELETE /api/credential-types/[id] — remove a credential type (if unused) */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, _context, params) => {
    await CredentialsService.deleteType(params.id)
    return NextResponse.json({ success: true })
  },
)
