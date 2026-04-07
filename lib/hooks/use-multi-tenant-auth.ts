'use client'

// Auth state is now managed by AuthProvider context.
// This file re-exports for backward compatibility with existing imports.
export { useMultiTenantAuth } from '@/components/providers/auth-provider'

import { useMultiTenantAuth } from '@/components/providers/auth-provider'

// Helper function to check if user has specific permission
export function usePermissions() {
  const auth = useMultiTenantAuth()

  const hasRole = (roles: string | string[]) => {
    if (!auth.profile) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(auth.profile.role)
  }

  const canManageTenant = () => hasRole(['platform_owner', 'platform_admin', 'tenant_owner', 'admin'])
  const canCreateAssessments = () => hasRole(['platform_owner', 'platform_admin', 'tenant_owner', 'admin', 'estimator'])
  const canViewReports = () => hasRole(['platform_owner', 'platform_admin', 'tenant_owner', 'admin', 'estimator', 'technician'])
  const isPlatformOwner = () => hasRole('platform_owner')

  return { hasRole, canManageTenant, canCreateAssessments, canViewReports, isPlatformOwner, ...auth }
}
