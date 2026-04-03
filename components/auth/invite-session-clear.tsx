'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

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

    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))

    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim()
      if (name.startsWith('sb-')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
      }
    })

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
