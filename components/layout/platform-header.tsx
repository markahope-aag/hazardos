'use client'

import { LogoHorizontal } from '@/components/ui/logo'
import { PlatformUserMenu } from './platform-user-menu'

interface PlatformHeaderProps {
  userEmail: string
  userRole: string
}

export function PlatformHeader({ userEmail, userRole }: PlatformHeaderProps) {
  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <LogoHorizontal size="md" />
          <div className="h-6 w-px bg-gray-300" />
          <h1 className="text-lg font-semibold text-gray-900">Platform Admin</h1>
        </div>
        <PlatformUserMenu userEmail={userEmail} userRole={userRole} />
      </div>
    </header>
  )
}