'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { TimeSelect } from '@/components/ui/time-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSurveyStore } from '@/lib/stores/survey-store'
import {
  BuildingType,
  ConstructionType,
  OccupancyStatus,
} from '@/lib/stores/survey-types'
import {
  SegmentedControl,
  RadioCardGroup,
} from '../inputs'
import { logger, formatError } from '@/lib/utils/logger'
import {
  MapPin,
  Loader2,
  AlertTriangle,
  Home,
  Building2,
  Building,
  Factory,
  School,
  Warehouse,
  Store,
} from 'lucide-react'

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
]

const BUILDING_TYPE_OPTIONS: Array<{
  value: BuildingType
  label: string
  description: string
  icon: typeof Home
}> = [
  { value: 'residential_single', label: 'Single-Family', description: 'House, townhome', icon: Home },
  { value: 'residential_multi', label: 'Multi-Family', description: 'Apartments, condos', icon: Building2 },
  { value: 'commercial', label: 'Commercial', description: 'Office, professional', icon: Building },
  { value: 'industrial', label: 'Industrial', description: 'Manufacturing, plants', icon: Factory },
  { value: 'institutional', label: 'Institutional', description: 'Schools, hospitals', icon: School },
  { value: 'warehouse', label: 'Warehouse', description: 'Storage, distribution', icon: Warehouse },
  { value: 'retail', label: 'Retail', description: 'Shops, restaurants', icon: Store },
]

const CONSTRUCTION_TYPE_OPTIONS: Array<{ value: ConstructionType; label: string }> = [
  { value: 'wood_frame', label: 'Wood Frame' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'steel', label: 'Steel' },
  { value: 'masonry', label: 'Masonry' },
  { value: 'mixed', label: 'Mixed' },
]

const OCCUPANCY_OPTIONS: Array<{ value: OccupancyStatus; label: string }> = [
  { value: 'occupied', label: 'Occupied' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'partial', label: 'Partial' },
]

const STORIES_OPTIONS = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3+' },
]

