import EntityActivityFeed from '@/components/activity/entity-activity-feed'
import type { Customer } from '@/types/database'

interface CustomerActivityFeedProps {
  customer: Customer
}

// The feed on a contact page shows activity across the contact itself AND
// every survey/estimate/proposal/opportunity/job linked to them. A feed
// scoped to just the customer row would miss all the interesting events
// (job created, estimate sent, proposal signed) — those entities have
// their own entity_type in activity_log.
export default function CustomerActivityFeed({ customer }: CustomerActivityFeedProps) {
  return <EntityActivityFeed customerId={customer.id} />
}
