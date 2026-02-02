'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertCircle, Database } from 'lucide-react'
import { SiteSurveyService } from '@/lib/supabase/site-survey-service'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import { createClient } from '@/lib/supabase/client'

interface TestResult {
  name: string
  status: 'success' | 'error' | 'warning' | 'pending'
  message: string
  details?: string
}

export default function DatabaseTestPage() {
  const { user, profile, organization } = useMultiTenantAuth()
  const [tests, setTests] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const supabase = createClient()

  const runTests = useCallback(async () => {
    setIsRunning(true)
    const results: TestResult[] = []

    // Test 1: Database Connection
    try {
      const connectionTest = await SiteSurveyService.testConnection()
      results.push({
        name: 'Database Connection',
        status: connectionTest.success ? 'success' : 'error',
        message: connectionTest.message
      })
    } catch (error) {
      results.push({
        name: 'Database Connection',
        status: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Test 2: User Authentication
    if (user && profile) {
      results.push({
        name: 'User Authentication',
        status: 'success',
        message: `Authenticated as ${profile.first_name} ${profile.last_name} (${profile.role})`
      })
    } else {
      results.push({
        name: 'User Authentication',
        status: 'error',
        message: 'User not authenticated or profile not found'
      })
    }

    // Test 3: Organization Access
    if (organization) {
      results.push({
        name: 'Organization Access',
        status: 'success',
        message: `Connected to ${organization.name} (${organization.subscription_tier})`
      })
    } else {
      results.push({
        name: 'Organization Access',
        status: 'warning',
        message: 'No organization found for user'
      })
    }

    // Test 4: Site Surveys Table Structure
    try {
      const { error } = await supabase
        .from('site_surveys')
        .select('id')
        .limit(1)

      if (error) {
        // Check if old assessments table still exists
        const { error: oldError } = await supabase
          .from('assessments')
          .select('id')
          .limit(1)

        if (!oldError) {
          results.push({
            name: 'Site Surveys Table',
            status: 'error',
            message: 'Migration not run - still using old "assessments" table',
            details: 'Run docs/database/10-rename-assessments-to-site-surveys.sql'
          })
        } else {
          results.push({
            name: 'Site Surveys Table',
            status: 'error',
            message: `Table access error: ${error.message}`
          })
        }
      } else {
        results.push({
          name: 'Site Surveys Table',
          status: 'success',
          message: 'Table accessible and properly configured'
        })
      }
    } catch (error) {
      results.push({
        name: 'Site Surveys Table',
        status: 'error',
        message: `Table test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Test 5: Site Survey Photos Table
    try {
      const { error } = await supabase
        .from('site_survey_photos')
        .select('id')
        .limit(1)

      if (error) {
        // Check if old assessment_photos table still exists
        const { error: oldError } = await supabase
          .from('assessment_photos')
          .select('id')
          .limit(1)

        if (!oldError) {
          results.push({
            name: 'Site Survey Photos Table',
            status: 'error',
            message: 'Migration not run - still using old "assessment_photos" table',
            details: 'Run docs/database/10-rename-assessments-to-site-surveys.sql'
          })
        } else {
          results.push({
            name: 'Site Survey Photos Table',
            status: 'error',
            message: `Table access error: ${error.message}`,
            details: 'May need to create table first with 08-assessment-photos-table-only.sql'
          })
        }
      } else {
        results.push({
          name: 'Site Survey Photos Table',
          status: 'success',
          message: 'Media table accessible and properly configured'
        })
      }
    } catch (error) {
      results.push({
        name: 'Site Survey Photos Table',
        status: 'error',
        message: `Table test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Test 6: Storage Bucket Access
    try {
      const { error } = await supabase.storage
        .from('assessment-media')
        .list('', { limit: 1 })

      if (error) {
        results.push({
          name: 'Storage Bucket Access',
          status: 'error',
          message: `Storage error: ${error.message}`,
          details: 'Make sure assessment-media bucket exists and has proper policies'
        })
      } else {
        results.push({
          name: 'Storage Bucket Access',
          status: 'success',
          message: 'Storage bucket accessible with proper permissions'
        })
      }
    } catch (error) {
      results.push({
        name: 'Storage Bucket Access',
        status: 'error',
        message: `Storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    // Test 7: Site Survey Creation (if user has organization)
    if (organization && user) {
      try {
        const testSiteSurvey = {
          organization_id: organization.id,
          estimator_id: user.id,
          job_name: 'Database Test Site Survey',
          customer_name: 'Test Customer',
          customer_email: 'test@example.com',
          site_address: '123 Test Street',
          site_city: 'Test City',
          site_state: 'CA',
          site_zip: '12345',
          hazard_type: 'asbestos' as const,
          containment_level: 1,
          occupied: false,
          clearance_required: false,
          regulatory_notifications_needed: false,
          status: 'draft' as const
        }

        const result = await SiteSurveyService.createSiteSurvey(testSiteSurvey)
        
        // Clean up test site survey
        if (result?.id) {
          await SiteSurveyService.deleteSiteSurvey(result.id)
        }

        results.push({
          name: 'Site Survey CRUD Operations',
          status: 'success',
          message: 'Can create, read, and delete site surveys successfully'
        })
      } catch (error) {
        results.push({
          name: 'Site Survey CRUD Operations',
          status: 'error',
          message: `CRUD test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    setTests(results)
    setIsRunning(false)
  }, [user, profile, organization, supabase])

  useEffect(() => {
    if (user && profile) {
      runTests()
    }
  }, [user, profile, organization, runTests])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default: return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'border-green-200 bg-green-50'
      case 'error': return 'border-red-200 bg-red-50'
      case 'warning': return 'border-yellow-200 bg-yellow-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const successCount = tests.filter(t => t.status === 'success').length
  const errorCount = tests.filter(t => t.status === 'error').length
  const warningCount = tests.filter(t => t.status === 'warning').length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Structure Test</h1>
          <p className="text-gray-600">Verify all components are properly configured</p>
        </div>
        <Button onClick={runTests} disabled={isRunning}>
          {isRunning ? 'Running Tests...' : 'Run Tests Again'}
        </Button>
      </div>

      {/* Summary */}
      {tests.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{tests.length}</div>
                  <p className="text-sm text-gray-600">Total Tests</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{successCount}</div>
                  <p className="text-sm text-gray-600">Passed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
                  <p className="text-sm text-gray-600">Warnings</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-red-600">{errorCount}</div>
                  <p className="text-sm text-gray-600">Errors</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Results */}
      <div className="space-y-4">
        {tests.map((test, index) => (
          <Card key={index} className={`border ${getStatusColor(test.status)}`}>
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                {getStatusIcon(test.status)}
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{test.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                  {test.details && (
                    <p className="text-xs text-gray-500 mt-2 italic">{test.details}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {tests.length === 0 && !isRunning && (
        <Card>
          <CardContent className="p-8 text-center">
            <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to Test</h3>
            <p className="text-gray-600 mb-4">Click "Run Tests" to verify your database structure</p>
            <Button onClick={runTests}>
              <Database className="mr-2 h-4 w-4" />
              Start Database Tests
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Information</CardTitle>
          <CardDescription>Current configuration details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Supabase URL:</span>
              <span className="ml-2 text-gray-600">
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Configured' : '✗ Missing'}
              </span>
            </div>
            <div>
              <span className="font-medium">Supabase Key:</span>
              <span className="ml-2 text-gray-600">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Configured' : '✗ Missing'}
              </span>
            </div>
            <div>
              <span className="font-medium">User ID:</span>
              <span className="ml-2 text-gray-600">{user?.id || 'Not authenticated'}</span>
            </div>
            <div>
              <span className="font-medium">Organization:</span>
              <span className="ml-2 text-gray-600">{organization?.name || 'None'}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}