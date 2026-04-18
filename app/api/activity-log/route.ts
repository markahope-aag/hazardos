import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { getEntityActivity, getRecentActivity } from '@/lib/services/activity-service'

const querySchema = z.object({
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

// GET /api/activity-log
//   - with entity_type + entity_id: thread of activity for a single entity
//   - with neither: recent activity across the org
// RLS on activity_log keeps results org-scoped.
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema,
  },
  async (_request, _context, _body, query) => {
    if (query.entity_type && query.entity_id) {
      const activity = await getEntityActivity(query.entity_type, query.entity_id)
      return NextResponse.json({ activity })
    }
    const activity = await getRecentActivity(query.limit ?? 20)
    return NextResponse.json({ activity })
  },
)
