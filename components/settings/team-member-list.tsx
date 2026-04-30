'use client'

import { useMemo, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  MoreHorizontal,
  Pencil,
  KeyRound,
  UserMinus,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface TeamMember {
  id: string
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
  role: string
  last_login_at: string | null
}

type SortColumn = 'name' | 'email' | 'phone' | 'role' | 'last_login_at'
type SortDirection = 'asc' | 'desc'

const ROLE_ORDER: Record<string, number> = {
  tenant_owner: 0,
  admin: 1,
  estimator: 2,
  technician: 3,
  viewer: 4,
}

function memberFullName(m: TeamMember): string {
  return [m.first_name, m.last_name].filter(Boolean).join(' ').trim()
}

function compareMembers(
  a: TeamMember,
  b: TeamMember,
  column: SortColumn,
  direction: SortDirection,
): number {
  const dir = direction === 'asc' ? 1 : -1

  const compareStrings = (av: string, bv: string) => {
    const aEmpty = av === ''
    const bEmpty = bv === ''
    if (aEmpty && !bEmpty) return 1
    if (!aEmpty && bEmpty) return -1
    return av.localeCompare(bv) * dir
  }

  switch (column) {
    case 'name':
      return compareStrings(memberFullName(a).toLowerCase(), memberFullName(b).toLowerCase())
    case 'email':
      return compareStrings((a.email ?? '').toLowerCase(), (b.email ?? '').toLowerCase())
    case 'phone':
      return compareStrings(a.phone ?? '', b.phone ?? '')
    case 'role': {
      const ar = ROLE_ORDER[a.role] ?? 99
      const br = ROLE_ORDER[b.role] ?? 99
      return (ar - br) * dir
    }
    case 'last_login_at': {
      // Never-logged-in goes last regardless of direction.
      const at = a.last_login_at ? new Date(a.last_login_at).getTime() : null
      const bt = b.last_login_at ? new Date(b.last_login_at).getTime() : null
      if (at === null && bt === null) return 0
      if (at === null) return 1
      if (bt === null) return -1
      return (at - bt) * dir
    }
  }
}

interface TeamMemberListProps {
  members: TeamMember[]
  currentUserId: string
  currentUserRole: string
  canManage: boolean
  onChanged: () => void
}

const roleBadgeVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  tenant_owner: 'default',
  admin: 'default',
  estimator: 'secondary',
  technician: 'secondary',
  viewer: 'outline',
}

