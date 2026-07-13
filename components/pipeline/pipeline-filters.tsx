'use client'

import { Filter, User } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useOrgMembers } from '@/lib/hooks/use-org-members'
import type { PipelineStage } from '@/types/sales'

// PA4: pipeline had no way to filter by sales user, date range, or stage.
// All opportunities are already loaded client-side (see pipeline-kanban's
// LocationFilter for the same pattern), so this filters the in-memory list
// rather than re-querying — no new API surface needed.
export interface PipelineFilterState {
  ownerId: string // 'all' | profile id
  dateFrom: string // '' | yyyy-mm-dd, filters on opportunities.created_at
  dateTo: string
  stageIds: Set<string> // empty = show every stage column
}

export const EMPTY_PIPELINE_FILTERS: PipelineFilterState = {
  ownerId: 'all',
  dateFrom: '',
  dateTo: '',
  stageIds: new Set(),
}

interface PipelineFiltersProps {
  stages: PipelineStage[]
  value: PipelineFilterState
  onChange: (value: PipelineFilterState) => void
}

export function PipelineFilters({ stages, value, onChange }: PipelineFiltersProps) {
  const { data: members = [] } = useOrgMembers()

  const toggleStage = (stageId: string, checked: boolean) => {
    const next = new Set(value.stageIds)
    if (checked) next.add(stageId)
    else next.delete(stageId)
    onChange({ ...value, stageIds: next })
  }

  const stageLabel =
    value.stageIds.size === 0
      ? 'All stages'
      : `${value.stageIds.size} stage${value.stageIds.size === 1 ? '' : 's'}`

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Sales User</Label>
        <Select value={value.ownerId} onValueChange={(v) => onChange({ ...value, ownerId: v })}>
          <SelectTrigger className="w-[180px]">
            <User className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue placeholder="Sales user" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sales users</SelectItem>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {[member.first_name, member.last_name].filter(Boolean).join(' ') || member.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="pipeline-date-from" className="text-xs text-muted-foreground">From</Label>
        <Input
          id="pipeline-date-from"
          type="date"
          className="w-[150px]"
          value={value.dateFrom}
          max={value.dateTo || undefined}
          onChange={(e) => onChange({ ...value, dateFrom: e.target.value })}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="pipeline-date-to" className="text-xs text-muted-foreground">To</Label>
        <Input
          id="pipeline-date-to"
          type="date"
          className="w-[150px]"
          value={value.dateTo}
          min={value.dateFrom || undefined}
          onChange={(e) => onChange({ ...value, dateTo: e.target.value })}
        />
      </div>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Filter className="h-3.5 w-3.5" />
            {stageLabel}
            {value.stageIds.size > 0 && (
              <Badge variant="secondary" className="ml-1">
                {value.stageIds.size}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-56 p-2">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-sm font-medium">Stages</span>
            {value.stageIds.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => onChange({ ...value, stageIds: new Set() })}
              >
                Clear
              </Button>
            )}
          </div>
          <div className="space-y-1">
            {stages.map((stage) => (
              <label
                key={stage.id}
                className="flex items-center gap-2 rounded px-1 py-1.5 text-sm hover:bg-muted cursor-pointer"
              >
                <Checkbox
                  checked={value.stageIds.has(stage.id)}
                  onCheckedChange={(checked) => toggleStage(stage.id, checked === true)}
                />
                {stage.name}
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {(value.ownerId !== 'all' || value.dateFrom || value.dateTo || value.stageIds.size > 0) && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_PIPELINE_FILTERS)}>
          Reset filters
        </Button>
      )}
    </div>
  )
}
