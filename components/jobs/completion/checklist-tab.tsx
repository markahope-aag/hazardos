'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { ChecklistTabProps } from './types'

export function ChecklistTab({
  data,
  onToggleChecklistItem,
}: ChecklistTabProps) {
  return (
    <div className="flex-1 px-4 py-4 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">Completion Checklist</h3>
        <Badge variant={
          data?.checklistProgress.required === data?.checklistProgress.completed
            ? 'default'
            : 'secondary'
        }>
          {data?.checklistProgress.completed || 0} / {data?.checklistProgress.total || 0}
        </Badge>
      </div>

      {data?.checklist && Object.entries(data.checklist).map(([category, items]) => {
        if (items.length === 0) return null

        return (
          <Card key={category}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize">{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors"
                >
                  <Checkbox
                    id={item.id}
                    checked={item.is_completed}
                    onCheckedChange={(checked) =>
                      onToggleChecklistItem(item.id, checked as boolean)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={item.id}
                      className={cn(
                        'text-sm font-medium cursor-pointer',
                        item.is_completed && 'line-through text-muted-foreground'
                      )}
                    >
                      {item.item_name}
                      {item.is_required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </label>
                    {item.item_description && (
                      <p className="text-xs text-muted-foreground">
                        {item.item_description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
