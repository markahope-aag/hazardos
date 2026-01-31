import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Filter, X } from 'lucide-react'
import { CUSTOMER_STATUS_OPTIONS, CUSTOMER_SOURCE_OPTIONS } from '@/lib/validations/customer'
import type { CustomerStatus, CustomerSource } from '@/types/database'

interface CustomerFiltersProps {
  status: CustomerStatus | 'all'
  source: CustomerSource | 'all'
  onStatusChange: (status: CustomerStatus | 'all') => void
  onSourceChange: (source: CustomerSource | 'all') => void
  onClearFilters: () => void
  className?: string
}

export default function CustomerFilters({
  status,
  source,
  onStatusChange,
  onSourceChange,
  onClearFilters,
  className
}: CustomerFiltersProps) {
  const hasActiveFilters = status !== 'all' || source !== 'all'

  const getStatusLabel = (status: CustomerStatus | 'all') => {
    if (status === 'all') return 'All Statuses'
    return CUSTOMER_STATUS_OPTIONS.find(opt => opt.value === status)?.label || status
  }

  const getSourceLabel = (source: CustomerSource | 'all') => {
    if (source === 'all') return 'All Sources'
    return CUSTOMER_SOURCE_OPTIONS.find(opt => opt.value === source)?.label || source
  }

  return (
    <div className={`flex items-center gap-3 ${className || ''}`}>
      {/* Status Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            {getStatusLabel(status)}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onStatusChange('all')}>
            All Statuses
          </DropdownMenuItem>
          {CUSTOMER_STATUS_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onStatusChange(option.value)}
            >
              <div>
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-500">{option.description}</div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Source Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            {getSourceLabel(source)}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuLabel>Filter by Source</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onSourceChange('all')}>
            All Sources
          </DropdownMenuItem>
          {CUSTOMER_SOURCE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onSourceChange(option.value)}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2">
          {status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {getStatusLabel(status)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStatusChange('all')}
                className="h-auto p-0 text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {source !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Source: {getSourceLabel(source)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSourceChange('all')}
                className="h-auto p-0 text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            Clear all
          </Button>
        </div>
      )}
    </div>
  )
}