import type { ReactNode } from 'react'
import { requireTenantAdmin } from '@/lib/auth/require-roles'

// SMS settings (numbers, opt-out language, quiet hours) are admin-only.
export default async function SmsLayout({ children }: { children: ReactNode }) {
  await requireTenantAdmin()
  return <>{children}</>
}
