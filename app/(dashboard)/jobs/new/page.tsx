'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  email: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip: string | null
}

export default function NewJobPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const proposalId = searchParams.get('proposal_id')
  const customerId = searchParams.get('customer_id')
  const defaultDate = searchParams.get('date')

  const [loading, setLoading] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])

  const [formData, setFormData] = useState({
    customer_id: customerId || '',
    proposal_id: proposalId || '',
    scheduled_start_date: defaultDate ? new Date(defaultDate) : new Date(),
    scheduled_start_time: '',
    estimated_duration_hours: '',
    job_address: '',
    job_city: '',
    job_state: '',
    job_zip: '',
    access_notes: '',
    special_instructions: '',
    name: '',
  })

  useEffect(() => {
    async function fetchCustomers() {
      try {
        const response = await fetch('/api/customers')
        const data = await response.json()
        if (data.customers) {
          setCustomers(data.customers)
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error)
      } finally {
        setLoadingCustomers(false)
      }
    }
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (formData.customer_id) {
      const customer = customers.find(c => c.id === formData.customer_id)
      if (customer && !formData.job_address) {
        setFormData(prev => ({
          ...prev,
          job_address: customer.address_line1 || '',
          job_city: customer.city || '',
          job_state: customer.state || '',
          job_zip: customer.zip || '',
        }))
      }
    }
  }, [formData.customer_id, customers, formData.job_address])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_id) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' })
      return
    }
    if (!formData.job_address) {
      toast({ title: 'Error', description: 'Please enter a job address', variant: 'destructive' })
      return
    }

    setLoading(true)

    try {
      const endpoint = proposalId ? '/api/jobs/from-proposal' : '/api/jobs'
      const body = proposalId
        ? {
            proposal_id: proposalId,
            scheduled_start_date: format(formData.scheduled_start_date, 'yyyy-MM-dd'),
            scheduled_start_time: formData.scheduled_start_time || undefined,
            estimated_duration_hours: formData.estimated_duration_hours
              ? parseFloat(formData.estimated_duration_hours)
              : undefined,
          }
        : {
            customer_id: formData.customer_id,
            scheduled_start_date: format(formData.scheduled_start_date, 'yyyy-MM-dd'),
            scheduled_start_time: formData.scheduled_start_time || undefined,
            estimated_duration_hours: formData.estimated_duration_hours
              ? parseFloat(formData.estimated_duration_hours)
              : undefined,
            job_address: formData.job_address,
            job_city: formData.job_city || undefined,
            job_state: formData.job_state || undefined,
            job_zip: formData.job_zip || undefined,
            access_notes: formData.access_notes || undefined,
            special_instructions: formData.special_instructions || undefined,
            name: formData.name || undefined,
          }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create job')
      }

      const job = await response.json()
      toast({ title: 'Job created', description: `Job ${job.job_number} has been created` })
      router.push(`/jobs/${job.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create job',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/jobs">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {proposalId ? 'Schedule Job from Proposal' : 'Create New Job'}
          </h1>
          <p className="text-muted-foreground">
            {proposalId ? 'Schedule a job for the signed proposal' : 'Create a new job and schedule it'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {!proposalId && (
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
                    disabled={loadingCustomers}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingCustomers ? 'Loading...' : 'Select a customer'} />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(customer => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.company_name || customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData.scheduled_start_date && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.scheduled_start_date ? format(formData.scheduled_start_date, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.scheduled_start_date}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, scheduled_start_date: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.scheduled_start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduled_start_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estimated Duration (hours)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.estimated_duration_hours}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration_hours: e.target.value }))}
                  placeholder="e.g., 8"
                />
              </div>
            </CardContent>
          </Card>

          {!proposalId && (
            <Card>
              <CardHeader>
                <CardTitle>Job Location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Address *</Label>
                  <Input
                    value={formData.job_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, job_address: e.target.value }))}
                    placeholder="123 Main St"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input
                      value={formData.job_city}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_city: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>State</Label>
                    <Input
                      value={formData.job_state}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_state: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP</Label>
                    <Input
                      value={formData.job_zip}
                      onChange={(e) => setFormData(prev => ({ ...prev, job_zip: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Access Notes</Label>
                  <Textarea
                    value={formData.access_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, access_notes: e.target.value }))}
                    placeholder="Gate codes, parking instructions, etc."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Job Name (Optional)</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Kitchen Renovation - Phase 1"
                />
              </div>

              <div className="space-y-2">
                <Label>Special Instructions</Label>
                <Textarea
                  value={formData.special_instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, special_instructions: e.target.value }))}
                  placeholder="Any special requirements or instructions for the crew"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" asChild className="flex-1">
              <Link href="/jobs">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Job'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
