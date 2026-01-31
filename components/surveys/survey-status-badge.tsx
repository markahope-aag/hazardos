import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  PlayCircle,
  CheckCircle,
  ClipboardCheck,
  XCircle,
  FileText,
  Clock
} from 'lucide-react'

export type SurveyStatus =
  | 'draft'
  | 'scheduled'
  | 'in_progress'
  | 'submitted'
  | 'reviewed'
  | 'estimated'
  | 'quoted'
  | 'completed'
  | 'cancelled'

const statusConfig: Record<SurveyStatus, {
  label: string
  className: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
    icon: FileText,
  },
  scheduled: {
    label: 'Scheduled',
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    icon: Calendar,
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100',
    icon: PlayCircle,
  },
  submitted: {
    label: 'Submitted',
    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
    icon: CheckCircle,
  },
  reviewed: {
    label: 'Reviewed',
    className: 'bg-green-100 text-green-700 hover:bg-green-100',
    icon: ClipboardCheck,
  },
  estimated: {
    label: 'Estimated',
    className: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
    icon: FileText,
  },
  quoted: {
    label: 'Quoted',
    className: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
    icon: FileText,
  },
  completed: {
    label: 'Completed',
    className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-100 text-red-700 hover:bg-red-100',
    icon: XCircle,
  },
}

interface SurveyStatusBadgeProps {
  status: string
  showIcon?: boolean
  className?: string
}

export function SurveyStatusBadge({
  status,
  showIcon = true,
  className
}: SurveyStatusBadgeProps) {
  const config = statusConfig[status as SurveyStatus] || {
    label: status,
    className: 'bg-gray-100 text-gray-700',
    icon: Clock,
  }

  const Icon = config.icon

  return (
    <Badge
      variant="outline"
      className={`${config.className} gap-1 ${className || ''}`}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  )
}

export function HazardTypeBadge({
  hazardType,
  className
}: {
  hazardType: string
  className?: string
}) {
  const hazardConfig: Record<string, { label: string; className: string }> = {
    asbestos: {
      label: 'Asbestos',
      className: 'bg-red-100 text-red-700 hover:bg-red-100',
    },
    mold: {
      label: 'Mold',
      className: 'bg-green-100 text-green-700 hover:bg-green-100',
    },
    lead: {
      label: 'Lead',
      className: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
    },
    vermiculite: {
      label: 'Vermiculite',
      className: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
    },
    other: {
      label: 'Other',
      className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
    },
  }

  const config = hazardConfig[hazardType] || hazardConfig.other

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${className || ''}`}
    >
      {config.label}
    </Badge>
  )
}
