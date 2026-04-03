import { redirect } from 'next/navigation'

// CRM Jobs tab redirects to the main jobs page for now.
// This will be replaced with an integrated CRM jobs view later.
export default function CrmJobsPage() {
  redirect('/jobs')
}
