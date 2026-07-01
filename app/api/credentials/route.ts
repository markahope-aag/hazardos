import { NextResponse } from 'next/server'
import { CredentialsService } from '@/lib/services/credentials'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { createCredentialSchema, listCredentialsQuerySchema } from '@/lib/validations/credential'

/** GET /api/credentials — list credentials with filters (worker/status/etc.) */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_READ,
    querySchema: listCredentialsQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const credentials = await CredentialsService.listCredentials(query)
    return NextResponse.json({ credentials })
  },
)

/** POST /api/credentials — record a held credential (admins) */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: createCredentialSchema,
  },
  async (_request, _context, body) => {
    const credential = await CredentialsService.createCredential(body)
    return NextResponse.json(credential, { status: 201 })
  },
)
