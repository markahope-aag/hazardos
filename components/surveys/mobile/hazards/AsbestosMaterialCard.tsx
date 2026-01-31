'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import {
  AsbestosMaterial,
  AsbestosMaterialType,
  AsbestosMaterialCondition,
  QuantityUnit,
} from '@/lib/stores/survey-types'
import { NumericStepper, SegmentedControl, YesNoToggle } from '../inputs'
import { ChevronDown, Trash2, AlertTriangle } from 'lucide-react'

const MATERIAL_TYPE_OPTIONS: Array<{ value: AsbestosMaterialType; label: string }> = [
  { value: 'pipe_insulation', label: 'Pipe Insulation' },
  { value: 'boiler_insulation', label: 'Boiler Insulation' },
  { value: 'duct_insulation', label: 'Duct Insulation' },
  { value: 'ceiling_tiles', label: 'Ceiling Tiles' },
  { value: 'spray_applied_ceiling', label: 'Spray-Applied Ceiling' },
  { value: 'floor_tiles_9x9', label: 'Floor Tiles (9x9)' },
  { value: 'floor_tiles_12x12', label: 'Floor Tiles (12x12)' },
  { value: 'sheet_vinyl', label: 'Sheet Vinyl' },
  { value: 'mastic_adhesive', label: 'Mastic/Adhesive' },
  { value: 'transite_siding', label: 'Transite Siding' },
  { value: 'roofing_materials', label: 'Roofing Materials' },
  { value: 'vermiculite_insulation', label: 'Vermiculite Insulation' },
  { value: 'drywall_joint_compound', label: 'Drywall/Joint Compound' },
  { value: 'other', label: 'Other' },
]

const CONDITION_OPTIONS: Array<{ value: AsbestosMaterialCondition; label: string }> = [
  { value: 'intact', label: 'Intact' },
  { value: 'minor_damage', label: 'Minor' },
  { value: 'significant_damage', label: 'Significant' },
  { value: 'severe_damage', label: 'Severe' },
]

const UNIT_OPTIONS: Array<{ value: QuantityUnit; label: string }> = [
  { value: 'sq_ft', label: 'sq ft' },
  { value: 'linear_ft', label: 'linear ft' },
  { value: 'cu_ft', label: 'cu ft' },
]

interface AsbestosMaterialCardProps {
  material: AsbestosMaterial
  index: number
}

export function AsbestosMaterialCard({ material, index }: AsbestosMaterialCardProps) {
  const { updateAsbestosMaterial, removeAsbestosMaterial } = useSurveyStore()
  const [isOpen, setIsOpen] = useState(true)

  const update = (data: Partial<AsbestosMaterial>) => {
    updateAsbestosMaterial(material.id, data)
  }

  const handleDelete = () => {
    if (confirm('Remove this material?')) {
      removeAsbestosMaterial(material.id)
    }
  }

  // Determine if this material type needs pipe dimensions
  const needsPipeDimensions =
    material.materialType === 'pipe_insulation' ||
    material.materialType === 'duct_insulation'

  // Get display label for the material
  const materialLabel =
    MATERIAL_TYPE_OPTIONS.find((o) => o.value === material.materialType)?.label ||
    `Material ${index + 1}`

  // Summary line for collapsed view
  const getSummary = () => {
    const parts: string[] = []
    if (material.quantity) {
      const unitLabel = UNIT_OPTIONS.find((o) => o.value === material.unit)?.label || ''
      parts.push(`${material.quantity} ${unitLabel}`)
    }
    if (material.location) {
      parts.push(material.location)
    }
    if (material.friable) {
      parts.push('Friable')
    }
    return parts.join(' • ') || 'Tap to add details'
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'border-2 rounded-xl overflow-hidden',
          material.friable ? 'border-red-300 bg-red-50/50' : 'border-border bg-background'
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
                <span className="font-semibold">{materialLabel}</span>
                {material.friable && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                    Friable
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
            {/* Material Type */}
            <div className="pt-4">
              <Label>Material Type</Label>
              <Select
                value={material.materialType || ''}
                onValueChange={(value) => update({ materialType: value as AsbestosMaterialType })}
              >
                <SelectTrigger className="min-h-[52px] text-base mt-2">
                  <SelectValue placeholder="Select material type" />
                </SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pipe Dimensions (conditional) */}
            {needsPipeDimensions && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm">Pipe Diameter (in)</Label>
                  <NumericStepper
                    value={material.pipeDiameter}
                    onChange={(value) => update({ pipeDiameter: value })}
                    min={0.5}
                    max={48}
                    step={0.5}
                  />
                </div>
                <div>
                  <Label className="text-sm">Insulation Thickness (in)</Label>
                  <NumericStepper
                    value={material.pipeThickness}
                    onChange={(value) => update({ pipeThickness: value })}
                    min={0.5}
                    max={6}
                    step={0.5}
                  />
                </div>
              </div>
            )}

            {/* Quantity and Unit */}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={material.quantity || ''}
                  onChange={(e) => update({ quantity: parseFloat(e.target.value) || null })}
                  placeholder="Amount"
                  className="min-h-[52px] text-base"
                />
                <Select
                  value={material.unit}
                  onValueChange={(value) => update({ unit: value as QuantityUnit })}
                >
                  <SelectTrigger className="min-h-[52px] text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div>
              <Label>Location</Label>
              <Input
                value={material.location}
                onChange={(e) => update({ location: e.target.value })}
                placeholder="e.g., Basement mechanical room, 2nd floor ceiling"
                className="min-h-[52px] text-base mt-2"
              />
            </div>

            {/* Condition */}
            <div>
              <Label>Condition</Label>
              <SegmentedControl
                value={material.condition}
                onChange={(value) => update({ condition: value })}
                options={CONDITION_OPTIONS}
                className="mt-2"
              />
              {(material.condition === 'significant_damage' ||
                material.condition === 'severe_damage') && (
                <p className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Damaged material increases containment requirements
                </p>
              )}
            </div>

            {/* Friability */}
            <div
              className={cn(
                'p-3 rounded-lg',
                material.friable ? 'bg-red-100' : 'bg-muted'
              )}
            >
              <Label className="text-base">Is this material friable?</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Can be crumbled or reduced to powder by hand pressure
              </p>
              <YesNoToggle
                value={material.friable}
                onChange={(value) => update({ friable: value })}
                yesLabel="Friable"
                noLabel="Non-Friable"
              />
            </div>

            {/* Notes */}
            <div>
              <Label>Notes</Label>
              <Textarea
                value={material.notes}
                onChange={(e) => update({ notes: e.target.value })}
                placeholder="Additional observations..."
                className="min-h-[80px] text-base mt-2"
              />
            </div>

            {/* Delete Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              className="w-full touch-manipulation min-h-[48px] text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Material
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
