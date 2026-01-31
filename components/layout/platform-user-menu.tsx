'use client'

import { LogOut, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLogout } from '@/lib/hooks/use-logout'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PlatformUserMenuProps {
  userEmail: string
  userRole: string
}

export function PlatformUserMenu({ userEmail, userRole }: PlatformUserMenuProps) {
  const router = useRouter()
  const { logout } = useLogout()

  const userInitials = userEmail?.charAt(0).toUpperCase() || '?'
  const roleDisplay = userRole === 'platform_owner' ? 'Platform Owner' : 'Platform Admin'

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={() => router.push('/dashboard')}
        className="flex items-center space-x-1 text-sm text-gray-600 hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-1 transition-colors">
            <span className="text-sm text-gray-600">{roleDisplay}</span>
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
              {userInitials}
            </div>
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div>
              <div className="font-medium">{roleDisplay}</div>
              <div className="text-sm text-gray-500">{userEmail}</div>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}