import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/utils/api-handler'
import { ROLES } from '@/lib/auth/roles'
import { z } from 'zod'

const querySchema = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  category: z.string().optional(),
})

/**
 * GET /api/calendar/industry-events
 *
 * Returns industry events (NARI meetings, networking nights, etc.)
 * that overlap [start, end). Visible on the unified calendar grid
 * alongside jobs and surveys.
 */
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    allowedRoles: ROLES.TENANT_READ,
    querySchema,
  },
  async (_request, context, _body, query) => {
    let q = context.supabase
      .from('industry_events')
      .select(
        'id, category, title, start_at, end_at, all_day, location, description, registration_url',
      )
      // Range overlap: event ends after window start AND starts before window end.
      .gte('end_at', query.start)
      .lte('start_at', query.end)
      .order('start_at', { ascending: true })

    if (query.category) q = q.eq('category', query.category)

    const { data, error } = await q
    if (error) throw error

    return NextResponse.json({ events: data ?? [] })
  },
)
