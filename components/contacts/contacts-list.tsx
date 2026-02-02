'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  MoreVertical,
  Star,
  Phone,
  Mail,
  User,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react'
import { ContactDialog } from './contact-dialog'
import { useToast } from '@/components/ui/use-toast'
import type { CustomerContact, ContactRole } from '@/types/contacts'
import { contactRoleConfig } from '@/types/contacts'

interface ContactsListProps {
  customerId: string
}

const roleColors: Record<ContactRole, string> = {
  primary: 'bg-blue-100 text-blue-800',
  billing: 'bg-green-100 text-green-800',
  site: 'bg-orange-100 text-orange-800',
  scheduling: 'bg-purple-100 text-purple-800',
  general: 'bg-gray-100 text-gray-800',
}

export function ContactsList({ customerId }: ContactsListProps) {
  const { toast } = useToast()
  const [contacts, setContacts] = useState<CustomerContact[]>([])
  const [loading, setLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null)
  const [deleteContact, setDeleteContact] = useState<CustomerContact | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchContacts()
  }, [customerId])

  async function fetchContacts() {
    try {
      setLoading(true)
      const res = await fetch(`/api/customers/${customerId}/contacts`)
      if (res.ok) {
        const data = await res.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSetPrimary(contactId: string) {
    try {
      setActionLoading(contactId)
      const res = await fetch(`/api/customers/${customerId}/contacts/${contactId}/set-primary`, {
        method: 'POST',
      })
      if (res.ok) {
        await fetchContacts()
        toast({
          title: 'Primary contact updated',
          description: 'The contact has been set as primary.',
        })
      } else {
        throw new Error('Failed to update')
      }
    } catch (error) {
      console.error('Failed to set primary contact:', error)
      toast({
        title: 'Error',
        description: 'Failed to set primary contact.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  async function handleDelete() {
    if (!deleteContact) return

    try {
      setActionLoading(deleteContact.id)
      const res = await fetch(`/api/customers/${customerId}/contacts/${deleteContact.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await fetchContacts()
        toast({
          title: 'Contact deleted',
          description: `${deleteContact.name} has been removed.`,
        })
      } else {
        throw new Error('Failed to delete')
      }
    } catch (error) {
      console.error('Failed to delete contact:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete contact.',
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
      setDeleteContact(null)
    }
  }

  function handleEdit(contact: CustomerContact) {
    setEditingContact(contact)
    setShowDialog(true)
  }

  function handleDialogClose() {
    setShowDialog(false)
    setEditingContact(null)
  }

  function handleDialogSuccess() {
    handleDialogClose()
    fetchContacts()
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contacts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Contacts
            {contacts.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {contacts.length}
              </Badge>
            )}
          </CardTitle>
          <Button size="sm" onClick={() => setShowDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Contact
          </Button>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <div className="text-center py-8">
              <User className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No contacts added yet</p>
              <Button variant="link" onClick={() => setShowDialog(true)}>
                Add the first contact
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{contact.name}</span>
                      {contact.is_primary && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                      )}
                      <Badge className={roleColors[contact.role]} variant="secondary">
                        {contactRoleConfig[contact.role].label}
                      </Badge>
                    </div>
                    {contact.title && (
                      <p className="text-sm text-muted-foreground mb-1">{contact.title}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          {contact.email}
                        </a>
                      )}
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {contact.phone}
                        </a>
                      )}
                      {contact.mobile && contact.mobile !== contact.phone && (
                        <a
                          href={`tel:${contact.mobile}`}
                          className="flex items-center gap-1 hover:text-primary"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {contact.mobile} (mobile)
                        </a>
                      )}
                    </div>
                    {contact.notes && (
                      <p className="text-sm text-muted-foreground mt-2 italic">
                        {contact.notes}
                      </p>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={actionLoading === contact.id}
                        aria-label="Contact actions"
                      >
                        {actionLoading === contact.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreVertical className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(contact)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {!contact.is_primary && (
                        <DropdownMenuItem onClick={() => handleSetPrimary(contact.id)}>
                          <Star className="h-4 w-4 mr-2" />
                          Set as Primary
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteContact(contact)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <ContactDialog
        open={showDialog}
        onClose={handleDialogClose}
        onSuccess={handleDialogSuccess}
        customerId={customerId}
        contact={editingContact}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteContact} onOpenChange={() => setDeleteContact(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteContact?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
