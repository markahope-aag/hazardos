import type { ReactNode } from 'react'
import { SettingsSidebar } from '@/components/settings/settings-sidebar'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization, team, and integrations.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <SettingsSidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
