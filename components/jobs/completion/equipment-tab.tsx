'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2 } from 'lucide-react'
import type { EquipmentTabProps } from './types'

export function EquipmentTab({
  data,
  newEquipment,
  onNewEquipmentChange,
  onAddEquipment,
  onDeleteEquipment,
}: EquipmentTabProps) {
  return (
    <div className="flex-1 px-4 py-4 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Equipment Used</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="equipment_name">Equipment Name</Label>
            <Input
              id="equipment_name"
              placeholder="e.g., HEPA negative air machine"
              value={newEquipment.equipment_name}
              onChange={(e) => onNewEquipmentChange({ ...newEquipment, equipment_name: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="equipment_type">Type</Label>
              <Input
                id="equipment_type"
                placeholder="e.g., air scrubber"
                value={newEquipment.equipment_type}
                onChange={(e) => onNewEquipmentChange({ ...newEquipment, equipment_type: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="equipment_quantity">Quantity</Label>
              <Input
                id="equipment_quantity"
                type="number"
                placeholder="1"
                value={newEquipment.quantity}
                onChange={(e) => onNewEquipmentChange({ ...newEquipment, quantity: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="is_rental"
              checked={newEquipment.is_rental}
              onCheckedChange={(checked) => onNewEquipmentChange({ ...newEquipment, is_rental: checked === true })}
            />
            <Label htmlFor="is_rental" className="font-normal">This is rented equipment</Label>
          </div>

          {newEquipment.is_rental && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rental_start_date">Rental Start</Label>
                <Input
                  id="rental_start_date"
                  type="date"
                  value={newEquipment.rental_start_date}
                  onChange={(e) => onNewEquipmentChange({ ...newEquipment, rental_start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rental_end_date">Rental End</Label>
                <Input
                  id="rental_end_date"
                  type="date"
                  value={newEquipment.rental_end_date}
                  onChange={(e) => onNewEquipmentChange({ ...newEquipment, rental_end_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="rental_rate_daily">Daily Rate</Label>
                <Input
                  id="rental_rate_daily"
                  type="number"
                  step="0.01"
                  placeholder="$0.00"
                  value={newEquipment.rental_rate_daily}
                  onChange={(e) => onNewEquipmentChange({ ...newEquipment, rental_rate_daily: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="equipment_notes">Notes</Label>
            <Input
              id="equipment_notes"
              placeholder="Optional notes"
              value={newEquipment.notes}
              onChange={(e) => onNewEquipmentChange({ ...newEquipment, notes: e.target.value })}
              className="mt-1"
            />
          </div>

          <Button onClick={onAddEquipment} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Equipment
          </Button>
        </CardContent>
      </Card>

      {/* Equipment list */}
      <div className="space-y-2">
        <h3 className="font-medium">Equipment Used</h3>

        {data?.equipment.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No equipment recorded yet
          </p>
        )}

        {data?.equipment.map((item) => (
          <Card key={item.id}>
            <CardContent className="py-3 flex items-center justify-between">
              <div>
                <p className="font-medium">{item.equipment_name}</p>
                <p className="text-sm text-muted-foreground">
                  Qty: {item.quantity}
                  {item.equipment_type && ` - ${item.equipment_type}`}
                  {item.is_rental && item.rental_total != null && ` - $${item.rental_total.toFixed(2)} rental`}
                </p>
                {item.is_rental && (
                  <Badge variant="secondary" className="text-xs mt-1">Rented</Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteEquipment(item.id)}
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
