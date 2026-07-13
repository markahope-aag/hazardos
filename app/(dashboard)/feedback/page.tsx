import { redirect } from 'next/navigation'
import { getCurrentUser, getCurrentProfile } from '@/lib/auth/server-auth'
import { ROLES } from '@/lib/auth/roles'
import { FeedbackService } from '@/lib/services/feedback-service'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FeedbackContent } from '@/components/feedback/feedback-content'
import { Gauge, Star, Send, Quote, Download } from 'lucide-react'
import type { FeedbackSurvey } from '@/types/feedback'

export default async function FeedbackPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const [profile, stats, completed] = await Promise.all([
    getCurrentProfile(),
    FeedbackService.getFeedbackStats(),
    FeedbackService.listSurveys({ status: 'completed', limit: 500 }),
  ])

  const canManage = ROLES.TENANT_ADMIN.includes(profile?.role ?? '')

  const responses = completed.surveys
  const testimonials = responses.filter(
    (s: FeedbackSurvey) => !!s.testimonial_text,
  )

  const npsDisplay = stats.nps_score == null ? '—' : Math.round(stats.nps_score).toString()
  const overallDisplay =
    stats.avg_overall_rating == null ? '—' : stats.avg_overall_rating.toFixed(1)
  const responseRateDisplay =
    stats.response_rate == null ? '—' : `${Math.round(stats.response_rate)}%`

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Customer Feedback</h1>
          <p className="text-muted-foreground">
            Survey responses, satisfaction scores, and testimonials
          </p>
        </div>
        <Button asChild variant="outline">
          {/* Plain download link — this targets an API route that streams a
              CSV attachment, not a page, so next/link doesn't apply. */}
          <a href="/api/feedback/export?status=completed">
            <Download className="h-4 w-4 mr-2" />
            Export Responses
          </a>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{npsDisplay}</div>
            <p className="text-xs text-muted-foreground">Promoters − detractors</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallDisplay}</div>
            <p className="text-xs text-muted-foreground">Overall, out of 5</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responseRateDisplay}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completed_surveys} of {stats.total_surveys} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Testimonials</CardTitle>
            <Quote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.testimonials_count}</div>
            <p className="text-xs text-muted-foreground">Approved for public use</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <FeedbackContent
            responses={responses}
            testimonials={testimonials}
            canManage={canManage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
