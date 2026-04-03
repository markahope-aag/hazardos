'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

/**
 * Clears any existing Supabase session when an invite token is present.
 * Must wrap the signup form to ensure session is gone before form renders.
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

    const clear = async () => {
      const supabase = createClient()
      await supabase.auth.signOut({ scope: 'local' })
      setReady(true)
    }
    clear()
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
