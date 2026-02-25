'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DebugResult {
  step: string
  status: 'pending' | 'success' | 'error'
  message: string
  details?: Record<string, unknown>
}

export function LoginDebugComponent() {
  const [results, setResults] = useState<DebugResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const addResult = (result: DebugResult) => {
    setResults(prev => [...prev, result])
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])

    const supabase = createClient()

    // Step 1: Test Supabase connection
    addResult({ step: 'Supabase Connection', status: 'pending', message: 'Testing connection...' })
    try {
      const { error } = await supabase.from('profiles').select('count').limit(1)
      if (error) throw error
      addResult({ step: 'Supabase Connection', status: 'success', message: 'Connected successfully' })
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      addResult({
        step: 'Supabase Connection',
        status: 'error',
        message: msg,
      })
    }

    // Step 2: Test auth state
    addResult({ step: 'Auth State', status: 'pending', message: 'Checking current auth state...' })
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) throw error
      
      if (session) {
        addResult({ 
          step: 'Auth State', 
          status: 'success', 
          message: `Logged in as ${session.user.email}`,
          details: { userId: session.user.id, email: session.user.email }
        })

        // Step 3: Test profile fetch
        addResult({ step: 'Profile Fetch', status: 'pending', message: 'Fetching user profile...' })
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profileError) throw profileError

          addResult({ 
            step: 'Profile Fetch', 
            status: 'success', 
            message: 'Profile loaded successfully',
            details: profile
          })

          // Step 4: Test organization fetch (if user has org)
          if (profile.organization_id) {
            addResult({ step: 'Organization Fetch', status: 'pending', message: 'Fetching organization...' })
            try {
              const { data: org, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', profile.organization_id)
                .single()

              if (orgError) throw orgError

              addResult({ 
                step: 'Organization Fetch', 
                status: 'success', 
                message: `Organization: ${org.name}`,
                details: org
              })
            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Unknown error'
              addResult({
                step: 'Organization Fetch',
                status: 'error',
                message: msg,
              })
            }
          } else {
            addResult({ 
              step: 'Organization Fetch', 
              status: 'success', 
              message: 'No organization assigned (normal for new users)'
            })
          }

        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'
          addResult({
            step: 'Profile Fetch',
            status: 'error',
            message: msg,
          })
        }

      } else {
        addResult({ step: 'Auth State', status: 'success', message: 'Not logged in' })
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      addResult({
        step: 'Auth State',
        status: 'error',
        message: msg,
      })
    }

    setIsRunning(false)
  }

  const getStatusColor = (status: DebugResult['status']) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>🔍 Login Diagnostics</CardTitle>
        <CardDescription>
          Run this to diagnose login loading issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostics} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Running Diagnostics...' : 'Run Diagnostics'}
        </Button>

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold">Results:</h3>
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded">
                <Badge className={getStatusColor(result.status)}>
                  {result.status}
                </Badge>
                <div className="flex-1">
                  <div className="font-medium">{result.step}</div>
                  <div className="text-sm text-gray-600">{result.message}</div>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        Show details
                      </summary>
                      <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
          <strong>Common Issues:</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Profile not created after signup (check handle_new_user trigger)</li>
            <li>RLS policies blocking profile access</li>
            <li>Network connectivity issues</li>
            <li>Browser blocking cookies/localStorage</li>
            <li>Infinite recursion in RLS policies</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}