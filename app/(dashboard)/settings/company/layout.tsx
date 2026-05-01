import type { ReactNode } from 'react'
import { requireTenantAdmin } from '@/lib/auth/require-roles'

// Company profile is admin-only — non-admins shouldn't change the
// org's address, license number, or business hours.
export default async function CompanyLayout({ children }: { children: ReactNode }) {
  await requireTenantAdmin()
  return <>{children}</>
}