const ASSIGNABLE_ROLES: { value: string; label: string }[] = [
  { value: 'tenant_owner', label: 'Tenant Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'estimator', label: 'Estimator' },
  { value: 'technician', label: 'Technician' },
  { value: 'viewer', label: 'Viewer' },
]

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

export function TeamMemberList({
  members,
  currentUserId,
  currentUserRole,
  canManage,
  onChanged,
}: TeamMemberListProps) {
  const { toast } = useToast()

  const [editTarget, setEditTarget] = useState<TeamMember | null>(null)
  const [editFirstName, setEditFirstName] = useState('')
  const [editLastName, setEditLastName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState('')
  const [saving, setSaving] = useState(false)

  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null)
  const [resetTarget, setResetTarget] = useState<TeamMember | null>(null)
  const [actionPending, setActionPending] = useState(false)

  const [sortColumn, setSortColumn] = useState<SortColumn>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => compareMembers(a, b, sortColumn, sortDirection))
  }, [members, sortColumn, sortDirection])

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (column !== sortColumn) {
      return <ArrowUpDown className="h-3.5 w-3.5 ml-1 inline opacity-40" />
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 ml-1 inline" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 ml-1 inline" />
    )
  }

  const sortableHeaderClass =
    'cursor-pointer select-none hover:text-foreground transition-colors'

  const isOwnerLike =
    currentUserRole === 'tenant_owner' ||
    currentUserRole === 'platform_owner' ||
    currentUserRole === 'platform_admin'

  // Caller can't act on their own row (self-edit goes through profile
  // settings) or on a tenant_owner unless they themselves hold that level.
  const canActOn = (m: TeamMember) => {
    if (!canManage) return false
    if (m.id === currentUserId) return false
    if (m.role === 'tenant_owner' && !isOwnerLike) return false
    return true
  }

  const openEdit = (m: TeamMember) => {
    setEditTarget(m)
    setEditFirstName(m.first_name ?? '')
    setEditLastName(m.last_name ?? '')
    setEditPhone(m.phone ?? '')
    setEditRole(m.role)
  }

  const handleSaveEdit = async () => {
    if (!editTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/team/${editTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: editFirstName.trim() || null,
          last_name: editLastName.trim() || null,
          phone: editPhone.trim() || null,
          role: editRole !== editTarget.role ? editRole : undefined,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message || 'Failed to update member')
      }
      toast({ title: 'Member updated' })
      setEditTarget(null)
      onChanged()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to update member',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setActionPending(true)
    try {
      const res = await fetch(`/api/team/${removeTarget.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error?.message || 'Failed to remove member')
      }
      toast({
        title: 'Member deactivated',
        description: 'Their sign-in access is revoked. Historical records are preserved.',
      })
      setRemoveTarget(null)
      onChanged()
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to remove member',
        variant: 'destructive',
      })
    } finally {
      setActionPending(false)
    }
  }

  const handleSendReset = async () => {
    if (!resetTarget) return
    setActionPending(true)
    try {
      const res = await fetch(
        `/api/team/${resetTarget.id}/send-password-reset`,
        { method: 'POST' },
      )
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body?.error?.message || 'Failed to send reset')
      }
      if (body.sent) {
        toast({
          title: 'Reset email sent',
          description: `${resetTarget.email} will receive a password reset link.`,
        })
      } else {
        // Email provider wasn't configured; show the admin the link
        // directly so they can hand it off manually.
        toast({
          title: 'Email not configured',
          description: body.action_link
            ? 'Copy the reset link from the server response.'
            : 'Could not generate a reset link.',
          variant: 'destructive',
        })
      }
      setResetTarget(null)
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Failed to send reset',
        variant: 'destructive',
      })
    } finally {
      setActionPending(false)
    }
  }

  if (members.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">No team members found.</p>
    )
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className={sortableHeaderClass}
              onClick={() => handleSort('name')}
              aria-sort={
                sortColumn === 'name'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              Name
              <SortIcon column="name" />
            </TableHead>
            <TableHead
              className={sortableHeaderClass}
              onClick={() => handleSort('email')}
              aria-sort={
                sortColumn === 'email'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              Email
              <SortIcon column="email" />
            </TableHead>
            <TableHead
              className={sortableHeaderClass}
              onClick={() => handleSort('phone')}
              aria-sort={
                sortColumn === 'phone'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              Phone
              <SortIcon column="phone" />
            </TableHead>
            <TableHead
              className={sortableHeaderClass}
              onClick={() => handleSort('role')}
              aria-sort={
                sortColumn === 'role'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              Role
              <SortIcon column="role" />
            </TableHead>
            <TableHead
              className={sortableHeaderClass}
              onClick={() => handleSort('last_login_at')}
              aria-sort={
                sortColumn === 'last_login_at'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              Last Login
              <SortIcon column="last_login_at" />
            </TableHead>
            {canManage && <TableHead className="w-10" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedMembers.map((member) => {
            const actionable = canActOn(member)
            return (
              <TableRow key={member.id}>
                <TableCell className="font-medium">
                  {memberFullName(member) || 'Unknown'}
                  {member.id === currentUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  )}
                </TableCell>
                <TableCell>{member.email || '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {member.phone || '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={roleBadgeVariant[member.role] || 'outline'}>
                    {formatRole(member.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(member.last_login_at)}
                </TableCell>
                {canManage && (
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Actions for ${member.email || member.id}`}
                          disabled={!actionable}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(member)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setResetTarget(member)}
                          disabled={!member.email}
                        >
                          <KeyRound className="h-4 w-4 mr-2" />
                          Send password reset
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setRemoveTarget(member)}
                          className="text-destructive focus:text-destructive"
                        >
                          <UserMinus className="h-4 w-4 mr-2" />
                          Remove from team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      {/* Edit dialog */}
      <Dialog open={editTarget !== null} onOpenChange={(v) => !v && setEditTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit team member</DialogTitle>
            <DialogDescription>
              {editTarget?.email || 'Update name and role.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">First name</Label>
                <Input
                  id="edit-first-name"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">Last name</Label>
                <Input
                  id="edit-last-name"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem
                      key={r.value}
                      value={r.value}
                      disabled={r.value === 'tenant_owner' && !isOwnerLike}
                    >
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditTarget(null)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from team?</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget?.email} will lose sign-in access. Their historical
              records (jobs, surveys, estimates) stay intact — only their
              account is deactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={actionPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Password reset confirmation */}
      <AlertDialog
        open={resetTarget !== null}
        onOpenChange={(v) => !v && setResetTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send password reset?</AlertDialogTitle>
            <AlertDialogDescription>
              An email with a password reset link will be sent to{' '}
              {resetTarget?.email}. They'll be able to choose a new password
              from that link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendReset} disabled={actionPending}>
              {actionPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Send email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
