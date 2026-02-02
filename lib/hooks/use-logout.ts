'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

export function useLogout() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        toast({
          title: 'Error signing out',
          description: error.message,
          variant: 'destructive',
        })
        return false
      } else {
        toast({
          title: 'Signed out successfully',
          description: 'You have been logged out.',
        })
        router.push('/login')
        router.refresh()
        return true
      }
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while signing out.',
        variant: 'destructive',
      })
      return false
    }
  }

  return { logout }
}