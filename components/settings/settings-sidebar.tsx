'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
  Shield,
  Palette,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  description?: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

// Single source of truth for the Settings sidebar. Add new pages by
// appending to the appropriate group — no other component needs to
// change. Order within each group IS the display order.
export const SETTINGS_NAV: NavGroup[] = [
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

function isActive(pathname: string, href: string): boolean {
  // Exact match first — so /settings doesn't collapse into every item.
  if (pathname === href) return true
  // Otherwise match as a prefix segment (/settings/team/new stays on Team).
  return pathname.startsWith(href + '/')
}

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Settings sections"
      className="w-full lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-20 lg:self-start"
    >
      <div className="space-y-6">
        {SETTINGS_NAV.map((group) => (
          <div key={group.label}>
            <div className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                        active
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  )
}
