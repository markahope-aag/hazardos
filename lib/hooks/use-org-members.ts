import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from './use-multi-tenant-auth'

export interface OrgMember {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
}

// Active members of the current organization, for assignee/owner dropdowns.
export function useOrgMembers() {
  const { organization } = useMultiTenantAuth()

  return useQuery({
    queryKey: ['org-members', organization?.id],
    queryFn: async (): Promise<OrgMember[]> => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('organization_id', organization!.id)
        .eq('is_active', true)
        .order('first_name')

      if (error) {
        throw new Error(`Failed to fetch organization members: ${error.message}`)
      }

      return data || []
    },
    enabled: !!organization?.id,
    staleTime: 5 * 60 * 1000,
  })
}
