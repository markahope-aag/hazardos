'use client'

import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { LeadWorkMethod } from '@/lib/stores/survey-types'
import { RadioCardGroup } from '../inputs'
import { AlertTriangle, FileWarning, Gauge, Paintbrush } from 'lucide-react'

const WORK_METHOD_OPTIONS: Array<{ value: LeadWorkMethod; label: string; description: string }> = [
  { value: 'stabilization', label: 'Stabilization Only', description: 'Prep and repaint deteriorated surfaces' },
  { value: 'partial_removal', label: 'Partial Removal', description: 'Remove paint from select components' },
  { value: 'full_abatement', label: 'Full Abatement', description: 'Complete removal of lead paint' },
]

export function LeadSummary() {
  const { formData, updateHazards } = useSurveyStore()
  const lead = formData.hazards.lead
  const yearBuilt = formData.property.yearBuilt

  const update = (data: Partial<typeof lead>) => {
    if (!lead) return
    updateHazards({ lead: { ...lead, ...data } })
  }

  // Calculate totals and RRP requirements
  const calculations = useMemo(() => {
    if (!lead) return null
    let totalInteriorSqFt = 0
    let totalExteriorSqFt = 0
    let hasDeteriorated = false

    // Determine if component is interior or exterior based on type
    const interiorTypes = [
      'interior_walls',
      'windows_trim',
      'doors_frames',
      'baseboards',
      'stairs_railings',
      'cabinets',
    ]

    lead.components.forEach((c) => {
      const sqFt = c.unit === 'sq_ft' ? (c.quantity || 0) : 0
      const isInterior = c.componentType && interiorTypes.includes(c.componentType)

      if (isInterior) {
        totalInteriorSqFt += sqFt
      } else {
        totalExteriorSqFt += sqFt
      }

      if (
        c.condition === 'minor_deterioration' ||
        c.condition === 'significant_deterioration'
      ) {
        hasDeteriorated = true
      }
    })

    const totalSqFt = totalInteriorSqFt + totalExteriorSqFt
    const isPre1978 = yearBuilt !== null && yearBuilt < 1978

    // RRP Rule applies if:
    // - Pre-1978 building AND
    // - >6 sq ft interior OR >20 sq ft exterior
    const rrpRuleApplies =
      isPre1978 && (totalInteriorSqFt > 6 || totalExteriorSqFt > 20)

    return {
      totalInteriorSqFt,
      totalExteriorSqFt,
      totalSqFt,
      hasDeteriorated,
      rrpRuleApplies,
      isPre1978,
    }
  }, [lead?.components, yearBuilt])

  if (!lead || !calculations) return null

  return (
    <div className="space-y-4 p-4 bg-muted rounded-xl">
      <h4 className="font-semibold flex items-center gap-2">
        <Gauge className="w-5 h-5" />
        Summary & Requirements
      </h4>

      {/* Total Work Area */}
      <div className="grid grid-cols-2 gap-3">
        {calculations.totalInteriorSqFt > 0 && (
          <div className="p-3 bg-blue-100 rounded-lg text-center">
            <p className="text-2xl font-bold text-blue-800">
              {calculations.totalInteriorSqFt.toLocaleString()}
            </p>
            <p className="text-xs text-blue-600">sq ft interior</p>
          </div>
        )}
        {calculations.totalExteriorSqFt > 0 && (
          <div className="p-3 bg-green-100 rounded-lg text-center">
            <p className="text-2xl font-bold text-green-800">
              {calculations.totalExteriorSqFt.toLocaleString()}
            </p>
            <p className="text-xs text-green-600">sq ft exterior</p>
          </div>
        )}
      </div>

      {/* RRP Rule Status */}
      {calculations.isPre1978 && (
        <div
          className={cn(
            'p-3 rounded-lg',
            calculations.rrpRuleApplies
              ? 'bg-red-100 border border-red-300'
              : 'bg-green-100 border border-green-300'
          )}
        >
          <div className="flex items-center gap-2">
            <FileWarning
              className={cn(
                'w-5 h-5',
                calculations.rrpRuleApplies ? 'text-red-600' : 'text-green-600'
              )}
            />
            <div>
              <p
                className={cn(
                  'font-semibold',
                  calculations.rrpRuleApplies ? 'text-red-800' : 'text-green-800'
                )}
              >
                {calculations.rrpRuleApplies
                  ? 'EPA RRP Rule Applies'
                  : 'RRP Rule Does Not Apply'}
              </p>
              <p
                className={cn(
                  'text-sm',
                  calculations.rrpRuleApplies ? 'text-red-700' : 'text-green-700'
                )}
              >
                {calculations.rrpRuleApplies
                  ? 'Certified renovator and lead-safe work practices required'
                  : 'Below thresholds (≤6 sq ft interior, ≤20 sq ft exterior)'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Work Method */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Paintbrush className="w-4 h-4" />
          Recommended Work Method
        </Label>
        <RadioCardGroup
          value={lead.workMethod}
          onChange={(value) => update({ workMethod: value })}
          options={WORK_METHOD_OPTIONS}
          size="sm"
        />
      </div>

      {/* Warnings */}
      {calculations.hasDeteriorated && (
        <div className="flex items-start gap-2 text-sm text-yellow-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Deteriorated paint present — prioritize stabilization or removal</p>
        </div>
      )}

      {lead.childrenUnder6Present && (
        <div className="flex items-start gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Child-occupied facility — enhanced lead-safe practices required</p>
        </div>
      )}
    </div>
  )
}
