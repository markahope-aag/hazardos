import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCurrentProfile } from '@/lib/auth/server-auth'
import { ROLES } from '@/lib/auth/roles'

// Central queue of job completions awaiting office review (J13). Before this,
// the only way to reach /jobs/[id]/review was a per-job banner, so a reviewer
// had to already know which job to open. This lists every submitted completion
// in one place. Admin-only, matching the approve/reject gate on the review page.
export default async function JobReviewQueuePage() {
  const profile = await getCurrentProfile()
  if (!ROLES.TENANT_ADMIN.includes(profile?.role ?? '')) {
    redirect('/crm/jobs')
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('job_completions')
    .select(`
      id, job_id, status, submitted_at, hours_variance_percent, cost_variance_percent,
      submitter:profiles!job_completions_submitted_by_fkey(id, full_name),
      job:jobs!job_completions_job_id_fkey(id, job_number, name)
    `)
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: true })

  const rows = (data || []).map((c) => ({
    ...c,
    submitter: Array.isArray(c.submitter) ? c.submitter[0] : c.submitter,
    job: Array.isArray(c.job) ? c.job[0] : c.job,
  }))

  const varianceColor = (percent: number | null | undefined) => {
    if (percent === null || percent === undefined) return 'text-muted-foreground'
    if (percent > 10) return 'text-red-600'
    if (percent < -10) return 'text-green-600'
    return 'text-muted-foreground'
  }
  const fmtPercent = (p: number | null | undefined) =>
    p === null || p === undefined ? '—' : `${p > 0 ? '+' : ''}${p.toFixed(1)}%`

  return (
    <div className="container py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/crm/jobs">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Jobs
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6" />
            Completion Review Queue
          </h1>
          <p className="text-muted-foreground">
            {rows.length === 0
              ? 'No job completions are awaiting review.'
              : `${rows.length} completion${rows.length === 1 ? '' : 's'} awaiting review`}
          </p>
        </div>
      </div>

      {error && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">
            Could not load the review queue. Please try again.
          </CardContent>
        </Card>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>Nothing to review right now.</p>
            <p className="text-sm">Submitted job completions will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <Card key={c.id} className="hover:border-primary/40 transition-colors">
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.job?.job_number || 'Job'}</span>
                    <Badge variant="secondary">Awaiting review</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{c.job?.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted by {c.submitter?.full_name || 'Unknown'}
                    {c.submitted_at ? ` · ${new Date(c.submitted_at).toLocaleString()}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className={cn('text-sm font-medium', varianceColor(c.hours_variance_percent))}>
                      {fmtPercent(c.hours_variance_percent)} hrs
                    </p>
                    <p className={cn('text-sm font-medium', varianceColor(c.cost_variance_percent))}>
                      {fmtPercent(c.cost_variance_percent)} cost
                    </p>
                  </div>
                  <Button asChild>
                    <Link href={`/jobs/${c.job_id}/review`}>Review</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
