import type { ReactNode } from 'react'
import { requireTenantAdmin } from '@/lib/auth/require-roles'

// Credentials (integration secrets, QuickBooks tokens, uploaded files) are
// admin-only. Without this gate a non-admin could load /settings/credentials
// directly — every other admin settings folder has an equivalent layout gate.
export default async function CredentialsLayout({ children }: { children: ReactNode }) {
  await requireTenantAdmin()
  return <>{children}</>
}
