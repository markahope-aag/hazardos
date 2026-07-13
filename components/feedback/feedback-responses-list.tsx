'use client'

import { RatingStars } from '@/components/feedback/rating-stars'
import { Badge } from '@/components/ui/badge'
import { MessageSquareQuote } from 'lucide-react'
import type { FeedbackSurvey } from '@/types/feedback'

interface FeedbackResponsesListProps {
  surveys: FeedbackSurvey[]
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function npsBadge(score: number | null) {
  if (score == null) return null
  if (score >= 9) return <Badge className="bg-green-100 text-green-800">Promoter</Badge>
  if (score >= 7) return <Badge className="bg-yellow-100 text-yellow-800">Passive</Badge>
  return <Badge className="bg-red-100 text-red-800">Detractor</Badge>
}

/**
 * Office-facing list of completed feedback responses (FB7). Each card shows
 * the overall rating, sub-ratings, NPS classification, and any written
 * feedback the customer left.
 */
export function FeedbackResponsesList({ surveys }: FeedbackResponsesListProps) {
  if (surveys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <MessageSquareQuote className="h-10 w-10 mb-3 opacity-40" />
        <p className="font-medium">No responses yet</p>
        <p className="text-sm">Completed feedback surveys will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {surveys.map((survey) => (
        <div key={survey.id} className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-medium">
                {survey.customer_name || survey.customer?.name || 'Customer'}
                {survey.customer_company && (
                  <span className="text-muted-foreground font-normal">
                    {' '}
                    · {survey.customer_company}
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {survey.job?.job_number ? `Job ${survey.job.job_number} · ` : ''}
                {formatDate(survey.completed_at)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {npsBadge(survey.likelihood_to_recommend)}
              <RatingStars value={survey.rating_overall} showValue />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Quality</span>
              <div>
                <RatingStars value={survey.rating_quality} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Communication</span>
              <div>
                <RatingStars value={survey.rating_communication} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Timeliness</span>
              <div>
                <RatingStars value={survey.rating_timeliness} />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Value</span>
              <div>
                <RatingStars value={survey.rating_value} />
              </div>
            </div>
          </div>

          {survey.feedback_text && (
            <p className="mt-3 text-sm border-l-2 border-muted pl-3 italic">
              “{survey.feedback_text}”
            </p>
          )}

          {survey.improvement_suggestions && (
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Suggested improvements: </span>
              {survey.improvement_suggestions}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
