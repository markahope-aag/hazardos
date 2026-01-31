import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function PlatformAdminPage() {
  const supabase = await createClient()

  // Get platform statistics
  const [
    { count: totalTenants },
    { count: activeTenants },
    { count: totalUsers },
    { data: recentActivity }
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Overview</h1>
        <p className="text-gray-600 mt-2">
          Monitor and manage the HazardOS platform
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTenants || 0}</div>
            <p className="text-xs text-gray-600">
              All registered organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTenants || 0}</div>
            <p className="text-xs text-gray-600">
              Organizations with active status
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers || 0}</div>
            <p className="text-xs text-gray-600">
              Active users across all tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-gray-600">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Platform Activity</CardTitle>
            <CardDescription>
              Latest actions across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common platform management tasks
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <a 
              href="/platform-admin/tenants/new" 
              className="block p-3 rounded-md border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="font-medium text-sm">Create New Tenant</div>
              <div className="text-xs text-gray-600">Add a new organization to the platform</div>
            </a>
            
            <a 
              href="/platform-admin/settings" 
              className="block p-3 rounded-md border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="font-medium text-sm">Platform Settings</div>
              <div className="text-xs text-gray-600">Configure platform-wide settings</div>
            </a>
            
            <a 
              href="/platform-admin/usage" 
              className="block p-3 rounded-md border border-gray-200 hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="font-medium text-sm">Usage Analytics</div>
              <div className="text-xs text-gray-600">View tenant usage and analytics</div>
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Platform Status */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Status</CardTitle>
          <CardDescription>
            Current platform configuration and health
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-sm font-medium text-gray-900">Database</div>
              <div className="text-sm text-green-600">✓ Connected</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Storage</div>
              <div className="text-sm text-green-600">✓ Available</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Authentication</div>
              <div className="text-sm text-green-600">✓ Active</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}