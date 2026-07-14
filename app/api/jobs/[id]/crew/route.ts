import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { CredentialsService } from '@/lib/services/credentials'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { assignCrewSchema, removeCrewSchema } from '@/lib/validations/jobs'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import { formatError } from '@/lib/utils/logger'

export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: assignCrewSchema,
  },
  async (_request, context, params, body) => {
    // Credential assignment gate: when the org enforces 'block', refuse to
    // assign a worker who lacks a current credential the job requires. The
    // check fails OPEN on technical errors so a compliance hiccup never breaks
    // crew assignment; a genuine block (SecureError) still propagates.
    try {
      const check = await CredentialsService.checkWorkerForJob(params.id, body.profile_id)
      if (!check.allowed) {
        const blocking = check.requirements
          .filter((r) => r.state === 'missing' || r.state === 'expired')
          .map((r) => `${r.name} (${r.state})`)
          .join(', ')
        throw new SecureError(
          'VALIDATION_ERROR',
          `${check.worker_name ?? 'This worker'} cannot be assigned — required credentials not current: ${blocking}`,
        )
      }
    } catch (error) {
      if (error instanceof SecureError) throw error
      context.log.warn(
        { err: formatError(error), jobId: params.id },
        'credential gate check failed; allowing assignment',
      )
    }

    try {
      const crew = await JobsService.assignCrew({
        job_id: params.id,
        ...body,
      })
      return NextResponse.json(crew, { status: 201 })
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate')) {
        throw new SecureError('VALIDATION_ERROR', 'This crew member is already assigned to this job')
      }
      const msg = error instanceof Error ? error.message : String(error)
      throwDbError({ message: msg }, 'assign crew member')
    }
  }
)

export const DELETE = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: removeCrewSchema,
  },
  async (_request, _context, params, body) => {
    await JobsService.removeCrew(params.id, body.profile_id)
    return NextResponse.json({ success: true })
  }
)
