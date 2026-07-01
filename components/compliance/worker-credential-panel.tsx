'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck } from 'lucide-react'
import { useCredentials } from '@/lib/hooks/use-credentials'
import { CredentialStatusBadge } from './credential-status-badge'

interface WorkerCredentialPanelProps {
  workerId: string
  title?: string
}

/** Reusable per-worker credential list — drop onto a worker/crew detail view. */
export function WorkerCredentialPanel({ workerId, title = 'Credentials' }: WorkerCredentialPanelProps) {
  const { data: credentials, isLoading } = useCredentials({ worker_id: workerId })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !credentials || credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground">No credentials on file.</p>
        ) : (
          <ul className="divide-y">
            {credentials.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.credential_type_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.identifier ? `#${c.identifier} · ` : ''}
                    {c.expiry_date ? `Expires ${c.expiry_date}` : 'No expiry'}
                  </p>
                </div>
                <CredentialStatusBadge status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
