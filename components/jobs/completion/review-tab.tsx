'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReviewTabProps } from './types'

export function ReviewTab({
  data,
  totalHours,
  totalMaterialCost,
  fieldNotes,
  issuesEncountered,
  recommendations,
  onFieldNotesChange,
  onIssuesEncounteredChange,
  onRecommendationsChange,
}: ReviewTabProps) {
  return (
    <div className="flex-1 px-4 py-4 space-y-4 pb-24">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Hours</span>
            <span className="font-medium">{totalHours.toFixed(2)} hrs</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Materials Cost</span>
            <span className="font-medium">${totalMaterialCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Photos</span>
            <span className="font-medium">{data?.photos.length || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Checklist</span>
            <span className="font-medium">
              {data?.checklistProgress.completed || 0} / {data?.checklistProgress.total || 0}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Field Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Field Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fieldNotes">Notes</Label>
            <Textarea
              id="fieldNotes"
              placeholder="General observations and notes..."
              value={fieldNotes}
              onChange={(e) => onFieldNotesChange(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="issues">Issues Encountered</Label>
            <Textarea
              id="issues"
              placeholder="Any problems or unexpected situations..."
              value={issuesEncountered}
              onChange={(e) => onIssuesEncounteredChange(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="recommendations">Recommendations</Label>
            <Textarea
              id="recommendations"
              placeholder="Follow-up work or recommendations..."
              value={recommendations}
              onChange={(e) => onRecommendationsChange(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
