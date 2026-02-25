'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  role: string
  last_sign_in_at: string | null
}

interface TeamMemberListProps {
  members: TeamMember[]
}

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  tenant_owner: 'default',
  admin: 'default',
  estimator: 'secondary',
  technician: 'secondary',
  viewer: 'outline',
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function TeamMemberList({ members }: TeamMemberListProps) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No team members found.</p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Last Login</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="font-medium">
              {member.full_name || 'Unknown'}
            </TableCell>
            <TableCell>{member.email || '—'}</TableCell>
            <TableCell>
              <Badge variant={roleBadgeVariant[member.role] || 'outline'}>
                {formatRole(member.role)}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDate(member.last_sign_in_at)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
