import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function TenantsPage() {
  const supabase = await createClient()

  // Get all organizations with user counts
  const { data: organizations } = await supabase
    .from('organizations')
    .select(`
      *,
      profiles!inner(count)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tenant Management</h1>
          <p className="text-gray-600">
            Manage organizations and their subscriptions
          </p>
        </div>
        <Button>
          <a href="/platform-admin/tenants/new">Add New Tenant</a>
        </Button>
      </div>

      <div className="grid gap-6">
        {organizations && organizations.length > 0 ? (
          organizations.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{org.name}</CardTitle>
                    <CardDescription>
                      {org.email} • {org.city}, {org.state}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      org.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : org.status === 'trial'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {org.status}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">Subscription</div>
                    <div className="text-sm text-gray-600 capitalize">{org.subscription_tier}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Users</div>
                    <div className="text-sm text-gray-600">0 / {org.max_users}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Monthly Assessments</div>
                    <div className="text-sm text-gray-600">0 / {org.max_assessments_per_month}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">Created</div>
                    <div className="text-sm text-gray-600">
                      {new Date(org.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                {org.trial_ends_at && (
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="text-sm text-yellow-800">
                      <strong>Trial ends:</strong> {new Date(org.trial_ends_at).toLocaleDateString()}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    Manage Users
                  </Button>
                  <Button variant="outline" size="sm">
                    Usage Stats
                  </Button>
                  {org.status === 'active' ? (
                    <Button variant="destructive" size="sm">
                      Suspend
                    </Button>
                  ) : (
                    <Button variant="default" size="sm">
                      Activate
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">No tenants found</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}