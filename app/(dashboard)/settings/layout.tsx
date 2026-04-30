import type { ReactNode } from 'react'
import { SettingsSidebar } from '@/components/settings/settings-sidebar'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let hiddenHrefs: string[] = []
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (profile?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('billing_managed_externally')
        .eq('id', profile.organization_id)
        .single()

      if (org?.billing_managed_externally) {
        hiddenHrefs = ['/settings/billing']
      }
    }
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization, team, and integrations.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <SettingsSidebar hiddenHrefs={hiddenHrefs} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
