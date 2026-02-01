import { NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { updateChecklistItemSchema } from '@/lib/validations/jobs'

/**
 * PATCH /api/jobs/[id]/checklist/[itemId]
 * Update a checklist item
 */
export const PATCH = createApiHandlerWithParams<
  typeof updateChecklistItemSchema._type,
  unknown,
  { id: string; itemId: string }
>(
  {
    rateLimit: 'general',
    bodySchema: updateChecklistItemSchema,
  },
  async (_request, _context, params, body) => {
    const checklistItem = await JobCompletionService.updateChecklistItem(params.itemId, body)
    return NextResponse.json(checklistItem)
  }
)
