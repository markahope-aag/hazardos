'use client'

import { useMemo } from 'react'
import { useSurveyStore } from '@/lib/stores/survey-store'
import {
  PHOTO_REQUIREMENTS,
  CONTAINMENT_LABELS,
  ContainmentLevel,
} from '@/lib/stores/survey-types'
import {
  Building2,
  Car,
  Thermometer,
  AlertTriangle,
  Camera,
  MapPin,
  Clock,
  User
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function SurveySummary() {
  const { formData, startedAt } = useSurveyStore()
  const { property, access, environment, hazards, photos } = formData

  const summary = useMemo(() => {
    const propertyInfo = {
      address: [property.address, property.city, property.state, property.zip]
        .filter(Boolean)
        .join(', '),
      buildingType: property.buildingType?.replace(/_/g, ' ') || 'Not specified',
      yearBuilt: property.yearBuilt || 'Unknown',
      sqft: property.squareFootage?.toLocaleString() || 'Not specified',
      stories: property.stories,
    }

    // Area-based hazard aggregation
    const areas = hazards.areas
    const totalAreas = areas.length
    const totalHazards = areas.reduce((sum, a) => sum + a.hazards.length, 0)

    // Aggregate by hazard type
    const hazardTypeAgg: Record<string, { count: number; totalQty: number; unit: string }> = {}
    for (const area of areas) {
      for (const h of area.hazards) {
        if (!hazardTypeAgg[h.hazard_type]) {
          hazardTypeAgg[h.hazard_type] = { count: 0, totalQty: 0, unit: h.unit }
        }
        hazardTypeAgg[h.hazard_type].count++
        hazardTypeAgg[h.hazard_type].totalQty += h.quantity || 0
      }
    }

    const photoCount = photos.photos.length
    const exteriorPhotoCount = photos.photos.filter((p: { category: string }) => p.category === 'exterior').length

    return {
      property: propertyInfo,
      totalAreas,
      totalHazards,
      hazardTypeAgg,
      areas,
      photoCount,
      exteriorPhotoCount,
      hasRestrictions: access.hasRestrictions,
      restrictionCount: access.restrictions.length,
    }
  }, [property, access, hazards, photos])

  const formattedStartTime = startedAt
    ? new Date(startedAt).toLocaleString()
    : 'Unknown'

  const HAZARD_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
    asbestos: { bg: 'bg-orange-100', text: 'text-orange-800', icon: '⚠️' },
    mold: { bg: 'bg-green-100', text: 'text-green-800', icon: '🦠' },
    lead: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🎨' },
    vermiculite: { bg: 'bg-amber-100', text: 'text-amber-800', icon: '🏔️' },
    other: { bg: 'bg-purple-100', text: 'text-purple-800', icon: '📋' },
  }

  return (
    <div className="space-y-4">
      {/* Property Card */}
      <div className="p-4 bg-muted rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-muted-foreground" />
          <h4 className="font-semibold">Property</h4>
        </div>
        <div className="space-y-1 text-sm">
          <p className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <span>{summary.property.address || 'No address'}</span>
          </p>
          <p><strong>Type:</strong> {summary.property.buildingType}</p>
          <p><strong>Year Built:</strong> {summary.property.yearBuilt}</p>
          <p><strong>Size:</strong> {summary.property.sqft} sq ft &bull; {summary.property.stories} stor{summary.property.stories === 1 ? 'y' : 'ies'}</p>
        </div>
        {property.ownerName && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{property.ownerName}</span>
            </p>
          </div>
        )}
      </div>

      {/* Areas & Hazards Card */}
      <div className="p-4 bg-muted rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
            <h4 className="font-semibold">Areas & Hazards</h4>
          </div>
          <span className="text-sm text-muted-foreground">
            {summary.totalAreas} area{summary.totalAreas !== 1 ? 's' : ''} &bull; {summary.totalHazards} hazard{summary.totalHazards !== 1 ? 's' : ''}
          </span>
        </div>

        {summary.totalAreas === 0 ? (
          <p className="text-sm text-muted-foreground">No areas documented</p>
        ) : (
          <div className="space-y-3">
            {/* Per-area summary */}
            {summary.areas.map((area) => (
              <div key={area.id} className="p-3 bg-background rounded-lg border text-sm">
                <div className="font-medium">{area.area_name || 'Unnamed Area'}</div>
                {area.floor_level && <div className="text-muted-foreground text-xs">{area.floor_level}</div>}
                <div className="flex flex-wrap gap-1 mt-1">
                  {area.hazards.map((h) => (
                    <Badge key={h.id} variant="outline" className="text-xs">
                      {h.hazard_type} {h.quantity ? `(${h.quantity} ${h.unit.replace('_', ' ')})` : ''}
                    </Badge>
                  ))}
                </div>
                {area.hazards.some((h) => h.containment_level) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Containment: {Array.from(new Set(area.hazards.filter((h) => h.containment_level).map((h) => CONTAINMENT_LABELS[h.containment_level as ContainmentLevel]))).join(', ')}
                  </div>
                )}
              </div>
            ))}

            {/* Aggregate totals by hazard type */}
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Totals by Hazard Type</p>
              <div className="space-y-1">
                {Object.entries(summary.hazardTypeAgg).map(([type, agg]) => {
                  const colors = HAZARD_COLORS[type] || HAZARD_COLORS.other
                  return (
                    <div key={type} className={`flex items-center gap-2 p-2 ${colors.bg} rounded-lg`}>
                      <span>{colors.icon}</span>
                      <span className={`font-medium capitalize ${colors.text}`}>{type}</span>
                      <span className={`text-sm ${colors.text}`}>
                        &mdash; {agg.count} item{agg.count !== 1 ? 's' : ''}
                        {agg.totalQty > 0 && `, ${agg.totalQty.toLocaleString()} ${agg.unit.replace('_', ' ')} total`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Access & Environment */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-muted rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Car className="w-4 h-4 text-muted-foreground" />
            <h5 className="font-medium text-sm">Access</h5>
          </div>
          <p className="text-sm text-muted-foreground">
            {summary.hasRestrictions
              ? `${summary.restrictionCount} restriction${summary.restrictionCount !== 1 ? 's' : ''}`
              : 'No restrictions'}
          </p>
        </div>

        <div className="p-3 bg-muted rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-muted-foreground" />
            <h5 className="font-medium text-sm">Environment</h5>
          </div>
          <p className="text-sm text-muted-foreground">
            {environment.temperature !== null ? `${environment.temperature}°F` : '--'}
            {' \u2022 '}
            {environment.humidity !== null ? `${environment.humidity}%` : '--'} RH
          </p>
        </div>
      </div>

      {/* Photos */}
      <div className="p-4 bg-muted rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-muted-foreground" />
            <h4 className="font-semibold">Photos</h4>
          </div>
          <span className="text-sm text-muted-foreground">
            {summary.photoCount} total
          </span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {summary.exteriorPhotoCount} exterior ({PHOTO_REQUIREMENTS.exterior.required} required)
        </p>
      </div>

      {/* Survey Timing */}
      <div className="p-3 bg-muted/50 rounded-xl flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Survey started: {formattedStartTime}</span>
      </div>
    </div>
  )
}
