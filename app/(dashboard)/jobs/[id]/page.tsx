import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { JobHeader } from './job-header'
import { JobDetails } from './job-details'
import { JobCrew } from './job-crew'
import { JobNotes } from './job-notes'
import { JobDocuments } from './job-documents'
import EntityActivityFeed from '@/components/activity/entity-activity-feed'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch the base job alone first — if this fails we truly have no job
  // to render. Anything else (customer, crew, equipment, etc.) gets
  // pulled separately so a single broken embed can't blank the whole
  // page. This class of silent-embed-kill has produced four unexplained
  // 404s this week already.
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', id)
    .single()

  if (jobError || !job) {
    if (jobError) {
      console.error('[jobs/[id]] base job fetch failed', { id, error: jobError })
    }
    notFound()
  }

  const [
    customerRes, proposalRes, estimateRes, surveyRes,
    crewRes, equipmentRes, materialsRes, disposalRes,
    changeOrdersRes, notesRes,
  ] = await Promise.all([
    job.customer_id
      ? supabase.from('customers').select('*').eq('id', job.customer_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    job.proposal_id
      ? supabase.from('proposals').select('id, proposal_number').eq('id', job.proposal_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    job.estimate_id
      ? supabase.from('estimates').select('id, estimate_number, total').eq('id', job.estimate_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    job.site_survey_id
      ? supabase.from('site_surveys').select('id').eq('id', job.site_survey_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from('job_crew')
      .select('*, profile:profiles(id, full_name, email, phone, role)')
      .eq('job_id', id),
    supabase.from('job_equipment').select('*').eq('job_id', id),
    supabase.from('job_materials').select('*').eq('job_id', id),
    supabase.from('job_disposal').select('*').eq('job_id', id),
    supabase.from('job_change_orders').select('*').eq('job_id', id),
    supabase
      .from('job_notes')
      .select('*, author:profiles(id, full_name)')
      .eq('job_id', id),
  ])

  for (const [label, res] of Object.entries({
    customer: customerRes, proposal: proposalRes, estimate: estimateRes,
    survey: surveyRes, crew: crewRes, equipment: equipmentRes,
    materials: materialsRes, disposal: disposalRes,
    change_orders: changeOrdersRes, notes: notesRes,
  })) {
    if (res.error) {
      console.error(`[jobs/[id]] embed '${label}' failed`, { id, error: res.error })
    }
  }

  const transformedJob = {
    ...job,
    customer: customerRes.data ?? null,
    proposal: proposalRes.data ?? null,
    estimate: estimateRes.data ?? null,
    site_survey: surveyRes.data ?? null,
    equipment: equipmentRes.data ?? [],
    materials: materialsRes.data ?? [],
    disposal: disposalRes.data ?? [],
    change_orders: changeOrdersRes.data ?? [],
    notes: (notesRes.data ?? []).map((n: { author?: unknown }) => ({
      ...n,
      author: Array.isArray(n.author) ? n.author[0] : n.author,
    })),
    crew: (crewRes.data ?? []).map((c: { profile?: unknown }) => ({
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
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">
            Notes ({transformedJob.notes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
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

        <TabsContent value="documents" className="mt-4">
          <JobDocuments jobId={transformedJob.id} />
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <JobNotes job={transformedJob} notes={transformedJob.notes || []} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <EntityActivityFeed entityType="job" entityId={transformedJob.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
