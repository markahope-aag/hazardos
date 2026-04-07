/**
 * Role constants and presets for consistent access control.
 *
 * Hierarchy: platform_owner > platform_admin > tenant_owner > admin > estimator > technician > viewer
 *
 * Usage in API routes:
 *   import { ROLES } from '@/lib/auth/roles'
 *   allowedRoles: ROLES.TENANT_ADMIN
 */

// Individual role values
export const ROLE = {
  PLATFORM_OWNER: 'platform_owner',
  PLATFORM_ADMIN: 'platform_admin',
  TENANT_OWNER: 'tenant_owner',
  ADMIN: 'admin',
  ESTIMATOR: 'estimator',
  TECHNICIAN: 'technician',
  VIEWER: 'viewer',
} as const

export type UserRole = (typeof ROLE)[keyof typeof ROLE]

// Preset role groups for allowedRoles
export const ROLES = {
  /** Platform-level operations only (cross-org data, platform config) */
  PLATFORM_ONLY: [ROLE.PLATFORM_OWNER, ROLE.PLATFORM_ADMIN] as string[],

  /** Tenant admin operations (settings, team, billing, delete) */
  TENANT_ADMIN: [ROLE.PLATFORM_OWNER, ROLE.PLATFORM_ADMIN, ROLE.TENANT_OWNER, ROLE.ADMIN] as string[],

  /** Tenant management (settings, invitations, approvals) — owner + admin */
  TENANT_MANAGE: [ROLE.PLATFORM_OWNER, ROLE.PLATFORM_ADMIN, ROLE.TENANT_OWNER, ROLE.ADMIN] as string[],

  /** Content creation (estimates, proposals, jobs) */
  TENANT_WRITE: [ROLE.PLATFORM_OWNER, ROLE.PLATFORM_ADMIN, ROLE.TENANT_OWNER, ROLE.ADMIN, ROLE.ESTIMATOR] as string[],

  /** Field work (time entries, photos, checklists) */
  TENANT_FIELD: [ROLE.PLATFORM_OWNER, ROLE.PLATFORM_ADMIN, ROLE.TENANT_OWNER, ROLE.ADMIN, ROLE.ESTIMATOR, ROLE.TECHNICIAN] as string[],

  /** Read-only access (all authenticated users) */
  TENANT_READ: [ROLE.PLATFORM_OWNER, ROLE.PLATFORM_ADMIN, ROLE.TENANT_OWNER, ROLE.ADMIN, ROLE.ESTIMATOR, ROLE.TECHNICIAN, ROLE.VIEWER] as string[],
} as const
