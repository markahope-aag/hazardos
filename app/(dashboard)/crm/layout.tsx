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
      {/* CRM Sub-Navigation */}
      <nav className="border-b bg-white -mx-6 -mt-6 px-6" aria-label="CRM navigation">
        <div className="flex items-center justify-between">
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
          <Link
            href="/"
            className="flex items-center space-x-2 text-sm font-medium whitespace-nowrap ml-4 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Main Menu</span>
          </Link>
        </div>
      </nav>

      {children}
    </div>
  )
}
