import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateTimeEntrySchema } from '@/lib/validations/jobs'
import { z } from 'zod'

type UpdateTimeEntryBody = z.infer<typeof updateTimeEntrySchema>
type Params = { id: string; entryId: string }

/**
 * PATCH /api/jobs/[id]/time-entries/[entryId]
 * Update a time entry
 */
export const PATCH = createApiHandlerWithParams<UpdateTimeEntryBody, unknown, Params>(
  {
    rateLimit: 'general',
    bodySchema: updateTimeEntrySchema,
  },
  async (_request, _context, params, body) => {
    const timeEntry = await JobCompletionService.updateTimeEntry(params.entryId, body)
    return NextResponse.json(timeEntry)
  }
)

/**
 * DELETE /api/jobs/[id]/time-entries/[entryId]
 * Delete a time entry
 */
export const DELETE = createApiHandlerWithParams<unknown, unknown, Params>(
  { rateLimit: 'general' },
  async (_request, _context, params) => {
    await JobCompletionService.deleteTimeEntry(params.entryId)
    return NextResponse.json({ success: true })
  }
)
