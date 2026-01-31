'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useMultiTenantAuth } from '@/lib/hooks/use-multi-tenant-auth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { CustomerCombobox } from '@/components/customers/customer-combobox'
import { Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Technician {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

export function CreateSurveyButton() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Survey
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Site Survey</DialogTitle>
        </DialogHeader>
        <CreateSurveyForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}

function CreateSurveyForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const { organization } = useMultiTenantAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [customerId, setCustomerId] = useState<string>('')
  const [technicianId, setTechnicianId] = useState<string>('')
  const [scheduledDate, setScheduledDate] = useState<string>('')
  const [scheduledTimeStart, setScheduledTimeStart] = useState<string>('')
  const [scheduledTimeEnd, setScheduledTimeEnd] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [technicians, setTechnicians] = useState<Technician[]>([])

  // Load technicians on mount
  useEffect(() => {
    async function loadTechnicians() {
      if (!organization?.id) return

      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('organization_id', organization.id)
        .in('role', ['technician', 'admin', 'estimator'])
        .eq('is_active', true)

      setTechnicians(data || [])
    }
    loadTechnicians()
  }, [organization?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!organization?.id) {
      toast({
        title: 'Error',
        description: 'Organization not found.',
        variant: 'destructive',
      })
      return
    }

    if (!customerId || !scheduledDate || !technicianId) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Get customer details for address
      const { data: customer } = await supabase
        .from('customers')
        .select('company_name, first_name, last_name, email, phone, address, city, state, zip')
        .eq('id', customerId)
        .single()

      if (!customer) {
        throw new Error('Customer not found')
      }

      const customerName = customer.company_name || `${customer.first_name} ${customer.last_name}`

      const { data, error } = await supabase
        .from('site_surveys')
        .insert({
          organization_id: organization.id,
          customer_id: customerId,
          assigned_to: technicianId,
          scheduled_date: scheduledDate,
          scheduled_time_start: scheduledTimeStart || null,
          scheduled_time_end: scheduledTimeEnd || null,
          status: 'scheduled',
          notes,
          // Pre-fill from customer
          customer_name: customerName,
          customer_email: customer.email,
          customer_phone: customer.phone,
          site_address: customer.address || '',
          site_city: customer.city || '',
          site_state: customer.state || '',
          site_zip: customer.zip || '',
          job_name: `Survey - ${customerName}`,
          hazard_type: 'other', // Will be determined during survey
          appointment_status: 'scheduled',
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: 'Survey scheduled',
        description: 'The site survey has been scheduled successfully.',
      })

      router.refresh()
      onSuccess()
    } catch (error) {
      console.error('Error creating survey:', error)
      toast({
        title: 'Error',
        description: 'Failed to schedule survey. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getTechnicianName = (tech: Technician) => {
    if (tech.first_name || tech.last_name) {
      return `${tech.first_name || ''} ${tech.last_name || ''}`.trim()
    }
    return tech.email
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer">Customer *</Label>
        <CustomerCombobox
          value={customerId}
          onValueChange={setCustomerId}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Scheduled Date *</Label>
        <Input
          id="date"
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          required
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="time-start">Start Time</Label>
          <Input
            id="time-start"
            type="time"
            value={scheduledTimeStart}
            onChange={(e) => setScheduledTimeStart(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time-end">End Time</Label>
          <Input
            id="time-end"
            type="time"
            value={scheduledTimeEnd}
            onChange={(e) => setScheduledTimeEnd(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="technician">Assigned Technician *</Label>
        <Select value={technicianId} onValueChange={setTechnicianId} required>
          <SelectTrigger>
            <SelectValue placeholder="Select technician" />
          </SelectTrigger>
          <SelectContent>
            {technicians.map((tech) => (
              <SelectItem key={tech.id} value={tech.id}>
                {getTechnicianName(tech)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Special instructions, access codes, etc."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading || !customerId || !technicianId || !scheduledDate}>
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Scheduling...
            </>
          ) : (
            'Schedule Survey'
          )}
        </Button>
      </div>
    </form>
  )
}
