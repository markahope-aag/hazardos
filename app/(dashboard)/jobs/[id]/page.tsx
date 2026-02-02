import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { JobHeader } from './job-header'
import { JobDetails } from './job-details'
import { JobCrew } from './job-crew'
import { JobNotes } from './job-notes'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: job, error } = await supabase
    .from('jobs')
    .select(`
      *,
      customer:customers(*),
      proposal:proposals(id, proposal_number, total),
      estimate:estimates(id, estimate_number),
      site_survey:site_surveys(id),
      crew:job_crew(
        *,
        profile:profiles(id, full_name, email, phone, avatar_url, role)
      ),
      equipment:job_equipment(*),
      materials:job_materials(*),
      disposal:job_disposal(*),
      change_orders:job_change_orders(
        *
      ),
      notes:job_notes(
        *,
        author:profiles(id, full_name, avatar_url)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !job) {
    notFound()
  }

  // Transform nested arrays
  const transformedJob = {
    ...job,
    customer: Array.isArray(job.customer) ? job.customer[0] : job.customer,
    proposal: Array.isArray(job.proposal) ? job.proposal[0] : job.proposal,
    estimate: Array.isArray(job.estimate) ? job.estimate[0] : job.estimate,
    site_survey: Array.isArray(job.site_survey) ? job.site_survey[0] : job.site_survey,
    notes: (job.notes || []).map((note: { author?: unknown }) => ({
      ...note,
      author: Array.isArray(note.author) ? note.author[0] : note.author,
    })),
    crew: (job.crew || []).map((c: { profile?: unknown }) => ({
      ...c,
      profile: Array.isArray(c.profile) ? c.profile[0] : c.profile,
    })),
  }

  // Get available crew members for assignment
  const { data: availableCrew } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('organization_id', job.organization_id)
    .eq('is_active', true)
    .in('role', ['technician', 'estimator', 'admin', 'tenant_owner'])

  return (
    <div className="container py-6">
      <JobHeader job={transformedJob} />

      <Tabs defaultValue="details" className="mt-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="crew">
            Crew ({transformedJob.crew?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="notes">
            Notes ({transformedJob.notes?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4">
          <JobDetails job={transformedJob} />
        </TabsContent>

        <TabsContent value="crew" className="mt-4">
          <JobCrew
            job={transformedJob}
            crew={transformedJob.crew || []}
            availableCrew={availableCrew || []}
          />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <JobNotes job={transformedJob} notes={transformedJob.notes || []} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
