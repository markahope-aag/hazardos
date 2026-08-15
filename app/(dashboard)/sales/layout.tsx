import type { ReactNode } from 'react'
import { requireRoles } from '@/lib/auth/require-roles'
import { ROLES } from '@/lib/auth/roles'

// Money is hidden from the field crew (client call, 2026-07-28). The nav
// already omitted this section for technicians, but the route itself was
// reachable by typing the URL, so the gate has to live here too.
export default async function FinancialLayout({ children }: { children: ReactNode }) {
  await requireRoles(ROLES.FINANCIAL_VIEW, '/')
  return <>{children}</>
}
