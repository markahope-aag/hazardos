'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Building2, Target, Briefcase, Kanban, ArrowLeft, MapPin } from 'lucide-react'

const crmTabs = [
  { href: '/crm/properties', label: 'Properties', icon: MapPin },
  { href: '/crm/contacts', label: 'Contacts', icon: Users },
  { href: '/crm/companies', label: 'Companies', icon: Building2 },
  { href: '/crm/opportunities', label: 'Opportunities', icon: Target },
  { href: '/crm/pipeline', label: 'Pipeline', icon: Kanban },
  { href: '/crm/jobs', label: 'Jobs', icon: Briefcase },
]

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      {/* Mode banner — the CRM is a different context than the rest of
          the app (sales pipeline, contacts, companies) and the main nav
          is hidden while you're here. The dark strip makes the mode
          shift obvious at a glance and parks the exit next to it. */}
      <div className="-mx-6 -mt-6 px-6 py-2.5 bg-slate-900 text-white">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4 text-orange-400" />
            <span className="font-semibold tracking-tight">CRM</span>
            <span className="text-slate-300 hidden sm:inline">·</span>
            <span className="text-slate-300 text-xs hidden sm:inline">
              Sales pipeline, contacts, and companies
            </span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium whitespace-nowrap px-3 py-1.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Main Menu</span>
          </Link>
        </div>
      </div>

      {/* CRM Sub-Navigation */}
      <nav className="border-b bg-white -mx-6 -mt-6 px-6" aria-label="CRM navigation">
        <div className="flex space-x-6 overflow-x-auto">
          {crmTabs.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {children}
    </div>
  )
}
