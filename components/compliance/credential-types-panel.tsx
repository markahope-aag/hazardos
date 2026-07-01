'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Plus, MoreHorizontal, Pencil, Power, Trash2 } from 'lucide-react'
import {
  useCredentialTypes,
  useUpdateCredentialType,
  useDeleteCredentialType,
  type CredentialTypeDTO,
} from '@/lib/hooks/use-credentials'
import { credentialCategoryLabel, requiredForSummary } from '@/lib/credentials/vocab'
import { CredentialTypeFormDialog } from './credential-type-form-dialog'

export function CredentialTypesPanel() {
  const { data: types = [], isLoading } = useCredentialTypes({ activeOnly: false })
  const updateType = useUpdateCredentialType()
  const deleteType = useDeleteCredentialType()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CredentialTypeDTO | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CredentialTypeDTO | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (type: CredentialTypeDTO) => {
    setEditing(type)
    setFormOpen(true)
  }

  const toggleActive = (type: CredentialTypeDTO) =>
    updateType.mutate({ id: type.id, input: { is_active: !type.is_active } })

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteType.mutateAsync(deleteTarget.id)
    } finally {
      // On failure the mutation surfaces a toast; either way close the dialog.
      setDeleteTarget(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          The catalog of credentials your team tracks. Mark a type “required for” a job profile to
          gate crew assignments.
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New type
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : types.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No credential types yet. Create one to start tracking worker compliance.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Required for</TableHead>
                  <TableHead className="text-right">Validity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => {
                  const required = requiredForSummary(
                    type.required_for_containment_levels,
                    type.required_for_hazard_types,
                  )
                  return (
                    <TableRow key={type.id} className={type.is_active ? '' : 'opacity-60'}>
                      <TableCell className="font-medium">
                        {type.name}
                        {type.issuing_authority && (
                          <span className="block text-xs text-muted-foreground">
                            {type.issuing_authority}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {credentialCategoryLabel(type.category)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {required || <span className="text-muted-foreground/60">—</span>}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {type.default_valid_days ? `${type.default_valid_days}d` : '—'}
                      </TableCell>
                      <TableCell>
                        {type.is_active ? (
                          <Badge variant="secondary">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" aria-label={`Actions for ${type.name}`}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(type)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(type)}>
                              <Power className="mr-2 h-4 w-4" />
                              {type.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => setDeleteTarget(type)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CredentialTypeFormDialog open={formOpen} onOpenChange={setFormOpen} type={editing} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the credential type. If any worker credentials still use it,
              the delete is blocked — deactivate it instead to keep the history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteType.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                confirmDelete()
              }}
              disabled={deleteType.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
