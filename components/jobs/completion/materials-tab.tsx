'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2 } from 'lucide-react'
import type { MaterialsTabProps } from './types'

export function MaterialsTab({
  data,
  totalMaterialCost,
  newMaterial,
  onNewMaterialChange,
  onAddMaterial,
  onDeleteMaterial,
}: MaterialsTabProps) {
  return (
    <div className="flex-1 px-4 py-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Material Used</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="material_name">Material Name</Label>
            <Input
              id="material_name"
              placeholder="e.g., Containment bags"
              value={newMaterial.material_name}
              onChange={(e) => onNewMaterialChange({ ...newMaterial, material_name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity_used">Quantity</Label>
              <Input
                id="quantity_used"
                type="number"
                placeholder="0"
                value={newMaterial.quantity_used}
                onChange={(e) => onNewMaterialChange({ ...newMaterial, quantity_used: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                placeholder="bags"
                value={newMaterial.unit}
                onChange={(e) => onNewMaterialChange({ ...newMaterial, unit: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="unit_cost">Unit Cost</Label>
              <Input
                id="unit_cost"
                type="number"
                step="0.01"
                placeholder="$0.00"
                value={newMaterial.unit_cost}
                onChange={(e) => onNewMaterialChange({ ...newMaterial, unit_cost: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <Button onClick={onAddMaterial} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
        </CardContent>
      </Card>

      {/* Materials list */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <h3 className="font-medium">Materials Used</h3>
          <Badge variant="secondary">${totalMaterialCost.toFixed(2)} total</Badge>
        </div>

        {data?.materialUsage.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No materials recorded yet
          </p>
        )}

        {data?.materialUsage.map((material) => (
          <Card key={material.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{material.material_name}</p>
                <p className="text-sm text-muted-foreground">
                  {material.quantity_used} {material.unit || 'units'}
                  {material.total_cost && ` - $${material.total_cost.toFixed(2)}`}
                </p>
                {material.variance_percent !== null && (
                  <Badge
                    variant={material.variance_percent > 10 ? 'destructive' : 'secondary'}
                    className="text-xs mt-1"
                  >
                    {material.variance_percent > 0 ? '+' : ''}{material.variance_percent.toFixed(1)}% vs estimate
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteMaterial(material.id)}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
