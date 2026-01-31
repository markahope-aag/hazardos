'use client'

import { useMemo } from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { ContainmentLevel } from '@/lib/stores/survey-types'
import { NumericStepper } from '../inputs'
import { AlertTriangle, FileWarning, Shield } from 'lucide-react'

export function AsbestosSummary() {
  const { formData, updateHazards } = useSurveyStore()
  const asbestos = formData.hazards.asbestos

  if (!asbestos) return null

  // Calculate totals and containment level
  const calculations = useMemo(() => {
    let totalSqFt = 0
    let totalLinearFt = 0
    let totalCuFt = 0
    let hasFriable = false
    let hasSignificantDamage = false

    asbestos.materials.forEach((m) => {
      if (m.friable) hasFriable = true
      if (m.condition === 'significant_damage' || m.condition === 'severe_damage') {
        hasSignificantDamage = true
      }

      const qty = m.quantity || 0
      switch (m.unit) {
        case 'sq_ft':
          totalSqFt += qty
          break
        case 'linear_ft':
          totalLinearFt += qty
          break
        case 'cu_ft':
          totalCuFt += qty
          break
      }
    })

    // Calculate containment level (simplified algorithm)
    // Level 1: Minor, small area, non-friable
    // Level 2: Small-medium area, or some friable
    // Level 3: Large area, friable, or damaged
    // Level 4: Very large, friable, and damaged
    let containmentLevel: ContainmentLevel = 1

    if (totalSqFt > 160 || totalLinearFt > 260 || hasFriable) {
      containmentLevel = 2
    }
    if ((totalSqFt > 160 || totalLinearFt > 260) && hasFriable) {
      containmentLevel = 3
    }
    if (hasSignificantDamage && hasFriable && (totalSqFt > 160 || totalLinearFt > 260)) {
      containmentLevel = 4
    }

    // EPA notification threshold: >160 sq ft or >260 linear ft of friable
    const epaNotificationRequired =
      hasFriable && (totalSqFt > 160 || totalLinearFt > 260)

    return {
      totalSqFt,
      totalLinearFt,
      totalCuFt,
      hasFriable,
      hasSignificantDamage,
      containmentLevel,
      epaNotificationRequired,
    }
  }, [asbestos.materials])

  const containmentLevelInfo: Record<ContainmentLevel, { label: string; color: string; bgColor: string }> = {
    1: { label: 'Level 1 - Minimal', color: 'text-green-700', bgColor: 'bg-green-100' },
    2: { label: 'Level 2 - Limited', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    3: { label: 'Level 3 - Full', color: 'text-orange-700', bgColor: 'bg-orange-100' },
    4: { label: 'Level 4 - Maximum', color: 'text-red-700', bgColor: 'bg-red-100' },
  }

  const levelInfo = containmentLevelInfo[calculations.containmentLevel]

  return (
    <div className="space-y-4 p-4 bg-muted rounded-xl">
      <h4 className="font-semibold flex items-center gap-2">
        <Shield className="w-5 h-5" />
        Summary & Requirements
      </h4>

      {/* Totals */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {calculations.totalSqFt > 0 && (
          <div className="p-2 bg-background rounded-lg">
            <p className="text-2xl font-bold">{calculations.totalSqFt.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">sq ft</p>
          </div>
        )}
        {calculations.totalLinearFt > 0 && (
          <div className="p-2 bg-background rounded-lg">
            <p className="text-2xl font-bold">{calculations.totalLinearFt.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">linear ft</p>
          </div>
        )}
        {calculations.totalCuFt > 0 && (
          <div className="p-2 bg-background rounded-lg">
            <p className="text-2xl font-bold">{calculations.totalCuFt.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">cu ft</p>
          </div>
        )}
      </div>

      {/* Containment Level */}
      <div className={cn('p-3 rounded-lg', levelInfo.bgColor)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Containment Level</span>
          <span className={cn('font-bold', levelInfo.color)}>
            {levelInfo.label}
          </span>
        </div>
        {calculations.hasFriable && (
          <p className="text-xs mt-1 opacity-75">Friable material detected</p>
        )}
      </div>

      {/* EPA Notification */}
      {calculations.epaNotificationRequired && (
        <div className="flex items-start gap-3 p-3 bg-red-100 border border-red-300 rounded-lg">
          <FileWarning className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">EPA Notification Required</p>
            <p className="text-sm text-red-700">
              Project exceeds thresholds (&gt;160 sq ft or &gt;260 linear ft of friable ACM)
            </p>
          </div>
        </div>
      )}

      {/* Estimated Waste Volume */}
      <div>
        <Label>Estimated Waste Volume (cu yards)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          For disposal planning
        </p>
        <NumericStepper
          value={asbestos.estimatedWasteVolume}
          onChange={(value) =>
            updateHazards({
              asbestos: { ...asbestos, estimatedWasteVolume: value },
            })
          }
          min={0}
          max={1000}
          step={1}
          suffix="cu yd"
        />
      </div>

      {/* Warnings */}
      {calculations.hasSignificantDamage && (
        <div className="flex items-start gap-2 text-sm text-yellow-700">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>Damaged ACM present — additional precautions may be required</p>
        </div>
      )}
    </div>
  )
}
