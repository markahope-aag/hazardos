'use client'

import { LogoHorizontal } from '@/components/ui/logo'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, profile, organization, loading, canAccessPlatformAdmin } = useMultiTenantAuth()
  const router = useRouter()

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
            
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {profile.first_name} {profile.last_name}
                </div>
                <div className="text-xs text-gray-500 capitalize">
                  {profile.role.replace('_', ' ')}
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                {profile.first_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="container py-6">
        {children}
      </main>
    </div>
  )
}