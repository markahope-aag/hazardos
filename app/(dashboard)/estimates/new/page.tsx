'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Calculator, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase/client'

interface SurveySummary {
  id: string
  job_name: string | null
  customer_name: string | null
  site_address: string | null
  site_city: string | null
  site_state: string | null
  hazard_type: string | null
  status: string
}

interface CustomerSummary {
  id: string
  company_name: string | null
  first_name: string | null
  last_name: string | null
  name: string | null
}

function customerLabel(c: CustomerSummary): string {
  if (c.company_name) return c.company_name
  const composed = [c.first_name, c.last_name].filter(Boolean).join(' ').trim()
  return composed || c.name || 'Unnamed contact'
}

export default function NewEstimatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const surveyId = searchParams.get('survey_id')
  const initialMode: 'survey' | 'standalone' = surveyId ? 'survey' : 'survey'

  const [mode, setMode] = useState<'survey' | 'standalone'>(initialMode)
  const [survey, setSurvey] = useState<SurveySummary | null>(null)
  const [loading, setLoading] = useState(!!surveyId)
  const [generating, setGenerating] = useState(false)

  // Standalone form state
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [customersLoading, setCustomersLoading] = useState(false)
  const [standaloneCustomerId, setStandaloneCustomerId] = useState<string>('')
  const [standaloneProjectName, setStandaloneProjectName] = useState<string>('')

  useEffect(() => {
    if (!surveyId) return

    const supabase = createClient()
    supabase
      .from('site_surveys')
      .select('id, job_name, customer_name, site_address, site_city, site_state, hazard_type, status')
      .eq('id', surveyId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({
            title: 'Survey not found',
            description: 'Could not load the linked survey.',
            variant: 'destructive',
          })
        } else {
          setSurvey(data)
        }
        setLoading(false)
      })
  }, [surveyId, toast])

  // Load customers lazily — only when the user switches to standalone mode.
  useEffect(() => {
    if (mode !== 'standalone' || customers.length > 0 || customersLoading) return
    setCustomersLoading(true)
    const supabase = createClient()
    supabase
      .from('customers')
      .select('id, company_name, first_name, last_name, name')
      .order('company_name', { ascending: true })
      .order('last_name', { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (error) {
          toast({
            title: 'Failed to load customers',
            description: error.message,
            variant: 'destructive',
          })
        } else {
          setCustomers((data || []) as CustomerSummary[])
        }
        setCustomersLoading(false)
      })
  }, [mode, customers.length, customersLoading, toast])

  const handleGenerateFromSurvey = async () => {
    if (!surveyId) return

    try {
      setGenerating(true)
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site_survey_id: surveyId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || err.error || 'Failed to generate estimate')
      }
      const { estimate } = await res.json()
      toast({
        title: 'Estimate generated',
        description: `Estimate ${estimate.estimate_number} has been created.`,
      })
      router.push(`/estimates/${estimate.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate estimate.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  const handleCreateStandalone = async () => {
    if (!standaloneProjectName.trim()) {
      toast({
        title: 'Project name required',
        description: 'Give the estimate a name so it shows up in the list.',
        variant: 'destructive',
      })
      return
    }

    try {
      setGenerating(true)
      const res = await fetch('/api/estimates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: standaloneCustomerId || null,
          project_name: standaloneProjectName.trim(),
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error?.message || err.error || 'Failed to create estimate')
      }
      const { estimate } = await res.json()
      toast({
        title: 'Draft estimate created',
        description: 'Add line items to build out the estimate.',
      })
      router.push(`/estimates/${estimate.id}/line-items`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create estimate.',
        variant: 'destructive',
      })
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={surveyId ? `/site-surveys/${surveyId}` : '/estimates'}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Estimate</h1>
          <p className="text-muted-foreground">
            Generate from a survey, or build a standalone estimate by hand.
          </p>
        </div>
      </div>

      {/* Mode toggle — only when not arriving with survey_id pre-selected */}
      {!surveyId && (
        <div className="inline-flex rounded-md border bg-background p-1">
          <button
            type="button"
            className={`px-4 py-2 text-sm rounded ${
              mode === 'survey'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('survey')}
          >
            From a survey
          </button>
          <button
            type="button"
            className={`px-4 py-2 text-sm rounded ${
              mode === 'standalone'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setMode('standalone')}
          >
            Standalone
          </button>
        </div>
      )}

      {mode === 'survey' && survey && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Survey Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Customer</p>
                <p className="font-medium">{survey.customer_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Hazard Type</p>
                <p className="font-medium capitalize">{survey.hazard_type || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">
                  {[survey.site_address, survey.site_city, survey.site_state].filter(Boolean).join(', ') || 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Survey Status</p>
                <p className="font-medium capitalize">{survey.status}</p>
              </div>
            </div>

            <Button onClick={handleGenerateFromSurvey} disabled={generating} className="w-full">
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calculator className="h-4 w-4 mr-2" />
              )}
              {generating ? 'Generating Estimate...' : 'Generate Estimate'}
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === 'survey' && !survey && (
        <Card>
          <CardContent className="py-12 text-center">
            <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">No survey selected</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Pick a survey to generate an estimate from, or switch to{' '}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => setMode('standalone')}
              >
                standalone
              </button>
              {' '}to build one without a survey.
            </p>
            <Button asChild>
              <Link href="/site-surveys">Browse Surveys</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {mode === 'standalone' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Standalone Estimate
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              No hazard data is auto-loaded — you'll add line items by hand on the next page.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name *</Label>
              <Input
                id="project-name"
                placeholder="e.g. Annual maintenance — 600 W Industrial"
                value={standaloneProjectName}
                onChange={(e) => setStandaloneProjectName(e.target.value)}
                maxLength={255}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer">Customer</Label>
              <Select value={standaloneCustomerId} onValueChange={setStandaloneCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder={customersLoading ? 'Loading…' : 'Select a customer (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {customerLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave blank if you don't have one yet — you can attach it later.
              </p>
            </div>

            <Button
              onClick={handleCreateStandalone}
              disabled={generating || !standaloneProjectName.trim()}
              className="w-full"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {generating ? 'Creating…' : 'Create Draft Estimate'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
