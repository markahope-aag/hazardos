'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSurveyStore } from '@/lib/stores/survey-store'
import {
  MoistureSourceType,
  MoistureSourceStatus,
} from '@/lib/stores/survey-types'
import { MoldAreaCard } from './MoldAreaCard'
import { MoldSummary } from './MoldSummary'
import { YesNoToggle, CheckboxGroup, SegmentedControl } from '../inputs'
import { Plus, Droplets } from 'lucide-react'

const MOISTURE_SOURCE_OPTIONS: Array<{ value: MoistureSourceType; label: string }> = [
  { value: 'roof_leak', label: 'Roof leak' },
  { value: 'plumbing_leak', label: 'Plumbing leak' },
  { value: 'hvac_condensation', label: 'HVAC condensation' },
  { value: 'foundation_intrusion', label: 'Foundation intrusion' },
  { value: 'window_leak', label: 'Window leak' },
  { value: 'appliance_overflow', label: 'Appliance overflow' },
  { value: 'unknown', label: 'Unknown' },
]

const MOISTURE_STATUS_OPTIONS: Array<{ value: MoistureSourceStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'fixed', label: 'Fixed' },
]

export function MoldForm() {
  const { formData, addMoldArea, updateHazards } = useSurveyStore()
  const mold = formData.hazards.mold

  if (!mold) return null

  const update = (data: Partial<typeof mold>) => {
    updateHazards({ mold: { ...mold, ...data } })
  }

  const handleAddArea = () => {
    addMoldArea()
  }

  return (
    <div className="space-y-6">
      {/* Moisture Assessment */}
      <section className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-center gap-2 text-blue-800">
          <Droplets className="w-5 h-5" />
          <h4 className="font-semibold">Moisture Assessment</h4>
        </div>

        <div>
          <Label className="text-base">Has the moisture source been identified?</Label>
          <YesNoToggle
            value={mold.moistureSourceIdentified}
            onChange={(value) => update({ moistureSourceIdentified: value })}
            className="mt-2"
          />
        </div>

        {mold.moistureSourceIdentified && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div>
              <Label>Source Types</Label>
              <CheckboxGroup
                values={mold.moistureSourceTypes}
                onChange={(values) => update({ moistureSourceTypes: values })}
                options={MOISTURE_SOURCE_OPTIONS}
                columns={2}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Source Status</Label>
              <SegmentedControl
                value={mold.moistureSourceStatus}
                onChange={(value) => update({ moistureSourceStatus: value })}
                options={MOISTURE_STATUS_OPTIONS}
                className="mt-2"
              />
              {mold.moistureSourceStatus === 'active' && (
                <p className="text-sm text-red-600 mt-2">
                  ⚠️ Active moisture must be addressed before remediation
                </p>
              )}
            </div>

            <div>
              <Label>Location/Notes</Label>
              <Textarea
                value={mold.moistureSourceNotes}
                onChange={(e) => update({ moistureSourceNotes: e.target.value })}
                placeholder="Describe the moisture source location and details..."
                className="min-h-[80px] text-base mt-2 bg-white"
              />
            </div>
          </div>
        )}
      </section>

      {/* Affected Areas */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Affected Areas</Label>
          <span className="text-sm text-muted-foreground">
            {mold.affectedAreas.length} area{mold.affectedAreas.length !== 1 ? 's' : ''}
          </span>
        </div>

        {mold.affectedAreas.length === 0 ? (
          <div className="text-center py-8 bg-muted rounded-lg">
            <p className="text-muted-foreground mb-4">
              No affected areas documented yet
            </p>
            <Button
              type="button"
              onClick={handleAddArea}
              className="touch-manipulation min-h-[52px]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add First Area
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {mold.affectedAreas.map((area, index) => (
              <MoldAreaCard key={area.id} area={area} index={index} />
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddArea}
              className="w-full touch-manipulation min-h-[52px]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Another Area
            </Button>
          </div>
        )}
      </section>

      {/* Summary */}
      {mold.affectedAreas.length > 0 && <MoldSummary />}
    </div>
  )
}
