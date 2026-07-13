'use client'

import { LogoHorizontal } from '@/components/ui/logo'
import { SkipLink } from '@/components/ui/skip-link'
import { UserMenu } from '@/components/layout/user-menu'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { AuthProvider, useMultiTenantAuth } from '@/components/providers/auth-provider'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Home, FileText, Calculator, Calendar, DollarSign, LayoutGrid, Briefcase, MessageCircle, ClipboardList, FlaskConical, ShieldCheck, Settings, Menu, TrendingUp, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
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
  { href: '/lab-reports', label: 'Lab Reports', icon: FlaskConical, match: (p) => p.startsWith('/lab-reports') },
  { href: '/estimates', label: 'Estimates', icon: Calculator, match: (p) => p.startsWith('/estimates') },
  { href: '/jobs', label: 'Jobs', icon: Briefcase, match: (p) => p.startsWith('/jobs') },
  { href: '/work-orders', label: 'Work Orders', icon: ClipboardList, match: (p) => p.startsWith('/work-orders') },
  { href: '/compliance', label: 'Compliance', icon: ShieldCheck, match: (p) => p.startsWith('/compliance') },
  { href: '/invoices', label: 'Invoices', icon: DollarSign, match: (p) => p.startsWith('/invoices') },
  // Sales hub: pipeline, commissions, win/loss analytics, and the approval
  // queue. The pages already existed but had no nav entry, so commissions
  // and the sales analytics read as "unavailable / 404" in QA (CO1-6,
  // PA8-10) — this surfaces them.
  { href: '/sales', label: 'Sales', icon: TrendingUp, match: (p) => p.startsWith('/sales') },
  { href: '/calendar', label: 'Calendar', icon: Calendar, match: (p) => p.startsWith('/calendar') },
  // Feedback hub: survey responses, NPS/satisfaction scores, and the
  // testimonial approval queue. The public survey + all the backing APIs
  // existed, but there was no office-facing page to read results or manage
  // testimonials (FB7, FB9) — this surfaces them.
  { href: '/feedback', label: 'Feedback', icon: MessageCircle, match: (p) => p.startsWith('/feedback') },
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    if (!loading && user && profile && !profile.organization_id && !profile.is_platform_user) {
      router.push('/onboard')
    }
  }, [user, profile, loading, router])

  // Auto-close the mobile drawer on route change so it doesn't linger
  // open over the new page.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname])

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
      {/* Header + main nav ride along on scroll. The CRM has its own
          chrome and re-implements sticky behavior in its own layout, so
          we only stick the main nav when we're outside /crm. */}
      <div className="sticky top-0 z-40">
        <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container flex h-14 items-center justify-between gap-2">
            <div className="flex items-center space-x-3 sm:space-x-6 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden -ml-2"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </Button>

              <Link className="flex items-center space-x-2 flex-shrink-0" href="/">
                <LogoHorizontal size="md" />
              </Link>

              {organization && (
                <>
                  <div className="hidden sm:block h-6 w-px bg-gray-300" />
                  <div className="hidden sm:block min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{organization.name}</div>
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

              <Button
                asChild
                variant="ghost"
                size="sm"
                className={pathname.startsWith('/messages') ? 'text-primary' : ''}
                aria-label="Messages"
              >
                <Link href="/messages">
                  <MessageCircle className="w-5 h-5" />
                </Link>
              </Button>

              <NotificationBell />

              <Button
                asChild
                variant="ghost"
                size="sm"
                className={pathname.startsWith('/settings') ? 'text-primary' : ''}
                aria-label="Settings"
              >
                <Link href="/settings">
                  <Settings className="w-5 h-5" />
                </Link>
              </Button>

              <UserMenu user={user} profile={profile} />
            </div>
          </div>
        </header>

        {/* Desktop nav strip — hidden on mobile (use hamburger) and on
            CRM pages (which have their own chrome). */}
        {!pathname.startsWith('/crm') && (
          <nav className="hidden lg:block border-b bg-white" aria-label="Main navigation">
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
      </div>

      {/* Mobile nav drawer — slides in from the left when the hamburger
          is tapped. Closes itself on route change via effect above. */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          <div className="flex items-center px-4 py-4 border-b">
            <SheetTitle>
              <LogoHorizontal size="md" />
            </SheetTitle>
          </div>
          {organization && (
            <div className="px-4 py-3 border-b">
              <div className="text-sm font-medium text-gray-900 truncate">{organization.name}</div>
              <div className="text-xs text-gray-500 capitalize">{organization.subscription_tier}</div>
            </div>
          )}
          <nav className="px-2 py-2 space-y-1" aria-label="Main navigation">
            {MAIN_NAV_ITEMS.map((item) => {
              const isActive = item.match(pathname)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <main id="main-content" className="container py-6">
        {children}
      </main>
    </div>
  )
}