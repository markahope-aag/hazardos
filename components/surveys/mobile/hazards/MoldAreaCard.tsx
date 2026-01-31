'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import {
  MoldAffectedArea,
  MoldMaterialType,
  MoldAffectedMaterial,
  MoldSeverity,
} from '@/lib/stores/survey-types'
import { NumericStepper, SegmentedControl, CheckboxGroup, RadioCardGroup } from '../inputs'
import { ChevronDown, Trash2, AlertTriangle } from 'lucide-react'

const MATERIAL_TYPE_OPTIONS: Array<{ value: MoldMaterialType; label: string; description: string }> = [
  { value: 'porous', label: 'Porous', description: 'Drywall, carpet, insulation' },
  { value: 'semi_porous', label: 'Semi-Porous', description: 'Wood, concrete' },
  { value: 'non_porous', label: 'Non-Porous', description: 'Metal, glass, tile' },
]

const AFFECTED_MATERIAL_OPTIONS: Array<{ value: MoldAffectedMaterial; label: string }> = [
  { value: 'drywall', label: 'Drywall' },
  { value: 'wood_studs', label: 'Wood studs' },
  { value: 'insulation', label: 'Insulation' },
  { value: 'baseboard_trim', label: 'Baseboard/trim' },
  { value: 'flooring', label: 'Flooring' },
  { value: 'ceiling', label: 'Ceiling' },
]

const SEVERITY_OPTIONS: Array<{ value: MoldSeverity; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'heavy', label: 'Heavy' },
]

interface MoldAreaCardProps {
  area: MoldAffectedArea
  index: number
}

export function MoldAreaCard({ area, index }: MoldAreaCardProps) {
  const { updateMoldArea, removeMoldArea } = useSurveyStore()
  const [isOpen, setIsOpen] = useState(true)

  const update = (data: Partial<MoldAffectedArea>) => {
    updateMoldArea(area.id, data)
  }

  const handleDelete = () => {
    if (confirm('Remove this affected area?')) {
      removeMoldArea(area.id)
    }
  }

  const getSummary = () => {
    const parts: string[] = []
    if (area.squareFootage) {
      parts.push(`${area.squareFootage} sq ft`)
    }
    if (area.location) {
      parts.push(area.location)
    }
    if (area.severity) {
      parts.push(area.severity)
    }
    return parts.join(' • ') || 'Tap to add details'
  }

  const highMoistureWarning = area.moistureReading !== null && area.moistureReading > 20

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'border-2 rounded-xl overflow-hidden',
          area.severity === 'heavy' ? 'border-red-300 bg-red-50/50' : 'border-border bg-background'
        )}
      >
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center justify-between w-full p-4 text-left touch-manipulation"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {area.location || `Area ${index + 1}`}
                </span>
                {area.severity === 'heavy' && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                    Heavy
                  </span>
                )}
              </div>
              {!isOpen && (
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {getSummary()}
                </p>
              )}
            </div>
            <ChevronDown
              className={cn(
                'w-5 h-5 text-muted-foreground transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4 border-t border-border/50">
            {/* Location */}
            <div className="pt-4">
              <Label>Location</Label>
              <Input
                value={area.location}
                onChange={(e) => update({ location: e.target.value })}
                placeholder="e.g., Master bathroom, basement wall"
                className="min-h-[52px] text-base mt-2"
              />
            </div>

            {/* Square Footage */}
            <div>
              <Label>Affected Area Size</Label>
              <NumericStepper
                value={area.squareFootage}
                onChange={(value) => update({ squareFootage: value })}
                min={0}
                max={10000}
                step={5}
                suffix="sq ft"
                className="mt-2"
              />
            </div>

            {/* Material Type */}
            <div>
              <Label>Predominant Material Type</Label>
              <RadioCardGroup
                value={area.materialType}
                onChange={(value) => update({ materialType: value })}
                options={MATERIAL_TYPE_OPTIONS}
                className="mt-2"
                size="sm"
              />
            </div>

            {/* Materials Affected */}
            <div>
              <Label>Materials Affected</Label>
              <CheckboxGroup
                values={area.materialsAffected}
                onChange={(values) => update({ materialsAffected: values })}
                options={AFFECTED_MATERIAL_OPTIONS}
                columns={2}
                className="mt-2"
              />
            </div>

            {/* Severity */}
            <div>
              <Label>Severity</Label>
              <SegmentedControl
                value={area.severity}
                onChange={(value) => update({ severity: value })}
                options={SEVERITY_OPTIONS}
                className="mt-2"
                size="lg"
              />
            </div>

            {/* Moisture Reading */}
            <div>
              <Label>Moisture Reading (optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Moisture meter reading at affected area
              </p>
              <NumericStepper
                value={area.moistureReading}
                onChange={(value) => update({ moistureReading: value })}
                min={0}
                max={100}
                step={1}
                suffix="%"
              />
              {highMoistureWarning && (
                <div className="flex items-center gap-2 mt-2 text-yellow-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Elevated moisture (&gt;20%) — source may still be active</span>
                </div>
              )}
            </div>

            {/* Delete Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              className="w-full touch-manipulation min-h-[48px] text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Area
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
