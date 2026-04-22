import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import Link from 'next/link';
import { DEFAULT_TIMEZONE, isoDateOffset, todayIso } from '@/lib/timezone';

// Re-export error boundary wrapper
export { UpcomingJobsErrorBoundary } from './error-wrappers';

interface Customer {
  company_name: string | null;
  name: string | null;
}

interface Job {
  id: string;
  job_number: string;
  scheduled_start_date: string;
  scheduled_start_time: string | null;
  job_address: string;
  status: string;
  customer: Customer | null;
}

// "Upcoming" = work on the docket or currently in-flight. A 7-day window
// was too tight; most crews book 2–4 weeks out. 30 days hits the realistic
// planning horizon without the card becoming a wall of rows.
const UPCOMING_JOB_STATUSES = ['scheduled', 'in_progress']
const UPCOMING_WINDOW_DAYS = 30

export async function UpcomingJobs() {
  const supabase = await createClient();

  // Resolve the org's timezone so "today" is the customer's clock, not
  // the server's. Falls back to Central if the profile lookup fails.
  const { data: { user } } = await supabase.auth.getUser()
  let tz = DEFAULT_TIMEZONE
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization:organizations!profiles_organization_id_fkey(timezone)')
      .eq('id', user.id)
      .single()
    const org = Array.isArray(profile?.organization) ? profile?.organization[0] : profile?.organization
    if (org?.timezone) tz = org.timezone
  }

  const today = todayIso(tz)
  const windowEnd = isoDateOffset(tz, UPCOMING_WINDOW_DAYS)

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id,
      job_number,
      scheduled_start_date,
      scheduled_start_time,
      job_address,
      status,
      customer:customers!customer_id(company_name, name)
    `)
    .in('status', UPCOMING_JOB_STATUSES)
    .gte('scheduled_start_date', today)
    .lte('scheduled_start_date', windowEnd)
    .order('scheduled_start_date', { ascending: true })
    .order('scheduled_start_time', { ascending: true, nullsFirst: false })
    .limit(5);

  const typedJobs = (jobs || []) as unknown as Job[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Upcoming Jobs</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Scheduled or in progress · next {UPCOMING_WINDOW_DAYS} days
          </p>
        </div>
        <Link href="/calendar" className="text-sm text-primary hover:underline">
          View Calendar
        </Link>
      </CardHeader>
      <CardContent>
        {typedJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No jobs scheduled in the next {UPCOMING_WINDOW_DAYS} days
          </p>
        ) : (
          <div className="space-y-4">
            {typedJobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">
                      {job.customer?.company_name ||
                       job.customer?.name ||
                       'Unknown Customer'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      {/* Render the DATE column in UTC so the day doesn't
                          shift — 'YYYY-MM-DD' parses to UTC midnight and
                          a west-of-UTC locale's default format would
                          display the day before. */}
                      {formatInTimeZone(new Date(job.scheduled_start_date), 'UTC', 'EEE, MMM d')}
                      {job.scheduled_start_time && ` at ${job.scheduled_start_time}`}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {job.job_address}
                    </div>
                  </div>
                  <Badge variant="outline">{job.job_number}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
