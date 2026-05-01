'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { SETTINGS_NAV } from './settings-nav'

// Re-exported so existing imports from './settings-sidebar' keep working.
// The array itself lives in settings-nav.ts (a plain module) so server
// components can import it without touching this 'use client' boundary.
export { SETTINGS_NAV } from './settings-nav'

interface SettingsSidebarProps {
  hiddenHrefs?: readonly string[]
  userRole?: string | null
}

function isActive(pathname: string, href: string): boolean {
  // Exact match first — so /settings doesn't collapse into every item.
  if (pathname === href) return true
  // Otherwise match as a prefix segment (/settings/team/new stays on Team).
  return pathname.startsWith(href + '/')
}

export function SettingsSidebar({ hiddenHrefs, userRole }: SettingsSidebarProps = {}) {
  const pathname = usePathname()

  const filteredNav = useMemo(() => {
    const hidden = new Set(hiddenHrefs || [])
    return SETTINGS_NAV.map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (hidden.has(item.href)) return false
        if (!item.requiredRoles) return true
        if (!userRole) return false
        return item.requiredRoles.includes(userRole)
      }),
    })).filter((group) => group.items.length > 0)
  }, [hiddenHrefs, userRole])

  return (
    <nav
      aria-label="Settings sections"
      className="w-full lg:w-64 lg:flex-shrink-0 lg:sticky lg:top-20 lg:self-start"
    >
      <div className="space-y-6">
        {filteredNav.map((group) => (
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
