'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  LeadComponent,
  LeadComponentType,
  LeadCondition,
  QuantityUnit,
} from '@/lib/stores/survey-types'
import { SegmentedControl } from '../inputs'
import { ChevronDown, Trash2 } from 'lucide-react'

const COMPONENT_TYPE_OPTIONS: Array<{ value: LeadComponentType; label: string; interior: boolean }> = [
  { value: 'interior_walls', label: 'Interior Walls', interior: true },
  { value: 'windows_trim', label: 'Windows & Trim', interior: true },
  { value: 'doors_frames', label: 'Doors & Frames', interior: true },
  { value: 'baseboards', label: 'Baseboards', interior: true },
  { value: 'stairs_railings', label: 'Stairs/Railings', interior: true },
  { value: 'cabinets', label: 'Cabinets', interior: true },
  { value: 'exterior_siding', label: 'Exterior Siding', interior: false },
  { value: 'exterior_trim', label: 'Exterior Trim', interior: false },
  { value: 'porch_deck', label: 'Porch/Deck', interior: false },
  { value: 'fencing', label: 'Fencing', interior: false },
]

const CONDITION_OPTIONS: Array<{ value: LeadCondition; label: string }> = [
  { value: 'intact', label: 'Intact' },
  { value: 'minor_deterioration', label: 'Minor' },
  { value: 'significant_deterioration', label: 'Significant' },
]

const UNIT_OPTIONS: Array<{ value: QuantityUnit | 'count'; label: string }> = [
  { value: 'sq_ft', label: 'sq ft' },
  { value: 'linear_ft', label: 'linear ft' },
  { value: 'count', label: 'count' },
]

interface LeadComponentCardProps {
  component: LeadComponent
  index: number
}

export function LeadComponentCard({ component, index }: LeadComponentCardProps) {
  const { updateLeadComponent, removeLeadComponent } = useSurveyStore()
  const [isOpen, setIsOpen] = useState(true)

  const update = (data: Partial<LeadComponent>) => {
    updateLeadComponent(component.id, data)
  }

  const handleDelete = () => {
    if (confirm('Remove this component?')) {
      removeLeadComponent(component.id)
    }
  }

  const componentInfo = COMPONENT_TYPE_OPTIONS.find((o) => o.value === component.componentType)
  const componentLabel = componentInfo?.label || `Component ${index + 1}`

  const getSummary = () => {
    const parts: string[] = []
    if (component.quantity) {
      const unitLabel = UNIT_OPTIONS.find((o) => o.value === component.unit)?.label || ''
      parts.push(`${component.quantity} ${unitLabel}`)
    }
    if (component.location) {
      parts.push(component.location)
    }
    return parts.join(' • ') || 'Tap to add details'
  }

  const isDeteriorated =
    component.condition === 'minor_deterioration' ||
    component.condition === 'significant_deterioration'

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'border-2 rounded-xl overflow-hidden',
          component.condition === 'significant_deterioration'
            ? 'border-red-300 bg-red-50/50'
            : 'border-border bg-background'
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
                <span className="font-semibold">{componentLabel}</span>
                {componentInfo && (
                  <span
                    className={cn(
                      'text-xs px-2 py-0.5 rounded-full',
                      componentInfo.interior
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    )}
                  >
                    {componentInfo.interior ? 'Interior' : 'Exterior'}
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
            {/* Component Type */}
            <div className="pt-4">
              <Label>Component Type</Label>
              <Select
                value={component.componentType || ''}
                onValueChange={(value) => update({ componentType: value as LeadComponentType })}
              >
                <SelectTrigger className="min-h-[52px] text-base mt-2">
                  <SelectValue placeholder="Select component type" />
                </SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Interior
                  </div>
                  {COMPONENT_TYPE_OPTIONS.filter((o) => o.interior).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                    Exterior
                  </div>
                  {COMPONENT_TYPE_OPTIONS.filter((o) => !o.interior).map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <Label>Location</Label>
              <Input
                value={component.location}
                onChange={(e) => update({ location: e.target.value })}
                placeholder="e.g., Living room, Master bedroom windows"
                className="min-h-[52px] text-base mt-2"
              />
            </div>

            {/* Quantity and Unit */}
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={component.quantity || ''}
                  onChange={(e) => update({ quantity: parseFloat(e.target.value) || null })}
                  placeholder="Amount"
                  className="min-h-[52px] text-base"
                />
                <Select
                  value={component.unit}
                  onValueChange={(value) => update({ unit: value as QuantityUnit | 'count' })}
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

            {/* Condition */}
            <div>
              <Label>Paint Condition</Label>
              <SegmentedControl
                value={component.condition}
                onChange={(value) => update({ condition: value })}
                options={CONDITION_OPTIONS}
                className="mt-2"
              />
              {isDeteriorated && (
                <p className="text-sm text-yellow-600 mt-2">
                  ⚠️ Deteriorated paint requires immediate attention
                </p>
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
              Remove Component
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
