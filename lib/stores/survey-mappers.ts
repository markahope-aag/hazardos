/**
 * Survey Mappers
 * Converts between Zustand store format and Supabase database format
 */

import type {
  SurveyFormData,
  PropertyData,
  AccessData,
  EnvironmentData,
  HazardsData,
  PhotoData,
} from './survey-types'

// Use permissive types for DB JSONB fields
type JsonValue = Record<string, unknown>

interface SurveyStoreState {
  currentSurveyId: string | null
  customerId: string | null
  formData: SurveyFormData
  startedAt: string | null
}

/**
 * Convert store format to database insert/update format
 */
export function mapStoreToDb(
  state: SurveyStoreState,
  organizationId: string,
  options?: {
    status?: 'draft' | 'submitted'
    submittedAt?: string
  }
): Record<string, unknown> {
  const { formData, startedAt, customerId } = state
  const { property, access, environment, hazards, photos, notes } = formData

  // Determine primary hazard type from areas for legacy field
  const allHazardTypes = hazards.areas.flatMap((a) => a.hazards.map((h) => h.hazard_type))
  const primaryHazardType = allHazardTypes[0] || 'other'

  // Map photos to metadata format
  const photoMetadata = photos.photos
    .filter((p) => p.dataUrl)
    .map((p) => ({
      id: p.id,
      url: p.dataUrl || '',
      category: p.category,
      area_id: p.area_id || null,
      location: p.location,
      caption: p.caption,
      gpsCoordinates: p.gpsCoordinates,
      timestamp: p.timestamp,
    }))

  return {
    organization_id: organizationId,
    customer_id: customerId,
    // Property fields
    site_address: property.address,
    site_city: property.city,
    site_state: property.state,
    site_zip: property.zip,
    building_type: property.buildingType,
    year_built: property.yearBuilt,
    building_sqft: property.squareFootage,
    stories: property.stories,
    construction_type: property.constructionType,
    occupancy_status: property.occupancyStatus,
    occupied: property.occupancyStatus === 'occupied',
    owner_name: property.ownerName,
    owner_phone: property.ownerPhone,
    owner_email: property.ownerEmail,
    customer_name: property.ownerName || 'Site Survey',
    customer_email: property.ownerEmail,
    customer_phone: property.ownerPhone,
    job_name: property.address || 'New Survey',
    // JSONB fields — serialize as-is
    access_info: access as unknown as JsonValue,
    environment_info: environment as unknown as JsonValue,
    hazard_assessments: hazards as unknown as JsonValue,
    photo_metadata: photoMetadata,
    // Legacy hazard field
    hazard_type: primaryHazardType,
    // Notes
    technician_notes: notes,
    // Timestamps
    started_at: startedAt,
    submitted_at: options?.submittedAt,
    // Status
    status: options?.status || 'draft',
    updated_at: new Date().toISOString(),
  }
}

/**
 * Convert database format back to store format
 */
export function mapDbToStore(db: Record<string, unknown>): Partial<SurveyStoreState> {
  const accessInfo = (db.access_info as Partial<AccessData>) || {}
  const environmentInfo = (db.environment_info as Partial<EnvironmentData>) || {}
  const hazardAssessments = (db.hazard_assessments as Partial<HazardsData>) || {}
  const photoMetadata = (db.photo_metadata as Array<Record<string, unknown>>) || []

  const property: PropertyData = {
    address: (db.site_address as string) || '',
    city: (db.site_city as string) || '',
    state: (db.site_state as string) || '',
    zip: (db.site_zip as string) || '',
    buildingType: (db.building_type as PropertyData['buildingType']) || null,
    yearBuilt: (db.year_built as number) ?? null,
    squareFootage: (db.building_sqft as number) ?? null,
    stories: (db.stories as number) || 1,
    constructionType: (db.construction_type as PropertyData['constructionType']) || null,
    occupancyStatus: (db.occupancy_status as PropertyData['occupancyStatus']) || null,
    occupiedHoursStart: null,
    occupiedHoursEnd: null,
    ownerName: (db.owner_name as string) || '',
    ownerPhone: (db.owner_phone as string) || '',
    ownerEmail: (db.owner_email as string) || '',
  }

  const access: AccessData = {
    hasRestrictions: accessInfo.hasRestrictions ?? null,
    restrictions: (accessInfo.restrictions || []) as AccessData['restrictions'],
    restrictionNotes: accessInfo.restrictionNotes || '',
    parkingAvailable: accessInfo.parkingAvailable ?? null,
    loadingZoneAvailable: accessInfo.loadingZoneAvailable ?? null,
    equipmentAccess: accessInfo.equipmentAccess || null,
    equipmentAccessNotes: accessInfo.equipmentAccessNotes || '',
    elevatorAvailable: accessInfo.elevatorAvailable ?? null,
    minDoorwayWidth: accessInfo.minDoorwayWidth || 32,
  }

  const environment: EnvironmentData = {
    temperature: environmentInfo.temperature ?? null,
    humidity: environmentInfo.humidity ?? null,
    moistureIssues: (environmentInfo.moistureIssues || []) as EnvironmentData['moistureIssues'],
    moistureNotes: environmentInfo.moistureNotes || '',
    hasStructuralConcerns: environmentInfo.hasStructuralConcerns ?? null,
    structuralConcerns: (environmentInfo.structuralConcerns || []) as EnvironmentData['structuralConcerns'],
    structuralNotes: environmentInfo.structuralNotes || '',
    utilityShutoffsLocated: environmentInfo.utilityShutoffsLocated ?? null,
  }

  // Hazards — new area-based structure or legacy format
  const hazards: HazardsData = {
    areas: (hazardAssessments.areas || []) as HazardsData['areas'],
  }

  // Map photos
  const photos: PhotoData[] = photoMetadata.map((p) => ({
    id: (p.id as string) || '',
    blob: null,
    dataUrl: (p.url as string) || '',
    timestamp: (p.timestamp as string) || '',
    gpsCoordinates: p.gpsCoordinates as PhotoData['gpsCoordinates'],
    category: (p.category as PhotoData['category']) || 'other',
    area_id: (p.area_id as string) || null,
    location: (p.location as string) || '',
    caption: (p.caption as string) || '',
  }))

  return {
    currentSurveyId: db.id as string,
    customerId: db.customer_id as string | null,
    formData: {
      property,
      access,
      environment,
      hazards,
      photos: { photos },
      notes: (db.technician_notes as string) || '',
    },
    startedAt: db.started_at as string | null,
  }
}

/**
 * Create initial database record for a new survey
 */
export function createInitialDbRecord(
  organizationId: string,
  customerId?: string
): Record<string, unknown> {
  return {
    organization_id: organizationId,
    customer_id: customerId || null,
    job_name: 'New Survey',
    customer_name: 'Site Survey',
    site_address: '',
    site_city: '',
    site_state: '',
    site_zip: '',
    hazard_type: 'other',
    status: 'draft',
    hazard_assessments: { areas: [] },
    access_info: {
      hasRestrictions: null,
      restrictions: [],
      restrictionNotes: '',
      parkingAvailable: null,
      loadingZoneAvailable: null,
      equipmentAccess: null,
      equipmentAccessNotes: '',
      elevatorAvailable: null,
      minDoorwayWidth: 32,
    },
    environment_info: {
      temperature: null,
      humidity: null,
      moistureIssues: [],
      moistureNotes: '',
      hasStructuralConcerns: null,
      structuralConcerns: [],
      structuralNotes: '',
      utilityShutoffsLocated: null,
    },
    photo_metadata: [],
    started_at: new Date().toISOString(),
  }
}
