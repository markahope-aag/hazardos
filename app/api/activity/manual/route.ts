import { NextResponse } from 'next/server'
import { Activity } from '@/lib/services/activity-service'
import { createApiHandler } from '@/lib/utils/api-handler'
import { createManualActivitySchema } from '@/lib/validations/activity'

/**
 * POST /api/activity/manual
 * Log a manual activity (note or call)
 */
export const POST = createApiHandler(
  {
    rateLimit: 'general',
    bodySchema: createManualActivitySchema,
  },
  async (_request, _context, body) => {
    const { type, entity_type, entity_id, entity_name, content, call_direction, call_duration } = body

    if (type === 'note') {
      await Activity.note(entity_type, entity_id, entity_name, content!)
    } else if (type === 'call') {
      await Activity.call(entity_type, entity_id, entity_name, {
        direction: call_direction!,
        duration: call_duration,
        notes: content,
      })
    }

    return NextResponse.json({ success: true })
  }
)
