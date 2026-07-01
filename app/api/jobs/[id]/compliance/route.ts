import { NextResponse } from 'next/server'
import { z } from 'zod'
import { CredentialsService } from '@/lib/services/credentials'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'

const complianceQuerySchema = z.object({
  // When provided, evaluates a single (prospective) worker for the
  // assignment gate instead of the whole assigned crew.
  worker_id: z.string().uuid().optional(),
})

/**
 * GET /api/jobs/[id]/compliance
 *   → full crew compliance for the job
 * GET /api/jobs/[id]/compliance?worker_id=...
 *   → assignment-gate check for a single worker (held/missing/expired + allowed)
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_FIELD,
    querySchema: complianceQuerySchema,
  },
  async (_request, _context, params, _body, query) => {
    if (query.worker_id) {
      const check = await CredentialsService.checkWorkerForJob(params.id, query.worker_id)
      return NextResponse.json(check)
    }
    const compliance = await CredentialsService.getComplianceForJob(params.id)
    return NextResponse.json(compliance)
  },
)
