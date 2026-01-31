import { Badge } from '@/components/ui/badge'
import type { CustomerStatus } from '@/types/database'

interface CustomerStatusBadgeProps {
  status: CustomerStatus
  className?: string
}

export default function CustomerStatusBadge({ status, className }: CustomerStatusBadgeProps) {
  const getStatusConfig = (status: CustomerStatus) => {
    switch (status) {
      case 'lead':
        return {
          label: 'Lead',
          variant: 'default' as const,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
        }
      case 'prospect':
        return {
          label: 'Prospect',
          variant: 'secondary' as const,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
        }
      case 'customer':
        return {
          label: 'Customer',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        }
      case 'inactive':
        return {
          label: 'Inactive',
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-600 hover:bg-gray-100'
        }
      default:
        return {
          label: status,
          variant: 'outline' as const,
          className: 'bg-gray-100 text-gray-600'
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge 
      variant={config.variant}
      className={`${config.className} ${className || ''}`}
    >
      {config.label}
    </Badge>
  )
}