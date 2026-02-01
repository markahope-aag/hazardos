import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateChecklistItemSchema } from '@/lib/validations/jobs'
import { z } from 'zod'

type UpdateChecklistItemBody = z.infer<typeof updateChecklistItemSchema>
type Params = { id: string; itemId: string }

/**
 * PATCH /api/jobs/[id]/checklist/[itemId]
 * Update a checklist item
 */
export const PATCH = createApiHandlerWithParams<UpdateChecklistItemBody, unknown, Params>(
  {
    rateLimit: 'general',
    bodySchema: updateChecklistItemSchema,
  },
  async (_request, _context, params, body) => {
    const checklistItem = await JobCompletionService.updateChecklistItem(params.itemId, body)
    return NextResponse.json(checklistItem)
  }
)
