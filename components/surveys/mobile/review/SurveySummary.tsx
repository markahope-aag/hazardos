'use client'

import { useMemo } from 'react'
import { useSurveyStore } from '@/lib/stores/survey-store'
import {
  PHOTO_REQUIREMENTS,
  MoldSizeCategory
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

export function SurveySummary() {
  const { formData, startedAt } = useSurveyStore()
  const { property, access, environment, hazards, photos } = formData

  const summary = useMemo(() => {
    // Property summary
    const propertyInfo = {
      address: [property.address, property.city, property.state, property.zip]
        .filter(Boolean)
        .join(', '),
      buildingType: property.buildingType?.replace(/_/g, ' ') || 'Not specified',
      yearBuilt: property.yearBuilt || 'Unknown',
      sqft: property.squareFootage?.toLocaleString() || 'Not specified',
      stories: property.stories,
    }

    // Hazard counts
    const hazardTypes = hazards.types
    const asbestosMaterialCount = hazards.asbestos?.materials.length || 0
    const moldAreaCount = hazards.mold?.affectedAreas.length || 0
    const leadComponentCount = hazards.lead?.components.length || 0

    // Calculate total affected areas for mold
    const moldTotalSqFt = hazards.mold?.affectedAreas.reduce(
      (sum: number, area: { squareFootage: number | null }) => sum + (area.squareFootage || 0), 0
    ) || 0

    // Determine mold size category
    let moldSizeCategory: MoldSizeCategory | null = null
    if (hazards.mold) {
      if (moldTotalSqFt >= 100 || hazards.mold.hvacContaminated) {
        moldSizeCategory = 'large'
      } else if (moldTotalSqFt >= 10) {
        moldSizeCategory = 'medium'
      } else {
        moldSizeCategory = 'small'
      }
    }

    // Photo counts
    const photoCount = photos.photos.length
    const exteriorPhotoCount = photos.photos.filter((p: { category: string }) => p.category === 'exterior').length

    return {
      property: propertyInfo,
      hazardTypes,
      asbestosMaterialCount,
      moldAreaCount,
      moldTotalSqFt,
      moldSizeCategory,
      leadComponentCount,
      photoCount,
      exteriorPhotoCount,
      hasRestrictions: access.hasRestrictions,
      restrictionCount: access.restrictions.length,
    }
  }, [
    formData,
    property.address,
    property.city,
    property.state,
    property.zip,
    property.buildingType,
    property.yearBuilt,
    property.squareFootage,
    property.stories,
    access.hasRestrictions,
    access.restrictions.length,
    hazards.types,
    hazards.asbestos?.materials.length,
    hazards.lead?.components.length,
    hazards.mold,
    photos.photos
  ])

  const formattedStartTime = startedAt
    ? new Date(startedAt).toLocaleString()
    : 'Unknown'

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
          <p><strong>Size:</strong> {summary.property.sqft} sq ft • {summary.property.stories} stor{summary.property.stories === 1 ? 'y' : 'ies'}</p>
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

      {/* Hazards Card */}
      <div className="p-4 bg-muted rounded-xl space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          <h4 className="font-semibold">Hazards Identified</h4>
        </div>

        {summary.hazardTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hazards documented</p>
        ) : (
          <div className="space-y-2 text-sm">
            {summary.hazardTypes.includes('asbestos') && (
              <div className="flex items-center gap-2 p-2 bg-orange-100 rounded-lg">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-medium text-orange-800">Asbestos</p>
                  <p className="text-orange-700">
                    {summary.asbestosMaterialCount} material{summary.asbestosMaterialCount !== 1 ? 's' : ''} documented
                  </p>
                </div>
              </div>
            )}

            {summary.hazardTypes.includes('mold') && (
              <div className="flex items-center gap-2 p-2 bg-green-100 rounded-lg">
                <span className="text-lg">🦠</span>
                <div>
                  <p className="font-medium text-green-800">Mold</p>
                  <p className="text-green-700">
                    {summary.moldAreaCount} area{summary.moldAreaCount !== 1 ? 's' : ''} • {summary.moldTotalSqFt.toLocaleString()} sq ft
                    {summary.moldSizeCategory && ` • ${summary.moldSizeCategory.charAt(0).toUpperCase() + summary.moldSizeCategory.slice(1)} project`}
                  </p>
                </div>
              </div>
            )}

            {summary.hazardTypes.includes('lead') && (
              <div className="flex items-center gap-2 p-2 bg-blue-100 rounded-lg">
                <span className="text-lg">🎨</span>
                <div>
                  <p className="font-medium text-blue-800">Lead Paint</p>
                  <p className="text-blue-700">
                    {summary.leadComponentCount} component{summary.leadComponentCount !== 1 ? 's' : ''} documented
                  </p>
                </div>
              </div>
            )}

            {summary.hazardTypes.includes('other') && (
              <div className="flex items-center gap-2 p-2 bg-purple-100 rounded-lg">
                <span className="text-lg">⚡</span>
                <div>
                  <p className="font-medium text-purple-800">Other Hazards</p>
                  <p className="text-purple-700">
                    {hazards.other?.description || 'See details'}
                  </p>
                </div>
              </div>
            )}
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
            {' • '}
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
