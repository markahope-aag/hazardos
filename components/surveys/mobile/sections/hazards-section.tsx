'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Plus, ChevronLeft, MapPin, Trash2, Camera, AlertTriangle } from 'lucide-react'
import { useSurveyStore } from '@/lib/stores/survey-store'
import {
  HazardType,
  SurveyArea,
  AreaHazard,
  MATERIAL_TYPES_BY_HAZARD,
  CONDITION_OPTIONS_BY_HAZARD,
  CONTAINMENT_LABELS,
  suggestContainment,
  QuantityUnit,
  ContainmentLevel,
} from '@/lib/stores/survey-types'

type Screen = 'area-list' | 'area-detail' | 'hazard-capture'

const HAZARD_TYPE_OPTIONS: { value: HazardType; label: string; icon: string }[] = [
  { value: 'asbestos', label: 'Asbestos', icon: '⚠️' },
  { value: 'mold', label: 'Mold', icon: '🦠' },
  { value: 'lead', label: 'Lead', icon: '🎨' },
  { value: 'vermiculite', label: 'Vermiculite', icon: '🏔️' },
  { value: 'other', label: 'Other', icon: '📋' },
]

const UNIT_OPTIONS: { value: QuantityUnit; label: string }[] = [
  { value: 'sq_ft', label: 'sq ft' },
  { value: 'linear_ft', label: 'linear ft' },
  { value: 'cu_ft', label: 'cu ft' },
]

