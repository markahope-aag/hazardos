'use client'

import { Building } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useLocations } from '@/lib/hooks/use-locations'

// Reusable location filter for any list view that wants to scope its
// results by office. Renders a single Select with "All locations",
// each location, and "Unassigned" so records without a location_id
// can still be triaged. Hides itself when the org has fewer than two
// locations — single-office orgs don't need the filter.
//
// `value`:
//   'all'         → don't filter
//   'unassigned'  → match records where location_id IS NULL
//   <uuid>        → match that specific location
export type LocationFilterValue = 'all' | 'unassigned' | string

interface Props {
  value: LocationFilterValue
  onChange: (value: LocationFilterValue) => void
  className?: string
  /** Hide the trigger entirely when there's only one location. */
  hideWhenSingle?: boolean
}

export function LocationFilter({
  value,
  onChange,
  className,
  hideWhenSingle = true,
}: Props) {
  const { data: locations = [], isLoading } = useLocations()

  if (isLoading) return null
  if (hideWhenSingle && locations.length < 2) return null

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className || 'w-[170px]'}>
        <Building className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
        <SelectValue placeholder="Location" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All locations</SelectItem>
        {locations.map((loc) => (
          <SelectItem key={loc.id} value={loc.id}>
            {loc.name}
            {loc.is_headquarters ? ' (HQ)' : ''}
          </SelectItem>
        ))}
        <SelectItem value="unassigned">Unassigned</SelectItem>
      </SelectContent>
    </Select>
  )
}
