'use client'

import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Zap, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { logger, formatError } from '@/lib/utils/logger'

/**
 * The whole point: four fields, one tap, done — for a technician in the
 * field who has seconds between appointments, not the ten fields
 * "Schedule Site Survey" asks for. Replaces calling or emailing the office
 * to have someone else re-enter it.
 *
 * Deliberately does not create or match a `customers` row. `site_surveys`
 * already has customer_name/customer_email columns for exactly this case —
 * customer_id stays null, and the office links it to a real contact record
 * (existing or new) when they do the full scheduling pass. Forcing a
 * customer match here would turn a 10-second entry back into a search.
 */
export function QuickCreateAppointmentButton({ onCreated }: { onCreated?: () => void } = {}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Zap className="h-4 w-4 mr-2" />
          Quick Add
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Quick Add Appointment</DialogTitle>
        </DialogHeader>
        <QuickCreateAppointmentForm
          onSuccess={() => {
            setOpen(false)
            onCreated?.()
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

const HAZARD_TYPES = [
  { value: 'asbestos', label: 'Asbestos' },
  { value: 'mold', label: 'Mold' },
  { value: 'lead', label: 'Lead' },
  { value: 'vermiculite', label: 'Vermiculite' },
  { value: 'other', label: 'Other' },
]

function QuickCreateAppointmentForm({ onSuccess }: { onSuccess: () => void }) {
  const router = useRouter()
  const { toast } = useToast()
  const { organization, profile } = useMultiTenantAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [hazardType, setHazardType] = useState('other')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!organization?.id) {
      toast({ title: 'Error', description: 'Organization not found.', variant: 'destructive' })
      return
    }
    if (!name.trim() || !address.trim()) {
      toast({ title: 'Error', description: 'Name and address are required.', variant: 'destructive' })
      return
    }

    setIsLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('site_surveys').insert({
        organization_id: organization.id,
        job_name: `Appointment - ${name.trim()}`,
        customer_name: name.trim(),
        customer_email: email.trim() || null,
        site_address: address.trim(),
        // Structured address isn't part of the quick form — left blank for
        // the office to fill in on the full scheduling pass, same as
        // customer_id.
        site_city: '',
        site_state: '',
        site_zip: '',
        hazard_type: hazardType,
        status: 'draft',
        created_by: profile?.id ?? null,
      })

      if (error) throw error

      toast({
        title: 'Appointment added',
        description: 'Finish scheduling it from the site surveys list when you have a minute.',
      })
      setName('')
      setAddress('')
      setEmail('')
      setHazardType('other')
      router.refresh()
      onSuccess()
    } catch (error) {
      logger.error(
        { error: formatError(error, 'QUICK_APPOINTMENT_CREATE_ERROR'), organizationId: organization?.id },
        'Error creating quick appointment'
      )
      const message =
        (error as { message?: string } | null)?.message || 'Failed to add appointment. Please try again.'
      toast({ title: 'Could not add it', description: message, variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="qa-name">Name *</Label>
        <Input
          id="qa-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Customer name"
          required
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="qa-address">Address *</Label>
        <Input
          id="qa-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, Madison"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="qa-type">Type *</Label>
        <Select value={hazardType} onValueChange={setHazardType}>
          <SelectTrigger id="qa-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HAZARD_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="qa-email">Email</Label>
        <Input
          id="qa-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="customer@example.com"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Adding...
          </>
        ) : (
          'Add Appointment'
        )}
      </Button>
    </form>
  )
}