export function HazardsSection() {
  const areas = useSurveyStore((s) => s.formData.hazards.areas)
  const photos = useSurveyStore((s) => s.formData.photos.photos)
  const addArea = useSurveyStore((s) => s.addArea)
  const updateArea = useSurveyStore((s) => s.updateArea)
  const removeArea = useSurveyStore((s) => s.removeArea)
  const addHazardToArea = useSurveyStore((s) => s.addHazardToArea)
  const updateHazard = useSurveyStore((s) => s.updateHazard)
  const removeHazard = useSurveyStore((s) => s.removeHazard)

  const [screen, setScreen] = useState<Screen>('area-list')
  const [activeAreaId, setActiveAreaId] = useState<string | null>(null)
  const [activeHazardId, setActiveHazardId] = useState<string | null>(null)

  const activeArea = areas.find((a) => a.id === activeAreaId) || null
  const activeHazard = activeArea?.hazards.find((h) => h.id === activeHazardId) || null

  const handleAddArea = () => {
    const id = addArea()
    setActiveAreaId(id)
    setScreen('area-detail')
  }

  const handleOpenArea = (area: SurveyArea) => {
    setActiveAreaId(area.id)
    setScreen('area-detail')
  }

  const handleAddHazard = () => {
    if (!activeAreaId) return
    const id = addHazardToArea(activeAreaId)
    setActiveHazardId(id)
    setScreen('hazard-capture')
  }

  const handleOpenHazard = (hazard: AreaHazard) => {
    setActiveHazardId(hazard.id)
    setScreen('hazard-capture')
  }

  const handleBack = () => {
    if (screen === 'hazard-capture') {
      setActiveHazardId(null)
      setScreen('area-detail')
    } else if (screen === 'area-detail') {
      setActiveAreaId(null)
      setScreen('area-list')
    }
  }

  // ============================================
  // Area List Screen
  // ============================================
  if (screen === 'area-list') {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Areas & Hazards</h3>
          <p className="text-sm text-muted-foreground">Document hazards by area</p>
        </div>

        {areas.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No areas documented yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add areas of the property where hazards are present
            </p>
            <Button onClick={handleAddArea} size="lg" className="min-h-[52px] touch-manipulation">
              <Plus className="h-5 w-5 mr-2" />Add Area
            </Button>
          </div>
        ) : (
          <>
            {areas.map((area) => {
              const totalQty = area.hazards.reduce((sum, h) => sum + (h.quantity || 0), 0)
              const photoCount = area.photo_ids.length
              const hazardTypes = [...new Set(area.hazards.map((h) => h.hazard_type))]

              return (
                <Card
                  key={area.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors touch-manipulation"
                  onClick={() => handleOpenArea(area)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-base">
                          {area.area_name || <span className="text-muted-foreground italic">Unnamed Area</span>}
                        </div>
                        {area.floor_level && (
                          <div className="text-sm text-muted-foreground">{area.floor_level}</div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {hazardTypes.map((t) => (
                            <Badge key={t} variant="outline" className="text-xs capitalize">{t}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>{area.hazards.length} hazard{area.hazards.length !== 1 ? 's' : ''}</div>
                        {totalQty > 0 && <div>{totalQty.toLocaleString()} total</div>}
                        {photoCount > 0 && (
                          <div className="flex items-center gap-1 justify-end">
                            <Camera className="h-3 w-3" />{photoCount}
                          </div>
                        )}
                      </div>
                    </div>
                    {area.hazards.length === 0 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />No hazards — tap to add
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            <Button onClick={handleAddArea} variant="outline" className="w-full min-h-[52px] touch-manipulation">
              <Plus className="h-5 w-5 mr-2" />Add Area
            </Button>
          </>
        )}
      </div>
    )
  }

  // ============================================
  // Area Detail Screen
  // ============================================
  if (screen === 'area-detail' && activeArea) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack} className="touch-manipulation min-h-[44px] min-w-[44px]">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-lg font-semibold">Area Details</h3>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Area Name *</Label>
            <Input
              value={activeArea.area_name}
              onChange={(e) => updateArea(activeArea.id, { area_name: e.target.value })}
              placeholder="e.g., Basement, Room 101, Exterior North Wall"
              className="min-h-[48px]"
            />
          </div>
          <div>
            <Label>Floor Level</Label>
            <Input
              value={activeArea.floor_level}
              onChange={(e) => updateArea(activeArea.id, { floor_level: e.target.value })}
              placeholder="e.g., Basement, 1st Floor, Attic"
              className="min-h-[48px]"
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Hazards</Label>

          {activeArea.hazards.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">No hazards in this area yet</p>
            </div>
          ) : (
            activeArea.hazards.map((hazard) => {
              const materialLabel = MATERIAL_TYPES_BY_HAZARD[hazard.hazard_type]?.find(
                (m) => m.value === hazard.material_type
              )?.label || hazard.material_type

              return (
                <Card
                  key={hazard.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors touch-manipulation"
                  onClick={() => handleOpenHazard(hazard)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium capitalize">{hazard.hazard_type}</div>
                        <div className="text-sm text-muted-foreground">
                          {materialLabel}{hazard.quantity ? ` · ${hazard.quantity} ${hazard.unit.replace('_', ' ')}` : ''}
                        </div>
                        {hazard.containment_level && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            {CONTAINMENT_LABELS[hazard.containment_level]}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => { e.stopPropagation(); removeHazard(activeArea.id, hazard.id) }}
                        className="text-destructive hover:text-destructive min-h-[44px] min-w-[44px]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}

          <Button onClick={handleAddHazard} variant="outline" className="w-full min-h-[52px] touch-manipulation">
            <Plus className="h-5 w-5 mr-2" />Add Hazard
          </Button>
        </div>

        {/* Area Photos */}
        <div className="space-y-2">
          <Label className="text-base">Area Photos</Label>
          <div className="text-sm text-muted-foreground">
            {activeArea.photo_ids.length} photo{activeArea.photo_ids.length !== 1 ? 's' : ''} linked
          </div>
          {activeArea.photo_ids.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {activeArea.photo_ids.map((pid) => {
                const photo = photos.find((p) => p.id === pid)
                return photo?.dataUrl ? (
                  <div key={pid} className="w-16 h-16 rounded border overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.dataUrl} alt={photo.caption || 'Area photo'} className="w-full h-full object-cover" />
                  </div>
                ) : null
              })}
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          onClick={() => { removeArea(activeArea.id); handleBack() }}
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/5 min-h-[48px]"
        >
          <Trash2 className="h-4 w-4 mr-2" />Remove Area
        </Button>
      </div>
    )
  }

  // ============================================
  // Hazard Capture Screen
  // ============================================
  if (screen === 'hazard-capture' && activeArea && activeHazard) {
    const materialOptions = MATERIAL_TYPES_BY_HAZARD[activeHazard.hazard_type] || []
    const conditionOptions = CONDITION_OPTIONS_BY_HAZARD[activeHazard.hazard_type] || []

    const handleHazardTypeChange = (type: HazardType) => {
      updateHazard(activeArea.id, activeHazard.id, {
        hazard_type: type,
        material_type: '',
        condition: '',
        containment_level: null,
      })
    }

    const handleConditionChange = (condition: string) => {
      const suggested = suggestContainment(activeHazard.hazard_type, condition)
      updateHazard(activeArea.id, activeHazard.id, {
        condition,
        containment_level: suggested,
      })
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={handleBack} className="touch-manipulation min-h-[44px] min-w-[44px]">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="text-lg font-semibold">Capture Hazard</h3>
        </div>

        {/* Hazard Type Tiles */}
        <div>
          <Label className="text-base">Hazard Type</Label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {HAZARD_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleHazardTypeChange(opt.value)}
                className={`p-3 rounded-lg border-2 text-center transition-colors touch-manipulation min-h-[64px] ${
                  activeHazard.hazard_type === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-xl">{opt.icon}</div>
                <div className="text-xs font-medium mt-1">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Material Type */}
        <div>
          <Label>Material Type</Label>
          <Select
            value={activeHazard.material_type}
            onValueChange={(v) => updateHazard(activeArea.id, activeHazard.id, { material_type: v })}
          >
            <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select material" /></SelectTrigger>
            <SelectContent>
              {materialOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Condition */}
        <div>
          <Label>Condition</Label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {conditionOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleConditionChange(opt.value)}
                className={`p-3 rounded-lg border-2 text-center text-sm font-medium transition-colors touch-manipulation min-h-[48px] ${
                  activeHazard.condition === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quantity</Label>
            <Input
              type="number"
              min="0"
              value={activeHazard.quantity ?? ''}
              onChange={(e) => updateHazard(activeArea.id, activeHazard.id, {
                quantity: e.target.value ? parseFloat(e.target.value) : null,
              })}
              placeholder="0"
              className="min-h-[48px]"
            />
          </div>
          <div>
            <Label>Unit</Label>
            <Select
              value={activeHazard.unit}
              onValueChange={(v) => updateHazard(activeArea.id, activeHazard.id, { unit: v as QuantityUnit })}
            >
              <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIT_OPTIONS.map((u) => (
                  <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Containment Level */}
        <div>
          <Label>Containment Level {activeHazard.containment_level && <span className="text-xs text-muted-foreground">(auto-suggested)</span>}</Label>
          <Select
            value={activeHazard.containment_level || ''}
            onValueChange={(v) => updateHazard(activeArea.id, activeHazard.id, { containment_level: v as ContainmentLevel })}
          >
            <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Select containment" /></SelectTrigger>
            <SelectContent>
              {Object.entries(CONTAINMENT_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Notes */}
        <div>
          <Label>Notes</Label>
          <Textarea
            value={activeHazard.notes}
            onChange={(e) => updateHazard(activeArea.id, activeHazard.id, { notes: e.target.value })}
            placeholder="Additional details about this hazard..."
            rows={3}
            className="min-h-[80px]"
          />
        </div>

        <Button onClick={handleBack} className="w-full min-h-[52px] touch-manipulation">
          Done
        </Button>
      </div>
    )
  }

  return null
}
