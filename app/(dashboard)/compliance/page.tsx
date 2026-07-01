'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ShieldAlert, ShieldCheck, Clock, Plus, Loader2 } from 'lucide-react'
import { usePermissions } from '@/lib/hooks/use-multi-tenant-auth'
import {
  useCredentials,
  useCredentialTypes,
  useTeamMembers,
  useCreateCredential,
  type CredentialFilters,
} from '@/lib/hooks/use-credentials'
import { CredentialStatusBadge } from '@/components/compliance/credential-status-badge'
import type { CredentialStatus } from '@/lib/validations/credential'

const MANAGE_ROLES = ['admin', 'tenant_owner', 'platform_owner', 'platform_admin']

export default function CompliancePage() {
  const { hasRole } = usePermissions()
  const canManage = hasRole(MANAGE_ROLES)

  const [statusFilter, setStatusFilter] = useState<CredentialStatus | 'all'>('all')
  const filters: CredentialFilters = statusFilter === 'all' ? {} : { status: statusFilter }
  const { data: credentials = [], isLoading } = useCredentials(filters)
  const { data: allCredentials = [] } = useCredentials({})

  const stats = useMemo(() => {
    const expired = allCredentials.filter((c) => c.status === 'expired').length
    const expiring = allCredentials.filter((c) => c.status === 'expiring_soon').length
    return { expired, expiring, total: allCredentials.length }
  }, [allCredentials])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compliance</h1>
          <p className="text-sm text-muted-foreground">
            Worker credentials, expirations, and job-readiness.
          </p>
        </div>
        {canManage && <AddCredentialDialog />}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Expired"
          value={stats.expired}
          icon={<ShieldAlert className="h-5 w-5 text-red-600" />}
          accent="text-red-600"
        />
        <StatCard
          label="Expiring soon"
          value={stats.expiring}
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          accent="text-amber-600"
        />
        <StatCard
          label="Tracked credentials"
          value={stats.total}
          icon={<ShieldCheck className="h-5 w-5 text-emerald-600" />}
          accent="text-foreground"
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Credentials</CardTitle>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CredentialStatus | 'all')}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="expiring_soon">Expiring soon</SelectItem>
              <SelectItem value="valid">Valid</SelectItem>
              <SelectItem value="no_expiry">No expiry</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : credentials.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No credentials match this filter.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker</TableHead>
                  <TableHead>Credential</TableHead>
                  <TableHead>Identifier</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {credentials.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.worker_name ?? '—'}</TableCell>
                    <TableCell>{c.credential_type_name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.identifier ?? '—'}</TableCell>
                    <TableCell>{c.expiry_date ?? '—'}</TableCell>
                    <TableCell>
                      <CredentialStatusBadge status={c.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className={`text-3xl font-semibold ${accent}`}>{value}</p>
        </div>
        {icon}
      </CardContent>
    </Card>
  )
}

function AddCredentialDialog() {
  const [open, setOpen] = useState(false)
  const { data: types = [] } = useCredentialTypes({ activeOnly: true })
  const { data: members = [] } = useTeamMembers()
  const createCredential = useCreateCredential()

  const [form, setForm] = useState({
    worker_id: '',
    credential_type_id: '',
    identifier: '',
    issued_date: '',
    expiry_date: '',
  })

  const memberName = (m: { first_name: string | null; last_name: string | null; email: string }) =>
    [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email

  // Auto-suggest an expiry when a type with default_valid_days + issue date is set.
  const onTypeChange = (typeId: string) => {
    setForm((prev) => {
      const type = types.find((t) => t.id === typeId)
      let expiry = prev.expiry_date
      if (type?.default_valid_days && prev.issued_date && !prev.expiry_date) {
        const d = new Date(`${prev.issued_date}T00:00:00Z`)
        d.setUTCDate(d.getUTCDate() + type.default_valid_days)
        expiry = d.toISOString().slice(0, 10)
      }
      return { ...prev, credential_type_id: typeId, expiry_date: expiry }
    })
  }

  const canSubmit = form.worker_id && form.credential_type_id && !createCredential.isPending

  const handleSubmit = async () => {
    await createCredential.mutateAsync({
      worker_id: form.worker_id,
      credential_type_id: form.credential_type_id,
      identifier: form.identifier || undefined,
      issued_date: form.issued_date || undefined,
      expiry_date: form.expiry_date || undefined,
    })
    setForm({ worker_id: '', credential_type_id: '', identifier: '', issued_date: '', expiry_date: '' })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add credential
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add credential</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Worker</Label>
            <Select value={form.worker_id} onValueChange={(v) => setForm((p) => ({ ...p, worker_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select worker" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {memberName(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Credential type</Label>
            <Select value={form.credential_type_id} onValueChange={onTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Identifier (license / cert number)</Label>
            <Input
              value={form.identifier}
              onChange={(e) => setForm((p) => ({ ...p, identifier: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Issued</Label>
              <Input
                type="date"
                value={form.issued_date}
                onChange={(e) => setForm((p) => ({ ...p, issued_date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Expires</Label>
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm((p) => ({ ...p, expiry_date: e.target.value }))}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {createCredential.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
