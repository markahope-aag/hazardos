'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import {
  useCreateCredentialType,
  useUpdateCredentialType,
  type CredentialTypeDTO,
} from '@/lib/hooks/use-credentials'
import type { CreateCredentialTypeInput } from '@/lib/validations/credential'
import {
  CREDENTIAL_CATEGORY_OPTIONS,
  APPLIES_TO_OPTIONS,
  CONTAINMENT_LEVEL_OPTIONS,
  CREDENTIAL_HAZARD_OPTIONS,
} from '@/lib/credentials/vocab'

interface FormState {
  name: string
  category: string
  applies_to: string
  issuing_authority: string
  default_valid_days: string
  warning_lead_days: string
  required_for_containment_levels: string[]
  required_for_hazard_types: string[]
  is_active: boolean
}

const EMPTY: FormState = {
  name: '',
  category: 'other',
  applies_to: 'worker',
  issuing_authority: '',
  default_valid_days: '',
  warning_lead_days: '30',
  required_for_containment_levels: [],
  required_for_hazard_types: [],
  is_active: true,
}

function fromType(type: CredentialTypeDTO): FormState {
  return {
    name: type.name,
    category: type.category,
    applies_to: type.applies_to,
    issuing_authority: type.issuing_authority ?? '',
    default_valid_days: type.default_valid_days != null ? String(type.default_valid_days) : '',
    warning_lead_days: String(type.warning_lead_days ?? 30),
    required_for_containment_levels: type.required_for_containment_levels ?? [],
    required_for_hazard_types: type.required_for_hazard_types ?? [],
    is_active: type.is_active,
  }
}

interface CredentialTypeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The type being edited; omit/null for create mode. */
  type?: CredentialTypeDTO | null
}

export function CredentialTypeFormDialog({
  open,
  onOpenChange,
  type,
}: CredentialTypeFormDialogProps) {
  const isEdit = !!type
  const createType = useCreateCredentialType()
  const updateType = useUpdateCredentialType()
  const [form, setForm] = useState<FormState>(EMPTY)

  // Re-seed the form whenever the dialog opens (or the edit target changes) so
  // stale values from a prior open never leak in.
  useEffect(() => {
    if (open) setForm(type ? fromType(type) : EMPTY)
  }, [open, type])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const toggleInArray = (key: 'required_for_containment_levels' | 'required_for_hazard_types', value: string) =>
    setForm((prev) => {
      const has = prev[key].includes(value)
      return {
        ...prev,
        [key]: has ? prev[key].filter((v) => v !== value) : [...prev[key], value],
      }
    })

  const isPending = createType.isPending || updateType.isPending
  const canSubmit = form.name.trim().length > 0 && !isPending

  const handleSubmit = async () => {
    const payload = {
      name: form.name.trim(),
      category: form.category,
      applies_to: form.applies_to,
      issuing_authority: form.issuing_authority.trim() || null,
      default_valid_days: form.default_valid_days ? Number.parseInt(form.default_valid_days, 10) : null,
      warning_lead_days: form.warning_lead_days ? Number.parseInt(form.warning_lead_days, 10) : 30,
      required_for_containment_levels:
        form.required_for_containment_levels.length ? form.required_for_containment_levels : null,
      required_for_hazard_types:
        form.required_for_hazard_types.length ? form.required_for_hazard_types : null,
      is_active: form.is_active,
    }

    // The Select components hand back plain strings; the values are constrained
    // to the enum options and validated server-side by Zod, so narrow here.
    const input = payload as CreateCredentialTypeInput
    if (isEdit && type) {
      await updateType.mutateAsync({ id: type.id, input })
    } else {
      await createType.mutateAsync(input)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit credential type' : 'New credential type'}</DialogTitle>
          <DialogDescription>
            Define a credential and, optionally, which jobs require it. Requirements drive the
            crew-assignment readiness check.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ct-name">Name</Label>
            <Input
              id="ct-name"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Asbestos Worker License"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREDENTIAL_CATEGORY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Applies to</Label>
              <Select value={form.applies_to} onValueChange={(v) => set('applies_to', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {APPLIES_TO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ct-authority">Issuing authority</Label>
            <Input
              id="ct-authority"
              value={form.issuing_authority}
              onChange={(e) => set('issuing_authority', e.target.value)}
              placeholder="Optional — e.g. State DEQ, EPA"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ct-valid">Default validity (days)</Label>
              <Input
                id="ct-valid"
                type="number"
                min={1}
                value={form.default_valid_days}
                onChange={(e) => set('default_valid_days', e.target.value)}
                placeholder="e.g. 365"
              />
              <p className="text-xs text-muted-foreground">Auto-suggests an expiry when recording.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ct-warn">Warn before expiry (days)</Label>
              <Input
                id="ct-warn"
                type="number"
                min={0}
                value={form.warning_lead_days}
                onChange={(e) => set('warning_lead_days', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Flips status to “expiring soon”.</p>
            </div>
          </div>

          <fieldset className="space-y-2 rounded-md border p-3">
            <legend className="px-1 text-sm font-medium">Required for jobs</legend>
            <p className="text-xs text-muted-foreground">
              A worker without a current credential of this type is flagged when assigned to a
              matching job. Leave everything unchecked to just track the credential without gating.
            </p>
            <div className="pt-1">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Containment level</p>
              <div className="flex flex-wrap gap-4">
                {CONTAINMENT_LEVEL_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.required_for_containment_levels.includes(o.value)}
                      onCheckedChange={() => toggleInArray('required_for_containment_levels', o.value)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="pt-2">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Hazard type</p>
              <div className="flex flex-wrap gap-4">
                {CREDENTIAL_HAZARD_OPTIONS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.required_for_hazard_types.includes(o.value)}
                      onCheckedChange={() => toggleInArray('required_for_hazard_types', o.value)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          </fieldset>

          {isEdit && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="ct-active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive types are hidden from new records and stop gating assignments.
                </p>
              </div>
              <Switch
                id="ct-active"
                checked={form.is_active}
                onCheckedChange={(v) => set('is_active', v)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Save changes' : 'Create type'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
