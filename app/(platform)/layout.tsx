import { PlatformHeader } from '@/components/layout/platform-header'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Check if user is authenticated and has platform access
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_platform_user')
    .eq('id', user.id)
    .single()

  if (!profile?.is_platform_user || !['platform_owner', 'platform_admin'].includes(profile.role)) {
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PlatformHeader userEmail={user.email || ''} userRole={profile.role} />

      <div className="container py-8">
        <nav className="mb-8">
          <div className="flex space-x-8">
            <a href="/platform-admin" className="text-sm font-medium text-gray-900 hover:text-primary">
              Overview
            </a>
            <a href="/platform-admin/tenants" className="text-sm font-medium text-gray-600 hover:text-primary">
              Tenants
            </a>
            <a href="/platform-admin/usage" className="text-sm font-medium text-gray-600 hover:text-primary">
              Usage Analytics
            </a>
            <a href="/platform-admin/settings" className="text-sm font-medium text-gray-600 hover:text-primary">
              Platform Settings
            </a>
            <a href="/platform-admin/audit" className="text-sm font-medium text-gray-600 hover:text-primary">
              Audit Logs
            </a>
          </div>
        </nav>

        {children}
      </div>
    </div>
  )
}