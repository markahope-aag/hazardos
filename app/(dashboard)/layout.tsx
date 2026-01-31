'use client'

import { LogoHorizontal } from '@/components/ui/logo'
import { UserMenu } from '@/components/layout/user-menu'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Home, FileText, Calculator, Calendar, Settings, Users } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, organization, loading, canAccessPlatformAdmin } = useMultiTenantAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LogoHorizontal size="lg" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-6">
            <a className="flex items-center space-x-2" href="/dashboard">
              <LogoHorizontal size="md" />
            </a>
            
            {organization && (
              <>
                <div className="h-6 w-px bg-gray-300" />
                <div>
                  <div className="text-sm font-medium text-gray-900">{organization.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{organization.subscription_tier}</div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {canAccessPlatformAdmin && (
              <a 
                href="/platform-admin" 
                className="text-sm font-medium text-gray-600 hover:text-primary"
              >
                Platform Admin
              </a>
            )}
            
            <UserMenu user={user} profile={profile} />
          </div>
        </div>
      </header>
      
      {/* Navigation */}
      <nav className="border-b bg-white">
        <div className="container">
          <div className="flex space-x-8 overflow-x-auto">
            <Link
              href="/dashboard"
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                pathname === '/dashboard'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            
            <Link
              href="/customers"
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                pathname.startsWith('/customers')
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Customers</span>
            </Link>
            
            <Link
              href="/site-surveys"
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                pathname.startsWith('/site-surveys')
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>Site Surveys</span>
            </Link>
            
            <Link
              href="/estimates"
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                pathname.startsWith('/estimates')
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calculator className="h-4 w-4" />
              <span>Estimates</span>
            </Link>
            
            <Link
              href="/schedules"
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                pathname.startsWith('/schedules')
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Schedules</span>
            </Link>
            
            <Link
              href="/settings"
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                pathname.startsWith('/settings')
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="container py-6">
        {children}
      </main>
    </div>
  )
}