export function PropertySection() {
  const { formData, updateProperty } = useSurveyStore()
  const { property } = formData
  const [isGettingLocation, setIsGettingLocation] = useState(false)

  const handleGetLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }

    setIsGettingLocation(true)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        })
      })

      const { latitude, longitude } = position.coords

      // Reverse-geocode through our backend so the Mapbox access token
      // stays on the server. The endpoint returns a normalized shape
      // we can drop straight into the form.
      try {
        const response = await fetch(
          `/api/geocode/reverse?lat=${latitude}&lng=${longitude}`,
        )

        if (!response.ok) {
          throw new Error(`Geocoding failed (${response.status})`)
        }

        const data = await response.json()

        if (data.streetAddress || data.city || data.zip) {
          updateProperty({
            address: data.streetAddress || '',
            city: data.city || '',
            state: data.state || '',
            zip: data.zip || '',
          })
        } else {
          alert('Could not determine address from location. Please enter manually.')
        }
      } catch (geocodeError) {
        logger.error(
          { error: formatError(geocodeError, 'GEOCODING_ERROR') },
          'Geocoding error'
        )
        alert('Could not look up address. Please enter it manually.')
      }
    } catch (error) {
      logger.error(
        { error: formatError(error, 'LOCATION_ERROR') },
        'Error getting location'
      )
      // Duck-type the error rather than `instanceof GeolocationPositionError` —
      // that constructor isn't exposed as a global on every runtime
      // (notably iOS standalone PWA), and `instanceof` against an
      // undefined identifier throws a ReferenceError that escapes
      // this catch and silently breaks the button.
      const code = (error as { code?: number } | null)?.code
      if (typeof code === 'number') {
        switch (code) {
          case 1: // PERMISSION_DENIED
            alert('Location permission denied. Please allow location access or enter the address manually.')
            break
          case 2: // POSITION_UNAVAILABLE
            alert('Location information unavailable. Please enter the address manually.')
            break
          case 3: // TIMEOUT
            alert('Location request timed out. Please try again or enter the address manually.')
            break
          default:
            alert('Unable to get your location. Please enter the address manually.')
        }
      } else {
        alert('Unable to get your location. Please enter the address manually.')
      }
    } finally {
      setIsGettingLocation(false)
    }
  }

  const isPre1978 = property.yearBuilt !== null && property.yearBuilt < 1978

  return (
    <div className="space-y-6">
      {/* Address Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Property Address</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGetLocation}
            disabled={isGettingLocation}
            className="touch-manipulation min-h-[44px]"
          >
            {isGettingLocation ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4 mr-2" />
            )}
            Use Location
          </Button>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              value={property.address}
              onChange={(e) => updateProperty({ address: e.target.value })}
              placeholder="123 Main Street"
              className="min-h-[52px] text-base"
            />
          </div>

          <div>
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={property.city}
              onChange={(e) => updateProperty({ city: e.target.value })}
              placeholder="City"
              className="min-h-[52px] text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="state">State</Label>
              <Select
                value={property.state}
                onValueChange={(value) => updateProperty({ state: value })}
              >
                <SelectTrigger id="state" className="min-h-[52px] text-base">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={property.zip}
                onChange={(e) => updateProperty({ zip: e.target.value })}
                placeholder="12345"
                inputMode="numeric"
                maxLength={10}
                className="min-h-[52px] text-base"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Building Type */}
      <section className="space-y-3">
        <Label>Building Type</Label>
        <RadioCardGroup
          value={property.buildingType}
          onChange={(value) => updateProperty({ buildingType: value })}
          options={BUILDING_TYPE_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
            description: opt.description,
            icon: opt.icon,
          }))}
          columns={2}
          size="sm"
        />
      </section>

      {/* Year Built */}
      <section className="space-y-3">
        <Label>Year Built</Label>
        <Input
          type="number"
          inputMode="numeric"
          min={1800}
          max={2030}
          placeholder="e.g., 1985"
          value={property.yearBuilt || ''}
          onChange={(e) => updateProperty({ yearBuilt: e.target.value ? parseInt(e.target.value) : null })}
          className="min-h-[52px] text-base"
        />
        {isPre1978 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">
              Pre-1978 building — lead paint and asbestos inspection recommended
            </p>
          </div>
        )}
      </section>

      {/* Square Footage */}
      <section className="space-y-3">
        <Label>Square Footage</Label>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={999999}
          placeholder="e.g., 2500"
          value={property.squareFootage || ''}
          onChange={(e) => updateProperty({ squareFootage: e.target.value ? parseInt(e.target.value) : null })}
          className="min-h-[52px] text-base"
        />
      </section>

      {/* Stories */}
      <section className="space-y-3">
        <Label>Number of Stories</Label>
        <SegmentedControl
          value={property.stories}
          onChange={(value) => updateProperty({ stories: value })}
          options={STORIES_OPTIONS}
          size="lg"
        />
      </section>

      {/* Construction Type */}
      <section className="space-y-3">
        <Label>Construction Type</Label>
        <Select
          value={property.constructionType || ''}
          onValueChange={(value) => updateProperty({ constructionType: value as ConstructionType })}
        >
          <SelectTrigger className="min-h-[52px] text-base">
            <SelectValue placeholder="Select construction type" />
          </SelectTrigger>
          <SelectContent>
            {CONSTRUCTION_TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </section>

      {/* Occupancy Status */}
      <section className="space-y-3">
        <Label>Occupancy Status</Label>
        <SegmentedControl
          value={property.occupancyStatus}
          onChange={(value) => updateProperty({ occupancyStatus: value })}
          options={OCCUPANCY_OPTIONS}
          size="lg"
        />

        {/* Show hours if occupied */}
        {property.occupancyStatus === 'occupied' && (
          <div className="space-y-3 p-4 bg-muted rounded-lg mt-3">
            <p className="text-sm font-medium">Hours of Operation</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="hoursStart" className="text-xs">Start</Label>
                <TimeSelect
                  id="hoursStart"
                  value={property.occupiedHoursStart || ''}
                  onChange={(v) => updateProperty({ occupiedHoursStart: v })}
                  className="min-h-[48px]"
                />
              </div>
              <div>
                <Label htmlFor="hoursEnd" className="text-xs">End</Label>
                <TimeSelect
                  id="hoursEnd"
                  value={property.occupiedHoursEnd || ''}
                  onChange={(v) => updateProperty({ occupiedHoursEnd: v })}
                  className="min-h-[48px]"
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Owner Contact (Optional) */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold">Owner/Contact (Optional)</h3>

        <div>
          <Label htmlFor="ownerName">Name</Label>
          <Input
            id="ownerName"
            value={property.ownerName}
            onChange={(e) => updateProperty({ ownerName: e.target.value })}
            placeholder="Property owner or contact name"
            className="min-h-[52px] text-base"
          />
        </div>

        <div>
          <Label htmlFor="ownerPhone">Phone</Label>
          <Input
            id="ownerPhone"
            type="tel"
            value={property.ownerPhone}
            onChange={(e) => updateProperty({ ownerPhone: e.target.value })}
            placeholder="(555) 123-4567"
            className="min-h-[52px] text-base"
          />
        </div>

        <div>
          <Label htmlFor="ownerEmail">Email</Label>
          <Input
            id="ownerEmail"
            type="email"
            value={property.ownerEmail}
            onChange={(e) => updateProperty({ ownerEmail: e.target.value })}
            placeholder="owner@example.com"
            className="min-h-[52px] text-base"
          />
        </div>
      </section>
    </div>
  )
}
