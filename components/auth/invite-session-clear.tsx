'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

/**
 * Clears any existing Supabase session when an invite token is present.
 * Nukes localStorage and cookies so the signup form renders clean.
 */
export function InviteSessionClear({
  hasInvite,
  children,
}: {
  hasInvite: boolean
  children: React.ReactNode
}) {
  const [ready, setReady] = useState(!hasInvite)

  useEffect(() => {
    if (!hasInvite) return

    // Clear ALL Supabase keys from localStorage
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => {
      console.log('[InviteSessionClear] removing localStorage key:', key)
      localStorage.removeItem(key)
    })

    // Clear Supabase cookies
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim()
      if (name.startsWith('sb-')) {
        console.log('[InviteSessionClear] removing cookie:', name)
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })

    console.log('[InviteSessionClear] session cleared, rendering signup form')
    setReady(true)
  }, [hasInvite])

  if (!ready) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <>{children}</>
}
