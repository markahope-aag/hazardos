'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useSurveyStore } from '@/lib/stores/survey-store'
import {
  MoistureIssue,
  StructuralConcern,
} from '@/lib/stores/survey-types'
import {
  YesNoToggle,
  CheckboxGroup,
  NumericStepper,
  VoiceNoteIconButton,
} from '../inputs'
import { AlertTriangle, Droplets, Thermometer } from 'lucide-react'
import { cn } from '@/lib/utils'

const MOISTURE_ISSUE_OPTIONS: Array<{ value: MoistureIssue; label: string }> = [
  { value: 'none_observed', label: 'None observed' },
  { value: 'active_leak', label: 'Active leak' },
  { value: 'water_staining', label: 'Water staining' },
  { value: 'standing_water', label: 'Standing water' },
  { value: 'condensation', label: 'Condensation' },
  { value: 'musty_odor', label: 'Musty odor' },
]

const STRUCTURAL_CONCERN_OPTIONS: Array<{ value: StructuralConcern; label: string }> = [
  { value: 'foundation_cracks', label: 'Cracks in foundation/walls' },
  { value: 'settlement', label: 'Settlement/uneven floors' },
  { value: 'roof_damage', label: 'Roof damage' },
  { value: 'compromised_envelope', label: 'Compromised building envelope' },
]

export function EnvironmentSection() {
  const { formData, updateEnvironment } = useSurveyStore()
  const { environment } = formData

  const hasHighHumidity = environment.humidity !== null && environment.humidity > 60
  const hasMoistureIssues =
    environment.moistureIssues.length > 0 &&
    !environment.moistureIssues.includes('none_observed')
  const showStructuralDetails = environment.hasStructuralConcerns === true

  // If "none observed" is selected, clear other moisture issues
  const handleMoistureChange = (values: MoistureIssue[]) => {
    if (values.includes('none_observed') && values.length > 1) {
      // If "none observed" was just added, keep only that
      if (!environment.moistureIssues.includes('none_observed')) {
        updateEnvironment({ moistureIssues: ['none_observed'] })
      } else {
        // If other items were added, remove "none observed"
        updateEnvironment({ moistureIssues: values.filter((v) => v !== 'none_observed') })
      }
    } else {
      updateEnvironment({ moistureIssues: values })
    }
  }

  return (
    <div className="space-y-6">
      {/* Temperature */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Thermometer className="w-5 h-5 text-muted-foreground" />
          <Label className="text-base">Temperature</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Current temperature in work area
        </p>
        <NumericStepper
          value={environment.temperature}
          onChange={(value) => updateEnvironment({ temperature: value })}
          min={-20}
          max={150}
          step={1}
          suffix="°F"
        />
      </section>

      {/* Humidity */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Droplets className="w-5 h-5 text-muted-foreground" />
          <Label className="text-base">Humidity</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Relative humidity in work area
        </p>
        <NumericStepper
          value={environment.humidity}
          onChange={(value) => updateEnvironment({ humidity: value })}
          min={0}
          max={100}
          step={5}
          suffix="% RH"
        />
        {hasHighHumidity && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              High humidity ({environment.humidity}%) — may indicate moisture problems
            </p>
          </div>
        )}
      </section>

      {/* Moisture Issues */}
      <section className="space-y-4">
        <div>
          <Label className="text-base">Moisture Issues</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Select all observed moisture-related conditions
          </p>
        </div>

        <CheckboxGroup
          values={environment.moistureIssues}
          onChange={handleMoistureChange}
          options={MOISTURE_ISSUE_OPTIONS}
          columns={2}
        />

        {hasMoistureIssues && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="moistureNotes">Moisture Notes</Label>
              <VoiceNoteIconButton />
            </div>
            <Textarea
              id="moistureNotes"
              value={environment.moistureNotes}
              onChange={(e) => updateEnvironment({ moistureNotes: e.target.value })}
              placeholder="Describe the location and severity of moisture issues..."
              className="min-h-[100px] text-base"
            />
          </div>
        )}
      </section>

      {/* Structural Concerns */}
      <section className="space-y-4">
        <div>
          <Label className="text-base">Are there structural concerns?</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Visible damage or safety issues
          </p>
        </div>

        <YesNoToggle
          value={environment.hasStructuralConcerns}
          onChange={(value) => updateEnvironment({ hasStructuralConcerns: value })}
        />

        {showStructuralDetails && (
          <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">Structural Concerns</span>
            </div>

            <CheckboxGroup
              values={environment.structuralConcerns}
              onChange={(values) => updateEnvironment({ structuralConcerns: values })}
              options={STRUCTURAL_CONCERN_OPTIONS}
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="structuralNotes">Additional Details</Label>
                <VoiceNoteIconButton />
              </div>
              <Textarea
                id="structuralNotes"
                value={environment.structuralNotes}
                onChange={(e) => updateEnvironment({ structuralNotes: e.target.value })}
                placeholder="Describe the location and severity of structural concerns..."
                className="min-h-[100px] text-base bg-white"
              />
            </div>
          </div>
        )}
      </section>

      {/* Utility Shutoffs */}
      <section className="space-y-3">
        <Label className="text-base">Were utility shutoffs located?</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Water, gas, and electrical shutoff locations identified
        </p>
        <YesNoToggle
          value={environment.utilityShutoffsLocated}
          onChange={(value) => updateEnvironment({ utilityShutoffsLocated: value })}
        />
      </section>
    </div>
  )
}
