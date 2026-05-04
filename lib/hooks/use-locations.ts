import { useQuery } from '@tanstack/react-query'
import type { Location } from '@/types/integrations'

interface LocationsResponse {
  locations: Location[]
}

// Lists the caller's org locations. Cached for 5 minutes since
// locations rarely change during a session.
export function useLocations() {
  return useQuery({
    queryKey: ['locations', 'list'],
    queryFn: async (): Promise<Location[]> => {
      const res = await fetch('/api/locations')
      if (!res.ok) throw new Error('Failed to load locations')
      const data: LocationsResponse = await res.json()
      return data.locations
    },
    staleTime: 5 * 60 * 1000,
  })
}
