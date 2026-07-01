import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type Status = 'valid' | 'expiring_soon' | 'expired' | 'no_expiry' | 'missing'

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  valid: { label: 'Valid', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  expiring_soon: { label: 'Expiring soon', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  expired: { label: 'Expired', className: 'bg-red-100 text-red-700 border-red-200' },
  no_expiry: { label: 'No expiry', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  missing: { label: 'Missing', className: 'bg-red-100 text-red-700 border-red-200' },
}

export function CredentialStatusBadge({ status }: { status: Status }) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.no_expiry
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}

const READINESS_CONFIG: Record<'ready' | 'warning' | 'blocked', { label: string; className: string }> = {
  ready: { label: 'Crew ready', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  warning: { label: 'Expiring credentials', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  blocked: { label: 'Credential gaps', className: 'bg-red-100 text-red-700 border-red-200' },
}

export function CrewReadinessBadge({ readiness }: { readiness: 'ready' | 'warning' | 'blocked' }) {
  const config = READINESS_CONFIG[readiness]
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}
