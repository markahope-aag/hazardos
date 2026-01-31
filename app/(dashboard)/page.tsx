'use client'

import Link from 'next/link'
import { Plus, FileText, Calculator, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'

export default function DashboardPage() {
  const { profile, organization, canAccessPlatformAdmin } = useMultiTenantAuth()
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {canAccessPlatformAdmin ? 'Platform Dashboard' : 'Dashboard'}
        </h1>
        <p className="text-gray-600">
          {organization 
            ? `Welcome to ${organization.name} - Your Environmental Remediation Command Center`
            : 'Welcome to HazardOS - Your Environmental Remediation Command Center'
          }
        </p>
        {profile?.role === 'platform_owner' && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm text-blue-800">
              <strong>Platform Owner Access:</strong> You have full access to all platform features and tenant management.
            </p>
          </div>
        )}
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Site Surveys
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">
              No active site surveys
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Estimates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">
              No pending estimates
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Scheduled Jobs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">
              No scheduled jobs
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0</div>
            <p className="text-xs text-gray-500">
              No revenue recorded
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest site surveys and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              No recent activity to display
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and workflows
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/site-surveys/new" className="block">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create New Site Survey
              </Button>
            </Link>
            
            <Link href="/site-surveys" className="block">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                View All Site Surveys
              </Button>
            </Link>
            
            <Button className="w-full justify-start" variant="outline" disabled>
              <Calculator className="mr-2 h-4 w-4" />
              Generate Estimate (Coming Soon)
            </Button>
            
            <Button className="w-full justify-start" variant="outline" disabled>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule Job (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}