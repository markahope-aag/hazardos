import { NextResponse } from 'next/server'
import { JobsService } from '@/lib/services/jobs-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { assignCrewSchema, removeCrewSchema } from '@/lib/validations/jobs'
import { SecureError } from '@/lib/utils/secure-error-handler'

export const POST = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    bodySchema: assignCrewSchema,
  },
  async (_request, _context, params, body) => {
    try {
      const crew = await JobsService.assignCrew({
        job_id: params.id,
        ...body,
      })
      return NextResponse.json(crew, { status: 201 })
    } catch (error) {
      // Check for duplicate key error
      if (error instanceof Error && error.message.includes('duplicate')) {
        throw new SecureError('VALIDATION_ERROR', 'This crew member is already assigned to this job')
      }
      throw error
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
