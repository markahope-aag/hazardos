import { NextResponse } from 'next/server'
import { createApiHandlerWithParams } from '@/lib/utils/api-handler'
import { getSurveyChain, getSurveyVersionInfo } from '@/lib/services/survey-versioning'

/**
 * GET /api/site-surveys/[id]/versions
 *
 * Returns the version chain for a survey: every version v1 -> latest,
 * plus { version, total, root_id }. Used by the survey detail page to
 * render "Version X of Y" and the version sidebar.
 */
export const GET = createApiHandlerWithParams(
  {
    rateLimit: 'general',
  },
  async (_request, context, params) => {
    const [chain, info] = await Promise.all([
      getSurveyChain(context.supabase, params.id),
      getSurveyVersionInfo(context.supabase, params.id),
    ])

    return NextResponse.json({ chain, version_info: info })
  },
)
