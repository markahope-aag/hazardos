import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandler } from '@/lib/utils/api-handler'
import { getEntityActivity, getRecentActivity } from '@/lib/services/activity-service'

const querySchema = z.object({
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

// GET /api/activity-log
//   - entity_type + entity_id: thread of activity for one specific entity.
//   - customer_id: aggregate activity across EVERYTHING that belongs to
//     that customer — the customer row itself plus their site surveys,
//     estimates, proposals, opportunities, and jobs. Used by the Activity
//     tab on the contact detail page, which otherwise would only show
//     edits to the customer row and miss "job created", "estimate sent",
//     etc.
//   - neither: recent activity across the org.
// RLS on activity_log keeps results org-scoped.
export const GET = createApiHandler(
  {
    rateLimit: 'general',
    querySchema,
  },
  async (_request, context, _body, query) => {
    if (query.customer_id) {
      // Gather the IDs of every related entity first, in a handful of narrow
      // queries. Doing this server-side is cheaper than a single activity_log
      // query with a giant OR across six entity types — the id lists are
      // usually short and let the activity query hit the existing
      // (entity_type, entity_id) index.
      const relatedIds: Array<[string, string]> = [['customer', query.customer_id]]

      const [surveys, estimates, proposals, opps, jobs] = await Promise.all([
        context.supabase
          .from('site_surveys')
          .select('id')
          .eq('customer_id', query.customer_id),
        context.supabase
          .from('estimates')
          .select('id')
          .eq('customer_id', query.customer_id),
        context.supabase
          .from('proposals')
          .select('id')
          .eq('customer_id', query.customer_id),
        context.supabase
          .from('opportunities')
          .select('id')
          .eq('customer_id', query.customer_id),
        context.supabase
          .from('jobs')
          .select('id')
          .eq('customer_id', query.customer_id),
      ])

      for (const row of surveys.data || []) relatedIds.push(['site_survey', row.id])
      for (const row of estimates.data || []) relatedIds.push(['estimate', row.id])
      for (const row of proposals.data || []) relatedIds.push(['proposal', row.id])
      for (const row of opps.data || []) relatedIds.push(['opportunity', row.id])
      for (const row of jobs.data || []) relatedIds.push(['job', row.id])

      // Build an OR clause covering every (entity_type, entity_id) pair.
      const entityIds = relatedIds.map(([, id]) => id)
      const entityTypes = Array.from(new Set(relatedIds.map(([t]) => t)))
      const { data, error } = await context.supabase
        .from('activity_log')
        .select(
          'id, organization_id, user_id, user_name, action, entity_type, entity_id, entity_name, old_values, new_values, description, created_at',
        )
        .in('entity_type', entityTypes)
        .in('entity_id', entityIds)
        .order('created_at', { ascending: false })
        .limit(query.limit ?? 200)
      if (error) throw error

      return NextResponse.json({ activity: data || [] })
    }

    if (query.entity_type && query.entity_id) {
      const activity = await getEntityActivity(query.entity_type, query.entity_id)
      return NextResponse.json({ activity })
    }
    const activity = await getRecentActivity(query.limit ?? 20)
    return NextResponse.json({ activity })
  },
)
