'use client'

import { LogOut, User, Settings } from 'lucide-react'
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
import { Profile } from '@/types/database'
import { User as SupabaseUser } from '@supabase/supabase-js'

interface UserMenuProps {
  user: SupabaseUser
  profile: Profile
}

export function UserMenu({ user, profile }: UserMenuProps) {
  const router = useRouter()
  const { logout } = useLogout()

  const userInitials = profile.first_name?.charAt(0) || user.email?.charAt(0).toUpperCase() || '?'
  const userName = profile.first_name && profile.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : user.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-1 transition-colors">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {profile.first_name} {profile.last_name}
            </div>
            <div className="text-xs text-gray-500 capitalize">
              {profile.role.replace('_', ' ')}
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
            {userInitials}
          </div>
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div>
            <div className="font-medium">{userName}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}