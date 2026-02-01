import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin } from 'lucide-react';
import { format, addDays } from 'date-fns';
import Link from 'next/link';

// Re-export error boundary wrapper
export { UpcomingJobsErrorBoundary } from './error-wrappers';

interface Customer {
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
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

export async function UpcomingJobs() {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];
  const nextWeek = addDays(new Date(), 7).toISOString().split('T')[0];

  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      id,
      job_number,
      scheduled_start_date,
      scheduled_start_time,
      job_address,
      status,
      customer:customers(company_name, first_name, last_name)
    `)
    .gte('scheduled_start_date', today)
    .lte('scheduled_start_date', nextWeek)
    .neq('status', 'cancelled')
    .order('scheduled_start_date', { ascending: true })
    .limit(5);

  const typedJobs = (jobs || []) as unknown as Job[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Upcoming Jobs</CardTitle>
        <Link href="/calendar" className="text-sm text-primary hover:underline">
          View Calendar
        </Link>
      </CardHeader>
      <CardContent>
        {typedJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No jobs scheduled</p>
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
                       `${job.customer?.first_name || ''} ${job.customer?.last_name || ''}`.trim() ||
                       'Unknown Customer'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(job.scheduled_start_date), 'EEE, MMM d')}
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
