import type { ReactNode } from 'react'
import { requireTenantAdmin } from '@/lib/auth/require-roles'

// Pricing exposes labor rates, margins, and disposal costs — strictly
// admin/tenant_owner only. Field staff don't need to see margin data.
export default async function PricingLayout({ children }: { children: ReactNode }) {
  await requireTenantAdmin()
  return <>{children}</>
}
