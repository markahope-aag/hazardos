'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertCircle, Database, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'

interface DatabaseCheck {
  category: string
  checks: {
    name: string
    status: 'success' | 'error' | 'warning' | 'pending'
    message: string
    details?: string
  }[]
}

export default function DatabaseStatusPage() {
  const { user, profile, organization } = useMultiTenantAuth()
  const [checks, setChecks] = useState<DatabaseCheck[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const supabase = createClient()

  const runFullDatabaseCheck = async () => {
    setIsRunning(true)
    const allChecks: DatabaseCheck[] = []

    // 1. Table Structure Checks
    const tableChecks = {
      category: 'Table Structure',
      checks: [] as any[]
    }

    // Check if migration was run correctly
    try {
      const { data: _siteSurveys, error: siteSurveysError } = await supabase
        .from('site_surveys')
        .select('id')
        .limit(1)

      const { data: _oldAssessments, error: oldAssessmentsError } = await supabase
        .from('assessments')
        .select('id')
        .limit(1)

      if (!siteSurveysError) {
        tableChecks.checks.push({
          name: 'Site Surveys Table',
          status: 'success',
          message: 'site_surveys table exists and accessible'
        })
      } else if (!oldAssessmentsError) {
        tableChecks.checks.push({
          name: 'Site Surveys Table',
          status: 'error',
          message: 'Migration not run - still using old "assessments" table',
          details: 'Run docs/database/10-rename-assessments-to-site-surveys.sql'
        })
      } else {
        tableChecks.checks.push({
          name: 'Site Surveys Table',
          status: 'error',
          message: 'Neither site_surveys nor assessments table found',
          details: 'Run initial schema setup first'
        })
      }

      // Check photos table
      const { data: _siteSurveyPhotos, error: photosError } = await supabase
        .from('site_survey_photos')
        .select('id')
        .limit(1)

      const { data: _oldPhotos, error: oldPhotosError } = await supabase
        .from('assessment_photos')
        .select('id')
        .limit(1)

      if (!photosError) {
        tableChecks.checks.push({
          name: 'Site Survey Photos Table',
          status: 'success',
          message: 'site_survey_photos table exists and accessible'
        })
      } else if (!oldPhotosError) {
        tableChecks.checks.push({
          name: 'Site Survey Photos Table',
          status: 'error',
          message: 'Migration not run - still using old "assessment_photos" table',
          details: 'Run docs/database/10-rename-assessments-to-site-surveys.sql'
        })
      } else {
        tableChecks.checks.push({
          name: 'Site Survey Photos Table',
          status: 'warning',
          message: 'Photos table does not exist',
          details: 'Run docs/database/08-assessment-photos-table-only.sql first, then migration'
        })
      }

    } catch (error) {
      tableChecks.checks.push({
        name: 'Table Structure Check',
        status: 'error',
        message: `Failed to check table structure: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    allChecks.push(tableChecks)

    // 2. Authentication & Authorization
    const authChecks = {
      category: 'Authentication & Authorization',
      checks: [] as any[]
    }

    if (user && profile) {
      authChecks.checks.push({
        name: 'User Authentication',
        status: 'success',
        message: `Authenticated as ${profile.first_name} ${profile.last_name} (${profile.role})`
      })

      if (organization) {
        authChecks.checks.push({
          name: 'Organization Access',
          status: 'success',
          message: `Connected to ${organization.name} (${organization.subscription_tier})`
        })
      } else {
        authChecks.checks.push({
          name: 'Organization Access',
          status: 'warning',
          message: 'No organization found for user'
        })
      }
    } else {
      authChecks.checks.push({
        name: 'User Authentication',
        status: 'error',
        message: 'User not authenticated or profile not found'
      })
    }

    allChecks.push(authChecks)

    // 3. Storage Configuration
    const storageChecks = {
      category: 'Storage Configuration',
      checks: [] as any[]
    }

    try {
      const { data: _data, error } = await supabase.storage
        .from('assessment-media')
        .list('', { limit: 1 })

      if (error) {
        storageChecks.checks.push({
          name: 'Storage Bucket Access',
          status: 'error',
          message: `Storage error: ${error.message}`,
          details: 'Create assessment-media bucket and configure policies'
        })
      } else {
        storageChecks.checks.push({
          name: 'Storage Bucket Access',
          status: 'success',
          message: 'Storage bucket accessible with proper permissions'
        })
      }
    } catch (error) {
      storageChecks.checks.push({
        name: 'Storage Bucket Access',
        status: 'error',
        message: `Storage test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    allChecks.push(storageChecks)

    // 4. CRUD Operations Test
    const crudChecks = {
      category: 'CRUD Operations',
      checks: [] as any[]
    }

    if (organization && user) {
      try {
        // Test site survey creation
        const testSiteSurvey = {
          organization_id: organization.id,
          estimator_id: user.id,
          job_name: 'Database Structure Test',
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

        const { data: createResult, error: createError } = await supabase
          .from('site_surveys')
          .insert(testSiteSurvey)
          .select()
          .single()

        if (createError) {
          crudChecks.checks.push({
            name: 'Site Survey Creation',
            status: 'error',
            message: `Create failed: ${createError.message}`
          })
        } else {
          // Test read
          const { data: _readResult, error: readError } = await supabase
            .from('site_surveys')
            .select('*')
            .eq('id', createResult.id)
            .single()

          if (readError) {
            crudChecks.checks.push({
              name: 'Site Survey Read',
              status: 'error',
              message: `Read failed: ${readError.message}`
            })
          } else {
            crudChecks.checks.push({
              name: 'Site Survey CRUD',
              status: 'success',
              message: 'Create and read operations successful'
            })
          }

          // Clean up test record
          await supabase
            .from('site_surveys')
            .delete()
            .eq('id', createResult.id)
        }
      } catch (error) {
        crudChecks.checks.push({
          name: 'Site Survey CRUD',
          status: 'error',
          message: `CRUD test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    } else {
      crudChecks.checks.push({
        name: 'Site Survey CRUD',
        status: 'warning',
        message: 'Cannot test CRUD - user not authenticated or no organization'
      })
    }

    allChecks.push(crudChecks)

    setChecks(allChecks)
    setIsRunning(false)
  }

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

  const allChecks = checks.flatMap(category => category.checks)
  const successCount = allChecks.filter(c => c.status === 'success').length
  const errorCount = allChecks.filter(c => c.status === 'error').length
  const warningCount = allChecks.filter(c => c.status === 'warning').length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Database Structure Status</h1>
          <p className="text-gray-600">Complete verification of Site Survey database structure</p>
        </div>
        <Button onClick={runFullDatabaseCheck} disabled={isRunning}>
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Checks...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Run Full Check
            </>
          )}
        </Button>
      </div>

      {/* Summary */}
      {allChecks.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{allChecks.length}</div>
                  <p className="text-sm text-gray-600">Total Checks</p>
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

      {/* Detailed Results by Category */}
      <div className="space-y-6">
        {checks.map((category, categoryIndex) => (
          <Card key={categoryIndex}>
            <CardHeader>
              <CardTitle>{category.category}</CardTitle>
              <CardDescription>
                {category.checks.filter(c => c.status === 'success').length} of {category.checks.length} checks passed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {category.checks.map((check, checkIndex) => (
                <div key={checkIndex} className={`p-3 rounded-lg border ${getStatusColor(check.status)}`}>
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(check.status)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{check.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{check.message}</p>
                      {check.details && (
                        <p className="text-xs text-gray-500 mt-2 italic">{check.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {checks.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Database Structure Check</h3>
            <p className="text-gray-600 mb-6">
              Run a comprehensive check to verify your database structure is properly configured
              for Site Surveys with photo/video upload functionality.
            </p>
            <Button onClick={runFullDatabaseCheck} size="lg">
              <Database className="mr-2 h-5 w-5" />
              Start Database Structure Check
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Migration Instructions */}
      {errorCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Migration Required</CardTitle>
            <CardDescription className="text-red-700">
              Your database structure needs to be updated
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-red-800">
              <p className="font-medium mb-3">🎯 <strong>Recommended: Use Supabase CLI Migrations</strong></p>
              <div className="bg-white p-3 rounded border border-red-300 mb-4">
                <p className="font-medium mb-2">Option A: Supabase CLI (Recommended)</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Run: <code className="bg-gray-100 px-1 rounded">supabase db push</code></li>
                  <li>This applies: <code>supabase/migrations/20260131131550_add_assessment_photos_table.sql</code></li>
                  <li>Then applies: <code>supabase/migrations/20260131131600_rename_assessments_to_site_surveys.sql</code></li>
                </ol>
              </div>
              
              <div className="bg-white p-3 rounded border border-red-300">
                <p className="font-medium mb-2">Option B: Manual in Supabase Dashboard</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Go to Supabase Dashboard → SQL Editor</li>
                  <li>If assessment_photos missing: Run <code>supabase/migrations/20260131131550_add_assessment_photos_table.sql</code></li>
                  <li>Run main migration: <code>supabase/migrations/20260131131600_rename_assessments_to_site_surveys.sql</code></li>
                  <li>Create storage bucket: <code>assessment-media</code> (private)</li>
                  <li>Add storage policies from: <code>docs/database/08-storage-policies-only.sql</code></li>
                </ol>
              </div>
              
              <p className="text-xs mt-3 italic">
                📖 See <code>docs/MIGRATION-GUIDE.md</code> for complete instructions
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {errorCount === 0 && warningCount === 0 && allChecks.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-800 mb-2">
              Database Structure Perfect! ✅
            </h3>
            <p className="text-green-700">
              All checks passed. Your Site Survey functionality is ready for use.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}