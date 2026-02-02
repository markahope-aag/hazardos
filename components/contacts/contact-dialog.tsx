'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import type { CustomerContact, ContactRole, ContactMethod } from '@/types/contacts'
import { contactRoleConfig, contactMethodConfig } from '@/types/contacts'

interface ContactDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  customerId: string
  contact?: CustomerContact | null
}

export function ContactDialog({
  open,
  onClose,
  onSuccess,
  customerId,
  contact,
}: ContactDialogProps) {
  const { toast } = useToast()
  const isEdit = !!contact
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<{name?: string; email?: string}>({})

  // Form state
  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [mobile, setMobile] = useState('')
  const [role, setRole] = useState<ContactRole>('general')
  const [isPrimary, setIsPrimary] = useState(false)
  const [preferredMethod, setPreferredMethod] = useState<ContactMethod | ''>('')
  const [notes, setNotes] = useState('')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (contact) {
        setName(contact.name)
        setTitle(contact.title || '')
        setEmail(contact.email || '')
        setPhone(contact.phone || '')
        setMobile(contact.mobile || '')
        setRole(contact.role)
        setIsPrimary(contact.is_primary)
        setPreferredMethod(contact.preferred_contact_method || '')
        setNotes(contact.notes || '')
      } else {
        setName('')
        setTitle('')
        setEmail('')
        setPhone('')
        setMobile('')
        setRole('general')
        setIsPrimary(false)
        setPreferredMethod('')
        setNotes('')
      }
      setError(null)
    }
  }, [open, contact])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setValidationErrors({})

    // Validate required fields
    const errors: {name?: string; email?: string} = {}
    if (!name.trim()) errors.name = 'Name is required'
    if (email && !/\S+@\S+\.\S+/.test(email)) errors.email = 'Please enter a valid email address'

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const payload = {
        name: name.trim(),
        title: title.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        mobile: mobile.trim() || null,
        role,
        is_primary: isPrimary,
        preferred_contact_method: preferredMethod || null,
        notes: notes.trim() || null,
      }

      const url = isEdit
        ? `/api/customers/${customerId}/contacts/${contact.id}`
        : `/api/customers/${customerId}/contacts`

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save contact')
      }

      toast({
        title: isEdit ? 'Contact updated' : 'Contact added',
        description: `${name} has been ${isEdit ? 'updated' : 'added'} successfully.`,
      })
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the contact information below.'
              : 'Add a new contact for this customer.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  aria-invalid={!!validationErrors.name}
                  aria-describedby={validationErrors.name ? 'name-error' : undefined}
                />
                {validationErrors.name && (
                  <p id="name-error" className="text-sm text-destructive mt-1" role="alert">
                    {validationErrors.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Project Manager"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                aria-invalid={!!validationErrors.email}
                aria-describedby={validationErrors.email ? 'email-error' : undefined}
              />
              {validationErrors.email && (
                <p id="email-error" className="text-sm text-destructive mt-1" role="alert">
                  {validationErrors.email}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="(555) 987-6543"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={role} onValueChange={(val) => setRole(val as ContactRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(contactRoleConfig) as ContactRole[]).map((r) => (
                      <SelectItem key={r} value={r}>
                        {contactRoleConfig[r].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredMethod">Preferred Contact</Label>
                <Select
                  value={preferredMethod}
                  onValueChange={(val) => setPreferredMethod(val as ContactMethod | '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No preference</SelectItem>
                    {(Object.keys(contactMethodConfig) as ContactMethod[]).map((m) => (
                      <SelectItem key={m} value={m}>
                        {contactMethodConfig[m].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPrimary"
                checked={isPrimary}
                onCheckedChange={(checked) => setIsPrimary(checked === true)}
              />
              <Label htmlFor="isPrimary" className="font-normal cursor-pointer">
                Set as primary contact
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this contact..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Add Contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
