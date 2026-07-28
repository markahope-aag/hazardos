import { redirect } from 'next/navigation'

// The CRM jobs list is the canonical one. This route previously rendered a
// second, separately-maintained jobs table with different filters, pagination
// and status config, so ordinary navigation could show two different Jobs
// lists that disagreed. Collapsed to a redirect, matching the treatment the
// other legacy/CRM route pairs already got (/customers -> /crm/contacts).
//
// The /jobs/[id]/* sub-routes (new, complete, edit, review-queue) stay live —
// the CRM pages link straight into them.
export default function JobsPage() {
  redirect('/crm/jobs')
}
