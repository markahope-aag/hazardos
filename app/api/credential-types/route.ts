import { NextResponse } from 'next/server'
import { CredentialsService } from '@/lib/services/credentials'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import {
  createCredentialTypeSchema,
  listCredentialTypesQuerySchema,
} from '@/lib/validations/credential'

/** GET /api/credential-types — list the org's credential catalog */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_READ,
    querySchema: listCredentialTypesQuerySchema,
  },
  async (_request, _context, _body, query) => {
    const types = await CredentialsService.listTypes(query)
    return NextResponse.json({ types })
  },
)

/** POST /api/credential-types — create a credential type (admins) */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_ADMIN,
    bodySchema: createCredentialTypeSchema,
  },
  async (_request, _context, body) => {
    const type = await CredentialsService.createType(body)
    return NextResponse.json(type, { status: 201 })
  },
)
