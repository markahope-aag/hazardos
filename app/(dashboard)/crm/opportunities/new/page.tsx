'use client'

import { useState, useEffect, useMemo } from 'react'
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
import { ArrowLeft, CalendarIcon, Loader2, Search, Building2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import Link from 'next/link'

interface Customer {
  id: string
  name: string
  company_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip: string | null
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
  const [contactSearch, setContactSearch] = useState('')

  const [formData, setFormData] = useState({
    customer_id: '',
    name: '',
    description: '',
    stage_id: '',
    estimated_value: '',
    expected_close_date: undefined as Date | undefined,
    site_address: '',
    site_city: '',
    site_state: '',
    site_zip: '',
  })

  useEffect(() => {
    async function fetchData() {
      try {
        const [customersRes, stagesRes] = await Promise.all([
          fetch('/api/customers?limit=500'),
          fetch('/api/pipeline/stages'),
        ])

        const customersData = await customersRes.json()
        const stagesData = await stagesRes.json()

        if (customersData.customers) {
          setCustomers(customersData.customers)
        } else if (Array.isArray(customersData)) {
          setCustomers(customersData)
        }
        if (Array.isArray(stagesData)) {
          setStages(stagesData)
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
          site_address: formData.site_address || undefined,
          site_city: formData.site_city || undefined,
          site_state: formData.site_state || undefined,
          site_zip: formData.site_zip || undefined,
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
      router.push('/crm/opportunities')
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

  const selectedCustomer = customers.find(c => c.id === formData.customer_id)

  const filteredCustomers = useMemo(() => {
    if (!contactSearch) return customers
    const q = contactSearch.toLowerCase()
    return customers.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.first_name || '').toLowerCase().includes(q) ||
      (c.last_name || '').toLowerCase().includes(q) ||
      (c.company_name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q)
    )
  }, [customers, contactSearch])

  const handleSelectCustomer = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId)
    setFormData(prev => ({
      ...prev,
      customer_id: customerId,
      // Auto-fill address from customer if empty
      site_address: prev.site_address || customer?.address_line1 || '',
      site_city: prev.site_city || customer?.city || '',
      site_state: prev.site_state || customer?.state || '',
      site_zip: prev.site_zip || customer?.zip || '',
    }))
  }

  const selectedStage = stages.find(s => s.id === formData.stage_id)
  const weightedValue = formData.estimated_value && selectedStage
    ? parseFloat(formData.estimated_value) * (selectedStage.probability / 100)
    : 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="icon" asChild aria-label="Back to opportunities">
          <Link href="/crm/opportunities">
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
            <CardHeader><CardTitle>Contact & Location</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Select Contact *</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={contactSearch}
                    onChange={(e) => setContactSearch(e.target.value)}
                    placeholder={loadingData ? 'Loading contacts...' : 'Search by name, company, or email...'}
                    className="pl-9"
                    disabled={loadingData}
                  />
                </div>
                {/* Inline results list — the previous version hid matches inside
                    a closed Select dropdown, so typing in the search box looked
                    like it did nothing until you remembered to click the hidden
                    dropdown. This surfaces matches directly. */}
                <div className="max-h-64 overflow-y-auto rounded-md border">
                  {loadingData ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">Loading contacts…</div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                      {contactSearch ? 'No contacts match your search' : 'No contacts yet — create one first'}
                    </div>
                  ) : (
                    <ul className="divide-y">
                      {filteredCustomers.slice(0, 50).map((customer) => {
                        const displayName = [customer.first_name, customer.last_name].filter(Boolean).join(' ') || customer.name
                        const isSelected = customer.id === formData.customer_id
                        return (
                          <li key={customer.id}>
                            <button
                              type="button"
                              onClick={() => handleSelectCustomer(customer.id)}
                              className={cn(
                                'w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between gap-2',
                                isSelected && 'bg-accent',
                              )}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate">{displayName || 'Unnamed'}</div>
                                <div className="text-xs text-muted-foreground truncate flex items-center gap-2">
                                  {customer.company_name && (
                                    <span className="inline-flex items-center gap-1">
                                      <Building2 className="h-3 w-3" />
                                      {customer.company_name}
                                    </span>
                                  )}
                                  {customer.email && <span>{customer.email}</span>}
                                </div>
                              </div>
                              {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
                {filteredCustomers.length > 50 && (
                  <p className="text-xs text-muted-foreground">
                    Showing first 50 of {filteredCustomers.length} — refine your search to see more.
                  </p>
                )}
              </div>

              {/* Selected contact info */}
              {selectedCustomer && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                  <div className="font-medium">
                    {[selectedCustomer.first_name, selectedCustomer.last_name].filter(Boolean).join(' ') || selectedCustomer.name}
                  </div>
                  {selectedCustomer.company_name && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Building2 className="h-3 w-3" />{selectedCustomer.company_name}
                    </div>
                  )}
                  {selectedCustomer.email && (
                    <div className="text-muted-foreground">{selectedCustomer.email}</div>
                  )}
                </div>
              )}

              {/* Site Address */}
              <div className="space-y-2 pt-2">
                <Label>Site / Property Address</Label>
                <Input
                  value={formData.site_address}
                  onChange={(e) => setFormData(prev => ({ ...prev, site_address: e.target.value }))}
                  placeholder="Street address"
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={formData.site_city}
                    onChange={(e) => setFormData(prev => ({ ...prev, site_city: e.target.value }))}
                    placeholder="City"
                  />
                  <Input
                    value={formData.site_state}
                    onChange={(e) => setFormData(prev => ({ ...prev, site_state: e.target.value }))}
                    placeholder="State"
                    maxLength={2}
                  />
                  <Input
                    value={formData.site_zip}
                    onChange={(e) => setFormData(prev => ({ ...prev, site_zip: e.target.value }))}
                    placeholder="ZIP"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Opportunity Details</CardTitle></CardHeader>
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
                  <SelectTrigger><SelectValue placeholder="Select a stage" /></SelectTrigger>
                  <SelectContent>
                    {stages.map(stage => (
                      <SelectItem key={stage.id} value={stage.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
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
            <CardHeader><CardTitle>Value & Timeline</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Value ($)</Label>
                  <Input
                    type="number" min="0" step="100"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
                    placeholder="e.g., 50000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weighted Value</Label>
                  <Input
                    value={weightedValue.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })}
                    disabled className="bg-muted"
                  />
                  {selectedStage && (
                    <p className="text-xs text-muted-foreground">Based on {selectedStage.probability}% probability</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expected Close Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !formData.expected_close_date && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expected_close_date ? format(formData.expected_close_date, 'PPP') : 'Pick a date'}
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
              <Link href="/crm/opportunities">Cancel</Link>
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
