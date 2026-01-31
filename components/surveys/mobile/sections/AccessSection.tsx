'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSurveyStore } from '@/lib/stores/survey-store'
import {
  AccessRestriction,
  EquipmentAccess,
} from '@/lib/stores/survey-types'
import {
  YesNoToggle,
  YesNoNaToggle,
  CheckboxGroup,
  RadioCardGroup,
  NumericStepper,
} from '../inputs'
import { AlertCircle } from 'lucide-react'

const RESTRICTION_OPTIONS: Array<{ value: AccessRestriction; label: string }> = [
  { value: 'gated_locked', label: 'Gated/Locked' },
  { value: 'security_required', label: 'Security required' },
  { value: 'escort_required', label: 'Escort required' },
  { value: 'background_check', label: 'Background check' },
  { value: 'hours_restricted', label: 'Hours restricted' },
]

const EQUIPMENT_ACCESS_OPTIONS: Array<{
  value: EquipmentAccess
  label: string
  description: string
}> = [
  { value: 'adequate', label: 'Adequate', description: 'Full access for equipment and materials' },
  { value: 'limited', label: 'Limited', description: 'Some restrictions on equipment size' },
  { value: 'difficult', label: 'Difficult', description: 'Significant challenges for equipment' },
]

export function AccessSection() {
  const { formData, updateAccess } = useSurveyStore()
  const { access } = formData

  const showRestrictionDetails = access.hasRestrictions === true
  const showEquipmentNotes =
    access.equipmentAccess === 'limited' || access.equipmentAccess === 'difficult'

  return (
    <div className="space-y-6">
      {/* Access Restrictions */}
      <section className="space-y-4">
        <div>
          <Label className="text-base">Are there access restrictions?</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Security gates, escorts, limited hours, etc.
          </p>
          <YesNoToggle
            value={access.hasRestrictions}
            onChange={(value) => updateAccess({ hasRestrictions: value })}
          />
        </div>

        {showRestrictionDetails && (
          <div className="space-y-4 p-4 bg-muted rounded-lg animate-in fade-in slide-in-from-top-2">
            <Label>Select all that apply:</Label>
            <CheckboxGroup
              values={access.restrictions}
              onChange={(values) => updateAccess({ restrictions: values })}
              options={RESTRICTION_OPTIONS}
            />

            <div>
              <Label htmlFor="restrictionNotes">Additional Notes</Label>
              <Textarea
                id="restrictionNotes"
                value={access.restrictionNotes}
                onChange={(e) => updateAccess({ restrictionNotes: e.target.value })}
                placeholder="Describe any specific access requirements..."
                className="min-h-[100px] text-base"
              />
            </div>
          </div>
        )}
      </section>

      {/* Parking */}
      <section className="space-y-3">
        <Label className="text-base">Is parking available?</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Space for work vehicles and crew parking
        </p>
        <YesNoToggle
          value={access.parkingAvailable}
          onChange={(value) => updateAccess({ parkingAvailable: value })}
        />
      </section>

      {/* Loading Zone */}
      <section className="space-y-3">
        <Label className="text-base">Is a loading zone available?</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Area for equipment delivery and material staging
        </p>
        <YesNoToggle
          value={access.loadingZoneAvailable}
          onChange={(value) => updateAccess({ loadingZoneAvailable: value })}
        />
      </section>

      {/* Equipment Access */}
      <section className="space-y-4">
        <div>
          <Label className="text-base">Equipment Access</Label>
          <p className="text-sm text-muted-foreground mb-3">
            How easily can equipment be moved into the work area?
          </p>
        </div>

        <RadioCardGroup
          value={access.equipmentAccess}
          onChange={(value) => updateAccess({ equipmentAccess: value })}
          options={EQUIPMENT_ACCESS_OPTIONS}
        />

        {showEquipmentNotes && (
          <div className="space-y-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Describe the limitations</span>
            </div>
            <Textarea
              value={access.equipmentAccessNotes}
              onChange={(e) => updateAccess({ equipmentAccessNotes: e.target.value })}
              placeholder="Narrow hallways, tight corners, weight limits, etc."
              className="min-h-[100px] text-base bg-white"
            />
          </div>
        )}
      </section>

      {/* Elevator */}
      <section className="space-y-3">
        <Label className="text-base">Is an elevator available?</Label>
        <p className="text-sm text-muted-foreground mb-3">
          For multi-story buildings
        </p>
        <YesNoNaToggle
          value={access.elevatorAvailable}
          onChange={(value) => updateAccess({ elevatorAvailable: value })}
        />
      </section>

      {/* Minimum Doorway Width */}
      <section className="space-y-3">
        <Label className="text-base">Minimum Doorway Width</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Narrowest doorway or passage to work area
        </p>
        <NumericStepper
          value={access.minDoorwayWidth}
          onChange={(value) => updateAccess({ minDoorwayWidth: value })}
          min={12}
          max={120}
          step={1}
          suffix="inches"
        />
        {access.minDoorwayWidth < 30 && (
          <p className="text-sm text-yellow-600">
            ⚠️ Equipment may require disassembly
          </p>
        )}
      </section>
    </div>
  )
}
