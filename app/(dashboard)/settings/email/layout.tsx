import type { ReactNode } from 'react'
import { requireTenantAdmin } from '@/lib/auth/require-roles'

// Email config (sender domain, DKIM, reply-to) is admin-only.
export default async function EmailLayout({ children }: { children: ReactNode }) {
  await requireTenantAdmin()
  return <>{children}</>
}
