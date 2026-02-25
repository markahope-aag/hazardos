'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Trash2 } from 'lucide-react'

interface Invitation {
  id: string
  email: string
  role: string
  invited_by: string
  expires_at: string
  created_at: string
}

interface PendingInvitationsProps {
  invitations: Invitation[]
  onRevoked?: () => void
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function PendingInvitations({ invitations, onRevoked }: PendingInvitationsProps) {
  const { toast } = useToast()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function handleRevoke(id: string) {
    setRevokingId(id)
    try {
      const response = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        toast({
          title: 'Error',
          description: 'Failed to revoke invitation',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Invitation revoked',
        description: 'The invitation has been revoked.',
      })
      onRevoked?.()
    } catch {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setRevokingId(null)
    }
  }

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No pending invitations.</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Sent</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead className="w-[80px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell className="font-medium">{invitation.email}</TableCell>
            <TableCell>
              <Badge variant="outline">{formatRole(invitation.role)}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(invitation.created_at)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(invitation.expires_at)}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRevoke(invitation.id)}
                disabled={revokingId === invitation.id}
                title="Revoke invitation"
              >
                {revokingId === invitation.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 text-destructive" />
                )}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
