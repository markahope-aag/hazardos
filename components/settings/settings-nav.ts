import {
  Building2,
  Users,
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

export interface SettingsNavItem {
  href: string
  label: string
  icon: LucideIcon
  description?: string
}

export interface SettingsNavGroup {
  label: string
  items: SettingsNavItem[]
}

// Single source of truth for the Settings sidebar. Plain module (no
// 'use client') so both the server-rendered /settings landing page and
// the client-rendered sidebar can import it without Next.js server/client
// boundary issues during prerendering.
export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    label: 'Organization',
    items: [
      { href: '/settings/company', label: 'Company Profile', icon: Building2 },
      { href: '/settings/team', label: 'Team Members', icon: Users },
      { href: '/settings/locations', label: 'Locations', icon: MapPin },
    ],
  },
  {
    label: 'Workflow',
    items: [
      { href: '/settings/pricing', label: 'Pricing', icon: DollarSign },
      { href: '/settings/billing', label: 'Billing', icon: CreditCard },
    ],
  },
  {
    label: 'Integrations',
    items: [
      { href: '/settings/integrations', label: 'Integrations', icon: Link2 },
      { href: '/settings/api', label: 'API Keys', icon: KeyRound },
      { href: '/settings/webhooks', label: 'Webhooks', icon: Webhook },
    ],
  },
  {
    label: 'Communications',
    items: [
      { href: '/settings/email', label: 'Email', icon: Mail },
      { href: '/settings/notifications', label: 'Notifications', icon: Bell },
      { href: '/settings/sms', label: 'SMS', icon: MessageSquare },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/settings/security', label: 'Security', icon: Shield },
      { href: '/settings/branding', label: 'Appearance', icon: Palette },
    ],
  },
]
