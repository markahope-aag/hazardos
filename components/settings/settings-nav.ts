import {
  Building2,
  Users,
  ShieldCheck,
  MapPin,
  DollarSign,
  CreditCard,
  Link2,
  KeyRound,
  Webhook,
  Bell,
  MessageSquare,
  Mail,
  Shield,
  Palette,
  type LucideIcon,
} from 'lucide-react'
import { ROLES } from '@/lib/auth/roles'

export interface SettingsNavItem {
  href: string
  label: string
  icon: LucideIcon
  description?: string
  /**
   * Roles that should see this item. Omit (or pass `undefined`) for
   * "everyone" — used for personal settings like Security and
   * Notifications that apply to any signed-in user.
   */
  requiredRoles?: readonly string[]
}

export interface SettingsNavGroup {
  label: string
  items: SettingsNavItem[]
}

const ADMIN_ONLY = ROLES.TENANT_ADMIN

// Single source of truth for the Settings sidebar. Plain module (no
// 'use client') so both the server-rendered /settings landing page and
// the client-rendered sidebar can import it without Next.js server/client
// boundary issues during prerendering.
export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    label: 'Organization',
    items: [
      { href: '/settings/company', label: 'Company Profile', icon: Building2, requiredRoles: ADMIN_ONLY },
      { href: '/settings/team', label: 'Team Members', icon: Users, requiredRoles: ADMIN_ONLY },
      { href: '/settings/roles', label: 'Roles', icon: ShieldCheck, requiredRoles: ADMIN_ONLY },
      { href: '/settings/locations', label: 'Locations', icon: MapPin, requiredRoles: ADMIN_ONLY },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { href: '/settings/pricing', label: 'Pricing', icon: DollarSign, requiredRoles: ADMIN_ONLY },
      { href: '/settings/billing', label: 'Billing', icon: CreditCard, requiredRoles: ADMIN_ONLY },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { href: '/settings/integrations', label: 'Integrations', icon: Link2, requiredRoles: ADMIN_ONLY },
      { href: '/settings/api', label: 'API Keys', icon: KeyRound, requiredRoles: ADMIN_ONLY },
      { href: '/settings/webhooks', label: 'Webhooks', icon: Webhook, requiredRoles: ADMIN_ONLY },
    ],
  },
  {
    label: 'Communications',
    items: [
      { href: '/settings/email', label: 'Email', icon: Mail, requiredRoles: ADMIN_ONLY },
      // Notifications cover personal preferences — everyone gets this.
      { href: '/settings/notifications', label: 'Notifications', icon: Bell },
      { href: '/settings/sms', label: 'SMS', icon: MessageSquare, requiredRoles: ADMIN_ONLY },
    ],
  },
  {
    label: 'Account',
    items: [
      // Security covers the user's own password / 2FA — visible to all.
      { href: '/settings/security', label: 'Security', icon: Shield },
      { href: '/settings/branding', label: 'Appearance', icon: Palette, requiredRoles: ADMIN_ONLY },
    ],
  },
]
