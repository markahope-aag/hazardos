'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, addDays } from 'date-fns'
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
}

interface Job {
  id: string
  job_number: string
  job_address: string
  customer_id: string
  status: string
  final_amount: number | null
  contract_amount: number | null
}

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const jobId = searchParams.get('job_id')

  const [loading, setLoading] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [jobs, setJobs] = useState<Job[]>([])

  const [formData, setFormData] = useState({
    customer_id: '',
    job_id: jobId || '',
    due_date: addDays(new Date(), 30),
    payment_terms: 'Net 30',
    tax_rate: '',
    notes: '',
  })

  // Fetch customers and jobs
  useEffect(() => {
    async function fetchData() {
      try {
        const [customersRes, jobsRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/jobs?status=completed'),
        ])

        const customersData = await customersRes.json()
        const jobsData = await jobsRes.json()

        if (customersData.customers) {
          setCustomers(customersData.customers)
        }
        if (jobsData.jobs) {
          setJobs(jobsData.jobs)

          // If job_id provided, set customer from job
          if (jobId) {
            const job = jobsData.jobs.find((j: Job) => j.id === jobId)
            if (job) {
              setFormData(prev => ({
                ...prev,
                customer_id: job.customer_id,
                job_id: job.id,
              }))
            }
          }
        }
      } catch {
        // Data fetch failed - form will show empty lists
      } finally {
        setLoadingCustomers(false)
        setLoadingJobs(false)
      }
    }
    fetchData()
  }, [jobId])

  // Update customer when job changes
  useEffect(() => {
    if (formData.job_id) {
      const job = jobs.find(j => j.id === formData.job_id)
      if (job && !formData.customer_id) {
        setFormData(prev => ({ ...prev, customer_id: job.customer_id }))
      }
    }
  }, [formData.job_id, jobs, formData.customer_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.customer_id) {
      toast({ title: 'Error', description: 'Please select a customer', variant: 'destructive' })
      return
    }

    setLoading(true)

    try {
      let invoice

      if (formData.job_id) {
        // Create from job
        const response = await fetch('/api/invoices/from-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: formData.job_id,
            due_days: Math.ceil((formData.due_date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            include_change_orders: true,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create invoice')
        }

        invoice = await response.json()
      } else {
        // Create blank invoice
        const response = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_id: formData.customer_id,
            due_date: format(formData.due_date, 'yyyy-MM-dd'),
            payment_terms: formData.payment_terms || undefined,
            tax_rate: formData.tax_rate ? parseFloat(formData.tax_rate) / 100 : undefined,
            notes: formData.notes || undefined,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create invoice')
        }

        invoice = await response.json()
      }

      toast({ title: 'Invoice created', description: `Invoice ${invoice.invoice_number} has been created` })
      router.push(`/invoices/${invoice.id}`)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create invoice',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const completedJobs = jobs.filter(j => j.status === 'completed')

  return (
    <div className="container py-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild aria-label="Back to invoices">
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Invoice</h1>
          <p className="text-muted-foreground">
            Create an invoice for a customer
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Customer Selection */}
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

              {completedJobs.length > 0 && (
                <div className="space-y-2">
                  <Label>Link to Job (Optional)</Label>
                  <Select
                    value={formData.job_id || 'none'}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, job_id: value === 'none' ? '' : value }))}
                    disabled={loadingJobs}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a completed job" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No job (blank invoice)</SelectItem>
                      {completedJobs
                        .filter(job => !formData.customer_id || job.customer_id === formData.customer_id)
                        .map(job => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.job_number} - {job.job_address}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Linking to a job will auto-populate line items from the job
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Due Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !formData.due_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.due_date ? format(formData.due_date, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.due_date}
                        onSelect={(date) => date && setFormData(prev => ({ ...prev, due_date: date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select
                    value={formData.payment_terms}
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, payment_terms: value }))
                      // Update due date based on terms
                      const days = parseInt(value.replace('Net ', '')) || 30
                      setFormData(prev => ({ ...prev, due_date: addDays(new Date(), days) }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                      <SelectItem value="Net 15">Net 15</SelectItem>
                      <SelectItem value="Net 30">Net 30</SelectItem>
                      <SelectItem value="Net 45">Net 45</SelectItem>
                      <SelectItem value="Net 60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!formData.job_id && (
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_rate: e.target.value }))}
                    placeholder="e.g., 8.25"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Notes to appear on the invoice"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button type="button" variant="outline" asChild className="flex-1">
              <Link href="/invoices">Cancel</Link>
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
