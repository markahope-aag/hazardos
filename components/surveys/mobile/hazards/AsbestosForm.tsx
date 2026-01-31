'use client'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useSurveyStore } from '@/lib/stores/survey-store'
import { AsbestosMaterialCard } from './AsbestosMaterialCard'
import { AsbestosSummary } from './AsbestosSummary'
import { Plus } from 'lucide-react'

export function AsbestosForm() {
  const { formData, addAsbestosMaterial } = useSurveyStore()
  const asbestos = formData.hazards.asbestos

  if (!asbestos) return null

  const handleAddMaterial = () => {
    addAsbestosMaterial()
  }

  return (
    <div className="space-y-6">
      {/* Materials List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-base">Materials Inventory</Label>
          <span className="text-sm text-muted-foreground">
            {asbestos.materials.length} material{asbestos.materials.length !== 1 ? 's' : ''}
          </span>
        </div>

        {asbestos.materials.length === 0 ? (
          <div className="text-center py-8 bg-muted rounded-lg">
            <p className="text-muted-foreground mb-4">
              No materials documented yet
            </p>
            <Button
              type="button"
              onClick={handleAddMaterial}
              className="touch-manipulation min-h-[52px]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add First Material
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {asbestos.materials.map((material, index) => (
              <AsbestosMaterialCard
                key={material.id}
                material={material}
                index={index}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAddMaterial}
              className="w-full touch-manipulation min-h-[52px]"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Another Material
            </Button>
          </div>
        )}
      </div>

      {/* Summary - only show if materials exist */}
      {asbestos.materials.length > 0 && <AsbestosSummary />}
    </div>
  )
}
