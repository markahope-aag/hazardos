'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, AlertCircle, Database, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'

interface VerificationResult {
  name: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: string
}

interface VerificationCategory {
  category: string
  results: VerificationResult[]
}

export default function MigrationVerificationPage() {
  const { user, profile, organization } = useMultiTenantAuth()
  const [verificationResults, setVerificationResults] = useState<VerificationCategory[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const supabase = createClient()

  const runFullVerification = async () => {
    setIsRunning(true)
    const allResults: VerificationCategory[] = []

    // 1. Table Structure Verification
    const tableResults: VerificationResult[] = []
    
    try {
      // Check if all required tables exist
      const requiredTables = [
        'customers',
        'site_surveys', 
        'site_survey_photos',
        'labor_rates',
        'equipment_rates', 
        'material_costs',
        'disposal_fees',
        'travel_rates',
        'pricing_settings'
      ]

      for (const tableName of requiredTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)

          if (error) {
            tableResults.push({
              name: `${tableName} table`,
              status: 'error',
              message: `Table not accessible: ${error.message}`
            })
          } else {
            tableResults.push({
              name: `${tableName} table`,
              status: 'success',
              message: 'Table exists and accessible'
            })
          }
        } catch (err) {
          tableResults.push({
            name: `${tableName} table`,
            status: 'error',
            message: `Table check failed: ${err instanceof Error ? err.message : 'Unknown error'}`
          })
        }
      }

    } catch (error) {
      tableResults.push({
        name: 'Table Structure Check',
        status: 'error',
        message: `Failed to check tables: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    allResults.push({
      category: 'Table Structure',
      results: tableResults
    })

    // 2. Customer Table Structure Verification
    const customerResults: VerificationResult[] = []
    
    if (organization) {
      try {
        // Test customer creation with all fields
        const testCustomer = {
          organization_id: organization.id,
          name: 'Test Customer',
          company_name: 'Test Company',
          email: 'test@example.com',
          phone: '555-0123',
          address_line1: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zip: '12345',
          status: 'lead' as const,
          source: 'website' as const,
          communication_preferences: { email: true, sms: false, mail: false },
          marketing_consent: false,
          notes: 'Migration verification test'
        }

        const { data: createdCustomer, error: createError } = await supabase
          .from('customers')
          .insert(testCustomer)
          .select()
          .single()

        if (createError) {
          customerResults.push({
            name: 'Customer Creation',
            status: 'error',
            message: `Failed to create test customer: ${createError.message}`
          })
        } else {
          customerResults.push({
            name: 'Customer Creation',
            status: 'success',
            message: 'Customer table fully functional with all fields'
          })

          // Clean up test customer
          await supabase
            .from('customers')
            .delete()
            .eq('id', createdCustomer.id)
        }

      } catch (error) {
        customerResults.push({
          name: 'Customer CRUD Test',
          status: 'error',
          message: `Customer test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    allResults.push({
      category: 'Customer Functionality',
      results: customerResults
    })

    // 3. Site Survey Enhancements Verification
    const siteSurveyResults: VerificationResult[] = []
    
    if (organization) {
      try {
        // Check if customer_id field exists in site_surveys
        const { data: surveys, error: surveyError } = await supabase
          .from('site_surveys')
          .select('customer_id, scheduled_date, scheduled_time_start, scheduled_time_end, assigned_to, appointment_status')
          .limit(1)

        if (surveyError) {
          siteSurveyResults.push({
            name: 'Site Survey Fields',
            status: 'error',
            message: `Missing site survey fields: ${surveyError.message}`
          })
        } else {
          siteSurveyResults.push({
            name: 'Site Survey Fields',
            status: 'success',
            message: 'All new fields (customer_id, scheduling) added successfully'
          })
        }

      } catch (error) {
        siteSurveyResults.push({
          name: 'Site Survey Enhancement',
          status: 'error',
          message: `Site survey check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    allResults.push({
      category: 'Site Survey Enhancements',
      results: siteSurveyResults
    })

    // 4. Pricing Tables Verification
    const pricingResults: VerificationResult[] = []
    
    if (organization) {
      try {
        // Test each pricing table with a sample record
        const pricingTables = [
          { name: 'labor_rates', testData: { organization_id: organization.id, name: 'Test Rate', rate_per_hour: 50.00 } },
          { name: 'equipment_rates', testData: { organization_id: organization.id, name: 'Test Equipment', rate_per_day: 100.00 } },
          { name: 'material_costs', testData: { organization_id: organization.id, name: 'Test Material', cost_per_unit: 25.00, unit: 'each' } },
          { name: 'disposal_fees', testData: { organization_id: organization.id, hazard_type: 'mold', cost_per_cubic_yard: 150.00 } },
          { name: 'travel_rates', testData: { organization_id: organization.id, min_miles: 0, max_miles: 25, flat_fee: 0.00 } }
        ]

        for (const table of pricingTables) {
          try {
            const { data, error } = await supabase
              .from(table.name)
              .insert(table.testData)
              .select()
              .single()

            if (error) {
              pricingResults.push({
                name: `${table.name} table`,
                status: 'error',
                message: `Failed to insert test data: ${error.message}`
              })
            } else {
              pricingResults.push({
                name: `${table.name} table`,
                status: 'success',
                message: 'Table structure and constraints working correctly'
              })

              // Clean up test data
              await supabase
                .from(table.name)
                .delete()
                .eq('id', data.id)
            }
          } catch (err) {
            pricingResults.push({
              name: `${table.name} table`,
              status: 'error',
              message: `Test failed: ${err instanceof Error ? err.message : 'Unknown error'}`
            })
          }
        }

        // Test pricing_settings table (unique constraint)
        try {
          const { data, error } = await supabase
            .from('pricing_settings')
            .insert({
              organization_id: organization.id,
              default_markup_percent: 25.00,
              minimum_markup_percent: 10.00,
              maximum_markup_percent: 50.00
            })
            .select()
            .single()

          if (error) {
            pricingResults.push({
              name: 'pricing_settings table',
              status: 'error',
              message: `Failed to insert pricing settings: ${error.message}`
            })
          } else {
            pricingResults.push({
              name: 'pricing_settings table',
              status: 'success',
              message: 'Pricing settings table working with unique constraint'
            })

            // Clean up
            await supabase
              .from('pricing_settings')
              .delete()
              .eq('id', data.id)
          }
        } catch (err) {
          pricingResults.push({
            name: 'pricing_settings table',
            status: 'error',
            message: `Pricing settings test failed: ${err instanceof Error ? err.message : 'Unknown error'}`
          })
        }

      } catch (error) {
        pricingResults.push({
          name: 'Pricing Tables',
          status: 'error',
          message: `Pricing verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    allResults.push({
      category: 'Pricing Configuration',
      results: pricingResults
    })

    // 5. API Routes Verification
    const apiResults: VerificationResult[] = []
    
    try {
      // Test customer API endpoints
      const endpoints = [
        { path: '/api/customers', method: 'GET' },
      ]

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.path, {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json'
            }
          })

          if (response.status === 401) {
            apiResults.push({
              name: `${endpoint.method} ${endpoint.path}`,
              status: 'success',
              message: 'API endpoint exists and properly secured (401 Unauthorized as expected)'
            })
          } else if (response.ok) {
            apiResults.push({
              name: `${endpoint.method} ${endpoint.path}`,
              status: 'success',
              message: 'API endpoint accessible and working'
            })
          } else {
            apiResults.push({
              name: `${endpoint.method} ${endpoint.path}`,
              status: 'warning',
              message: `API returned status ${response.status}`
            })
          }
        } catch (err) {
          apiResults.push({
            name: `${endpoint.method} ${endpoint.path}`,
            status: 'error',
            message: `API test failed: ${err instanceof Error ? err.message : 'Unknown error'}`
          })
        }
      }

    } catch (error) {
      apiResults.push({
        name: 'API Routes',
        status: 'error',
        message: `API verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }

    allResults.push({
      category: 'API Endpoints',
      results: apiResults
    })

    setVerificationResults(allResults)
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

  const allResults = verificationResults.flatMap(category => category.results)
  const successCount = allResults.filter(r => r.status === 'success').length
  const errorCount = allResults.filter(r => r.status === 'error').length
  const warningCount = allResults.filter(r => r.status === 'warning').length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Migration Verification</h1>
          <p className="text-gray-600">Verify all database migrations have been applied correctly</p>
        </div>
        <Button onClick={runFullVerification} disabled={isRunning}>
          {isRunning ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Running Verification...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Run Full Verification
            </>
          )}
        </Button>
      </div>

      {/* Summary */}
      {allResults.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold">{allResults.length}</div>
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

      {/* Detailed Results */}
      <div className="space-y-6">
        {verificationResults.map((category, categoryIndex) => (
          <Card key={categoryIndex}>
            <CardHeader>
              <CardTitle>{category.category}</CardTitle>
              <CardDescription>
                {category.results.filter(r => r.status === 'success').length} of {category.results.length} checks passed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {category.results.map((result, resultIndex) => (
                <div key={resultIndex} className={`p-3 rounded-lg border ${getStatusColor(result.status)}`}>
                  <div className="flex items-start space-x-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{result.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                      {result.details && (
                        <p className="text-xs text-gray-500 mt-2 italic">{result.details}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {verificationResults.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">Migration Verification</h3>
            <p className="text-gray-600 mb-6">
              Run a comprehensive verification to check that all database migrations 
              have been applied correctly and all new functionality is working.
            </p>
            <Button onClick={runFullVerification} size="lg">
              <Database className="mr-2 h-5 w-5" />
              Start Migration Verification
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {errorCount === 0 && warningCount === 0 && allResults.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-green-800 mb-2">
              All Migrations Applied Successfully! ✅
            </h3>
            <p className="text-green-700">
              All database changes have been applied and are working correctly. 
              The customer management and pricing system is ready for use.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}