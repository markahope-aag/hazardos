import type { ReactNode } from 'react'
import { requireRoles } from '@/lib/auth/require-roles'
import { ROLES } from '@/lib/auth/roles'

// Approving a week is a supervisor action. The API already refused
// technicians, so this closes the empty-shell page they could still open by
// typing the URL, and sends them back to their own clock.
export default async function ApprovalsLayout({ children }: { children: ReactNode }) {
  await requireRoles(ROLES.TENANT_WRITE, '/time-clock')
  return <>{children}</>
}
