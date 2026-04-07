'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import type { TimeEntriesTabProps, TimeEntryWorkType } from './types'

const WORK_TYPES: { value: TimeEntryWorkType; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'travel', label: 'Travel' },
  { value: 'setup', label: 'Setup' },
  { value: 'cleanup', label: 'Cleanup' },
  { value: 'supervision', label: 'Supervision' },
]

export function TimeEntriesTab({
  data,
  totalHours,
  newTimeEntry,
  onNewTimeEntryChange,
  onAddTimeEntry,
  onDeleteTimeEntry,
}: TimeEntriesTabProps) {
  return (
    <div className="flex-1 px-4 py-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Time Entry</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="work_date">Date</Label>
              <Input
                id="work_date"
                type="date"
                value={newTimeEntry.work_date}
                onChange={(e) => onNewTimeEntryChange({ ...newTimeEntry, work_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="hours">Hours</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                placeholder="0.00"
                value={newTimeEntry.hours}
                onChange={(e) => onNewTimeEntryChange({ ...newTimeEntry, hours: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="work_type">Work Type</Label>
            <Select
              value={newTimeEntry.work_type}
              onValueChange={(v) => onNewTimeEntryChange({ ...newTimeEntry, work_type: v as TimeEntryWorkType })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="What was done..."
              value={newTimeEntry.description}
              onChange={(e) => onNewTimeEntryChange({ ...newTimeEntry, description: e.target.value })}
              className="mt-1"
            />
          </div>

          <Button onClick={onAddTimeEntry} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Time Entry
          </Button>
        </CardContent>
      </Card>

      {/* Time entries list */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Time Entries</h3>
          <Badge variant="secondary">{totalHours.toFixed(2)} hrs total</Badge>
        </div>

        {data?.timeEntries.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No time entries yet
          </p>
        )}

        {data?.timeEntries.map((entry) => (
          <Card key={entry.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{entry.hours} hours</p>
                <p className="text-sm text-muted-foreground">
                  {entry.work_date} - {entry.work_type}
                </p>
                {entry.description && (
                  <p className="text-sm text-muted-foreground">{entry.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteTimeEntry(entry.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
