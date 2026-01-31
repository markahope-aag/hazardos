'use client'

import { useState, useEffect } from 'react'
import { DatabaseService } from '@/lib/supabase/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function TestDbPage() {
  const [connectionStatus, setConnectionStatus] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    try {
      const result = await DatabaseService.testConnection()
      setConnectionStatus(result)
    } catch (error) {
      setConnectionStatus({
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Database Test</h1>
        <p className="text-gray-600">
          Test the Supabase database connection and configuration
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Connection Status</CardTitle>
            <CardDescription>
              Test the basic database connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={testConnection} 
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Testing...' : 'Test Connection'}
            </Button>
            
            {connectionStatus && (
              <div className={`p-4 rounded-md ${
                connectionStatus.success 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${
                    connectionStatus.success ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="font-medium">
                    {connectionStatus.success ? 'Success' : 'Failed'}
                  </span>
                </div>
                <p className="mt-1 text-sm">
                  {connectionStatus.message}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Setup</CardTitle>
            <CardDescription>
              Instructions for setting up your database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p><strong>1.</strong> Run the schema SQL in Supabase SQL Editor:</p>
              <code className="block bg-gray-100 p-2 rounded text-xs">
                docs/database/01-schema.sql
              </code>
              
              <p><strong>2.</strong> Run the RLS policies:</p>
              <code className="block bg-gray-100 p-2 rounded text-xs">
                docs/database/02-rls-policies.sql
              </code>
              
              <p><strong>3.</strong> Add sample data (optional):</p>
              <code className="block bg-gray-100 p-2 rounded text-xs">
                docs/database/03-sample-data.sql
              </code>
              
              <p><strong>4.</strong> Create Storage bucket:</p>
              <code className="block bg-gray-100 p-2 rounded text-xs">
                assessment-photos (public)
              </code>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Environment Check</CardTitle>
          <CardDescription>
            Verify your environment variables are set correctly
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span>NEXT_PUBLIC_SUPABASE_URL:</span>
              <span className={process.env.NEXT_PUBLIC_SUPABASE_URL ? 'text-green-600' : 'text-red-600'}>
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✓ Set' : '✗ Missing'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>
              <span className={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'text-green-600' : 'text-red-600'}>
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}