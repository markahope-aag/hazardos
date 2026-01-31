'use client'

import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { MoldSizeCategory, OdorLevel } from '@/lib/stores/survey-types'
import { SegmentedControl, YesNoNaToggle } from '../inputs'
import { AlertTriangle, Wind, Gauge } from 'lucide-react'

const ODOR_OPTIONS: Array<{ value: OdorLevel; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'strong', label: 'Strong' },
]

export function MoldSummary() {
  const { formData, updateHazards } = useSurveyStore()
  const mold = formData.hazards.mold

  if (!mold) return null

  const update = (data: Partial<typeof mold>) => {
    updateHazards({ mold: { ...mold, ...data } })
  }

  // Calculate totals and size category
  const calculations = useMemo(() => {
    let totalSqFt = 0
    let hasHeavySeverity = false
    let hasPorousMaterial = false

    mold.affectedAreas.forEach((area) => {
      totalSqFt += area.squareFootage || 0
      if (area.severity === 'heavy') hasHeavySeverity = true
      if (area.materialType === 'porous') hasPorousMaterial = true
    })

    // Size category calculation
    // Small: <10 sq ft
    // Medium: 10-100 sq ft
    // Large: >100 sq ft OR HVAC contaminated
    let sizeCategory: MoldSizeCategory = 'small'
    if (totalSqFt >= 10) sizeCategory = 'medium'
    if (totalSqFt > 100 || mold.hvacContaminated === true) sizeCategory = 'large'

    return {
      totalSqFt,
      hasHeavySeverity,
      hasPorousMaterial,
      sizeCategory,
    }
  }, [mold.affectedAreas, mold.hvacContaminated])

  const sizeCategoryInfo: Record<MoldSizeCategory, { label: string; color: string; bgColor: string }> = {
    small: { label: 'Small (<10 sq ft)', color: 'text-green-700', bgColor: 'bg-green-100' },
    medium: { label: 'Medium (10-100 sq ft)', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    large: { label: 'Large (>100 sq ft)', color: 'text-red-700', bgColor: 'bg-red-100' },
  }

  const categoryInfo = sizeCategoryInfo[calculations.sizeCategory]

  return (
    <div className="space-y-4 p-4 bg-muted rounded-xl">
      <h4 className="font-semibold flex items-center gap-2">
        <Gauge className="w-5 h-5" />
        Summary & Assessment
      </h4>

      {/* Total Area */}
      <div className="text-center p-3 bg-background rounded-lg">
        <p className="text-3xl font-bold">{calculations.totalSqFt.toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">total sq ft affected</p>
      </div>

      {/* Size Category */}
      <div className={cn('p-3 rounded-lg', categoryInfo.bgColor)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Size Category</span>
          <span className={cn('font-bold', categoryInfo.color)}>
            {categoryInfo.label}
          </span>
        </div>
      </div>

      {/* HVAC Contamination */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Wind className="w-4 h-4" />
          HVAC System Contaminated?
        </Label>
        <YesNoNaToggle
          value={mold.hvacContaminated}
          onChange={(value) => update({ hvacContaminated: value })}
          naLabel="Not Checked"
        />
        {mold.hvacContaminated === true && (
          <div className="flex items-start gap-2 p-3 bg-red-100 rounded-lg text-sm text-red-700">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>HVAC contamination automatically escalates project to Large scope</p>
          </div>
        )}
      </div>

      {/* Odor Level */}
      <div>
        <Label>Odor Level</Label>
        <SegmentedControl
          value={mold.odorLevel}
          onChange={(value) => update({ odorLevel: value })}
          options={ODOR_OPTIONS}
          className="mt-2"
        />
      </div>

      {/* Warnings */}
      {calculations.hasHeavySeverity && (
        <div className="flex items-start gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Heavy mold growth detected — professional remediation required</p>
        </div>
      )}

      {calculations.hasPorousMaterial && (
        <div className="flex items-start gap-2 text-sm text-yellow-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Porous materials affected — likely require removal</p>
        </div>
      )}

      {mold.moistureSourceStatus === 'active' && (
        <div className="flex items-start gap-2 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Active moisture source — must be fixed before remediation</p>
        </div>
      )}
    </div>
  )
}
