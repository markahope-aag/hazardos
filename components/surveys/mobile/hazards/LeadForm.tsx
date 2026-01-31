'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { LeadWorkScope } from '@/lib/stores/survey-types'
import { LeadComponentCard } from './LeadComponentCard'
import { LeadSummary } from './LeadSummary'
import { YesNoToggle, RadioCardGroup } from '../inputs'
import { Plus, AlertTriangle, Baby } from 'lucide-react'

const WORK_SCOPE_OPTIONS: Array<{ value: LeadWorkScope; label: string; description: string }> = [
  { value: 'interior_only', label: 'Interior Only', description: 'Work limited to inside the building' },
  { value: 'exterior_only', label: 'Exterior Only', description: 'Work limited to outside surfaces' },
  { value: 'both', label: 'Both', description: 'Interior and exterior work required' },
]

export function LeadForm() {
  const { formData, addLeadComponent, updateHazards } = useSurveyStore()
  const lead = formData.hazards.lead
  const yearBuilt = formData.property.yearBuilt

  if (!lead) return null

  const update = (data: Partial<typeof lead>) => {
    updateHazards({ lead: { ...lead, ...data } })
  }

  const handleAddComponent = () => {
    addLeadComponent()
  }

  const isPre1978 = yearBuilt !== null && yearBuilt < 1978

  return (
    <div className="space-y-6">
      {/* Pre-1978 Warning */}
      {isPre1978 && (
        <div className="flex items-start gap-3 p-4 bg-yellow-100 border border-yellow-300 rounded-xl">
          <AlertTriangle className="w-6 h-6 text-yellow-700 flex-shrink-0" />
          <div>
            <p className="font-semibold text-yellow-800">Pre-1978 Building</p>
            <p className="text-sm text-yellow-700">
              Year built: {yearBuilt}. Lead-based paint is presumed present unless tested negative.
            </p>
          </div>
        </div>
      )}

      {/* Children Present */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Baby className="w-5 h-5 text-muted-foreground" />
          <Label className="text-base">Are children under 6 present?</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Residence of children triggers additional requirements
        </p>
        <YesNoToggle
          value={lead.childrenUnder6Present}
          onChange={(value) => update({ childrenUnder6Present: value })}
        />
        {lead.childrenUnder6Present && (
          <div className="flex items-start gap-2 p-3 bg-red-100 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>Enhanced lead-safe work practices required for child-occupied facilities</p>
          </div>
        )}
      </section>

      {/* Work Scope */}
      <section className="space-y-3">
        <Label className="text-base">Work Scope</Label>
        <RadioCardGroup
          value={lead.workScope}
          onChange={(value) => update({ workScope: value })}
          options={WORK_SCOPE_OPTIONS}
        />
      </section>

      {/* Components List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Lead-Painted Components</Label>
          <span className="text-sm text-muted-foreground">
            {lead.components.length} component{lead.components.length !== 1 ? 's' : ''}
          </span>
        </div>

        {lead.components.length === 0 ? (
          <div className="text-center py-8 bg-muted rounded-lg">
            <p className="text-muted-foreground mb-4">
              No components documented yet
            </p>
            <Button
              type="button"
              onClick={handleAddComponent}
              className="touch-manipulation min-h-[52px]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add First Component
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {lead.components.map((component, index) => (
              <LeadComponentCard key={component.id} component={component} index={index} />
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddComponent}
              className="w-full touch-manipulation min-h-[52px]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Another Component
            </Button>
          </div>
        )}
      </section>

      {/* Summary */}
      {lead.components.length > 0 && <LeadSummary />}
    </div>
  )
}
