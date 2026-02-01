import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PlatformAdminService } from '@/lib/services/platform-admin-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OrganizationsTableClient } from '@/components/platform/organizations-table-client'

export default async function PlatformOrganizationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isAdmin = await PlatformAdminService.isPlatformAdmin()
  if (!isAdmin) redirect('/dashboard')

  // Initial data load
  const initialData = await PlatformAdminService.getOrganizations({
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'desc',
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-muted-foreground">
            View and manage all customer organizations
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          Platform Admin
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Organizations</CardTitle>
          <CardDescription>
            {initialData.total} total organizations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationsTableClient
            initialData={initialData.data}
            initialTotal={initialData.total}
            initialTotalPages={initialData.totalPages}
          />
        </CardContent>
      </Card>
    </div>
  )
}
