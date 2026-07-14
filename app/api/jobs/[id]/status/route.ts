import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateJobStatusSchema } from '@/lib/validations/jobs'
import { ROLES } from '@/lib/auth/roles'

export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    // Job status changes are a write; keep read-only/field roles out (RLS now
    // enforces this too, but the gate gives the caller a clear 403).
    allowedRoles: ROLES.TENANT_WRITE,
    bodySchema: updateJobStatusSchema,
  },
  async (_request, _context, params, body) => {
    const { status, internal_notes, actual_labor_hours } = body
    const job = await JobsService.updateStatus(params.id, status, {
      internal_notes,
      actual_labor_hours,
    })
    return NextResponse.json(job)
  }
)
