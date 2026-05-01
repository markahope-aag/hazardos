import type { ReactNode } from 'react'
import { requireTenantAdmin } from '@/lib/auth/require-roles'

// Team management is admin-only. Field staff and viewers don't need
// to see the team roster, last-login data, or pending invitations.
export default async function TeamLayout({ children }: { children: ReactNode }) {
  await requireTenantAdmin()
  return <>{children}</>
}
