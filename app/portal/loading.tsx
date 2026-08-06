import { LoadingPage } from '@/components/ui/loading-spinner'

// Portal visitors arrive from an email link with no context, so the wording says
// what is coming rather than naming a part of the app they have never seen.
export default function PortalLoading() {
  return <LoadingPage message="Loading your document…" />
}
