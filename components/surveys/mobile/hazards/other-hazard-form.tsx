'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { AlertCircle } from 'lucide-react'

export function OtherHazardForm() {
  const { formData, updateHazards } = useSurveyStore()
  const other = formData.hazards.other

  if (!other) return null

  const update = (data: Partial<typeof other>) => {
    updateHazards({ other: { ...other, ...data } })
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 bg-purple-100 border border-purple-300 rounded-xl">
        <AlertCircle className="w-6 h-6 text-purple-700 flex-shrink-0" />
        <div>
          <p className="font-semibold text-purple-800">Other Hazardous Materials</p>
          <p className="text-sm text-purple-700">
            Document any additional environmental hazards not covered by asbestos, mold, or lead sections.
          </p>
        </div>
      </div>

      {/* Description */}
      <section className="space-y-3">
        <Label htmlFor="other-description" className="text-base">
          Hazard Description
        </Label>
        <p className="text-sm text-muted-foreground">
          Describe the type of hazard(s) present (e.g., PCBs, mercury, biohazard, chemical contamination)
        </p>
        <Textarea
          id="other-description"
          value={other.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => update({ description: e.target.value })}
          placeholder="Describe the hazardous material(s) found..."
          className="min-h-[120px] text-base"
        />
      </section>

      {/* Notes */}
      <section className="space-y-3">
        <Label htmlFor="other-notes" className="text-base">
          Additional Notes
        </Label>
        <p className="text-sm text-muted-foreground">
          Include location, quantity estimates, condition, and any special handling requirements
        </p>
        <Textarea
          id="other-notes"
          value={other.notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => update({ notes: e.target.value })}
          placeholder="Location details, quantity estimates, special considerations..."
          className="min-h-[150px] text-base"
        />
      </section>
    </div>
  )
}
