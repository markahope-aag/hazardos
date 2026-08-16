import type { ReactNode } from 'react'
import { requireRoles } from '@/lib/auth/require-roles'
import { ROLES } from '@/lib/auth/roles'

// The sales hub is commissions, approvals and analytics, which the main nav has
// always treated as an admin-level surface. Yesterday's gate used the broader
// financial preset, which would have handed it to estimators and viewers who
// never had it in the menu. TENANT_ADMIN matches what the nav already meant.
export default async function SalesLayout({ children }: { children: ReactNode }) {
  await requireRoles(ROLES.TENANT_ADMIN, '/')
  return <>{children}</>
}
