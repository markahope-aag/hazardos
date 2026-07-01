import { NextResponse } from 'next/server'
import { CredentialsService } from '@/lib/services/credentials'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { updateCredentialSchema } from '@/lib/validations/credential'

/** GET /api/credentials/[id] */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_READ,
  },
  async (_request, _context, params) => {
    const credential = await CredentialsService.getCredential(params.id)
    if (!credential) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(credential)
  },
)

/** PATCH /api/credentials/[id] — update a credential (admins) */
export const PATCH = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: updateCredentialSchema,
  },
  async (_request, _context, params, body) => {
    const credential = await CredentialsService.updateCredential(params.id, body)
    return NextResponse.json(credential)
  },
)

/** DELETE /api/credentials/[id] (admins) */
export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
  },
  async (_request, _context, params) => {
    await CredentialsService.deleteCredential(params.id)
    return NextResponse.json({ success: true })
  },
)
