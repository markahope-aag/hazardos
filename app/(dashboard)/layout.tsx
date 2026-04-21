'use client'

import { LogoHorizontal } from '@/components/ui/logo'
import { SkipLink } from '@/components/ui/skip-link'
import { UserMenu } from '@/components/layout/user-menu'
import { AuthProvider, useMultiTenantAuth } from '@/components/providers/auth-provider'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Home, FileText, Calculator, Calendar, Settings, DollarSign, LayoutGrid, Briefcase, MessageCircle, ClipboardList, type LucideIcon } from 'lucide-react'
import LoginForm from '@/components/auth/login-form'

// Single source of truth for main-nav order, labels, and active-matching.
// Order here IS the display order — rearrange this array to reorder nav.
interface MainNavItem {
  href: string
  label: string
  icon: LucideIcon
  match: (pathname: string) => boolean
}

const MAIN_NAV_ITEMS: MainNavItem[] = [
  { href: '/', label: 'Dashboard', icon: Home, match: (p) => p === '/' },
  { href: '/crm', label: 'CRM', icon: LayoutGrid, match: (p) => p.startsWith('/crm') },
  { href: '/site-surveys', label: 'Surveys', icon: FileText, match: (p) => p.startsWith('/site-surveys') },
  { href: '/estimates', label: 'Estimates', icon: Calculator, match: (p) => p.startsWith('/estimates') },
  { href: '/jobs', label: 'Jobs', icon: Briefcase, match: (p) => p.startsWith('/jobs') },
  { href: '/manifests', label: 'Manifests', icon: ClipboardList, match: (p) => p.startsWith('/manifests') },
  { href: '/invoices', label: 'Invoices', icon: DollarSign, match: (p) => p.startsWith('/invoices') },
  { href: '/calendar', label: 'Calendar', icon: Calendar, match: (p) => p.startsWith('/calendar') },
  { href: '/messages', label: 'Messaging', icon: MessageCircle, match: (p) => p.startsWith('/messages') },
  { href: '/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') },
]

function InlineLogin() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-gray-50">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <LogoHorizontal size="lg" />
            </div>
            <p className="text-gray-600 text-sm">
              Environmental Remediation Management
            </p>
          </div>
          <div className="space-y-6">
            <div className="space-y-2 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-gray-600">
                Enter your email to sign in to your account
              </p>
            </div>
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  )
}

function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, organization, loading, canAccessPlatformAdmin } = useMultiTenantAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && user && profile && !profile.organization_id && !profile.is_platform_user) {
      router.push('/onboard')
    }
  }, [user, profile, loading, router])

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

  if (!user) {
    // Render login inline instead of redirecting to avoid routing issues
    return <InlineLogin />
  }

  // Allow rendering even without profile/org - will redirect via useEffect
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LogoHorizontal size="lg" />
          <p className="mt-4 text-gray-600">Setting up your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SkipLink />
      <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link className="flex items-center space-x-2" href="/">
              <LogoHorizontal size="md" />
            </Link>
            
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
      
      {/* Navigation - hidden when inside CRM */}
      {!pathname.startsWith('/crm') && (
      <nav className="border-b bg-white" aria-label="Main navigation">
        <div className="container">
          <div className="flex space-x-8 overflow-x-auto">
            {MAIN_NAV_ITEMS.map((item) => {
              const isActive = item.match(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 text-sm font-medium whitespace-nowrap ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
      )}

      <main id="main-content" className="container py-6">
        {children}
      </main>
    </div>
  )
}