'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ArrowLeft, CalendarIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

interface Customer {
  id: string
  name: string
  company_name: string | null
  first_name: string
  last_name: string
}

interface PipelineStage {
  id: string
  name: string
  color: string
  probability: number
}

export default function NewOpportunityPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [stages, setStages] = useState<PipelineStage[]>([])

  const [formData, setFormData] = useState({
    customer_id: '',
    name: '',
    description: '',
    stage_id: '',
    estimated_value: '',
    expected_close_date: undefined as Date | undefined,
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [customersRes, stagesRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/pipeline/stages'),
        ])

        const customersData = await customersRes.json()
        const stagesData = await stagesRes.json()

        if (customersData.customers) {
          setCustomers(customersData.customers)
        }
        if (Array.isArray(stagesData)) {
          setStages(stagesData)
          // Default to first non-won/lost stage
          const defaultStage = stagesData.find(
            (s: PipelineStage) => !['won', 'lost'].includes(s.name.toLowerCase())
          )
          if (defaultStage) {
            setFormData(prev => ({ ...prev, stage_id: defaultStage.id }))
          }
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load form data',
          variant: 'destructive',
        })
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_id) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' })
      return
    }
    if (!formData.name) {
      toast({ title: 'Error', description: 'Please enter an opportunity name', variant: 'destructive' })
      return
    }
    if (!formData.stage_id) {
      toast({ title: 'Error', description: 'Please select a pipeline stage', variant: 'destructive' })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: formData.customer_id,
          name: formData.name,
          description: formData.description || undefined,
          stage_id: formData.stage_id,
          estimated_value: formData.estimated_value
            ? parseFloat(formData.estimated_value)
            : undefined,
          expected_close_date: formData.expected_close_date
            ? format(formData.expected_close_date, 'yyyy-MM-dd')
            : undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create opportunity')
      }

      const opportunity = await response.json()
      toast({
        title: 'Opportunity created',
        description: `${opportunity.name} has been added to your pipeline`,
      })
      router.push('/pipeline')
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create opportunity',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const selectedStage = stages.find(s => s.id === formData.stage_id)
  const weightedValue = formData.estimated_value && selectedStage
    ? parseFloat(formData.estimated_value) * (selectedStage.probability / 100)
    : 0

  return (
    <div className="container py-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild aria-label="Back to pipeline">
          <Link href="/pipeline">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Opportunity</h1>
          <p className="text-muted-foreground">Add a new opportunity to your sales pipeline</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Customer *</Label>
                <Select
                  value={formData.customer_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, customer_id: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingData ? 'Loading...' : 'Select a customer'} />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(customer => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.company_name || `${customer.first_name} ${customer.last_name}`.trim() || customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Opportunity Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Opportunity Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Q1 Renovation Project"
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the opportunity"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Pipeline Stage *</Label>
                <Select
                  value={formData.stage_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, stage_id: value }))}
                  disabled={loadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          {stage.name} ({stage.probability}%)
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Value & Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Value ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
                    placeholder="e.g., 50000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Weighted Value</Label>
                  <Input
                    value={weightedValue.toLocaleString('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 0,
                    })}
                    disabled
                    className="bg-muted"
                  />
                  {selectedStage && (
                    <p className="text-xs text-muted-foreground">
                      Based on {selectedStage.probability}% probability
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Expected Close Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.expected_close_date && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expected_close_date
                        ? format(formData.expected_close_date, 'PPP')
                        : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.expected_close_date}
                      onSelect={(date) => setFormData(prev => ({ ...prev, expected_close_date: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" asChild className="flex-1">
              <Link href="/pipeline">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Opportunity'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
