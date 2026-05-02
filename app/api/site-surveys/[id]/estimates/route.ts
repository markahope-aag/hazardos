import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'

const querySchema = z.object({
  include: z.enum(['latest', 'all']).optional(),
})

/**
 * GET /api/site-surveys/[id]/estimates
 *
 * Lists every estimate rooted on this survey, grouped by chain root.
 * - `?include=latest` (default): returns one row per chain — the highest
 *   version. Each row carries chain_total so the UI can show "v3 of 3".
 * - `?include=all`: returns every estimate, ordered by chain then version.
 *
 * Standalone estimates (site_survey_id IS NULL) are not included here —
 * they're surfaced on the global estimates list, not under a survey.
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
    querySchema,
  },
  async (_request, context, params, _body, query) => {
    const include = query.include ?? 'latest'

    const { data, error } = await context.supabase
      .from('estimates')
      .select(`
        id, estimate_number, status, total, version, estimate_root_id,
        parent_estimate_id, created_at, project_name, revision_notes
      `)
      .eq('site_survey_id', params.id)
      .eq('organization_id', context.profile.organization_id)
      .order('estimate_root_id', { ascending: true })
      .order('version', { ascending: true })

    if (error) {
      throw error
    }

    const all = data || []

    // Compute chain totals — Y in "X of Y".
    const chainTotal = new Map<string, number>()
    for (const e of all) {
      const root = e.estimate_root_id as string
      const v = e.version as number
      const cur = chainTotal.get(root) ?? 0
      if (v > cur) chainTotal.set(root, v)
    }

    const enriched = all.map((e) => ({
      ...e,
      chain_total: chainTotal.get(e.estimate_root_id as string) ?? e.version,
    }))

    if (include === 'all') {
      return NextResponse.json({ estimates: enriched })
    }

    // Latest per chain only.
    const latest: typeof enriched = []
    const seen = new Set<string>()
    for (const e of enriched.slice().reverse()) {
      const root = e.estimate_root_id as string
      if (seen.has(root)) continue
      seen.add(root)
      latest.push(e)
    }
    latest.reverse()

    return NextResponse.json({ estimates: latest })
  },
)
