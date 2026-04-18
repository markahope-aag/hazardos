import EntityActivityFeed from '@/components/activity/entity-activity-feed'
import type { Customer } from '@/types/database'

interface CustomerActivityFeedProps {
  customer: Customer
}

export default function CustomerActivityFeed({ customer }: CustomerActivityFeedProps) {
  return <EntityActivityFeed entityType="customer" entityId={customer.id} />
}
