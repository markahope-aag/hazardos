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
  AsbestosMaterialType,
  AsbestosMaterialCondition,
  QuantityUnit,
  ContainmentLevel,
  MoistureSourceType,
  MoistureSourceStatus,
  MoldMaterialType,
  MoldAffectedMaterial,
  MoldSeverity,
  OdorLevel,
  MoldSizeCategory,
  LeadWorkScope,
  LeadComponentType,
  LeadCondition,
  LeadWorkMethod,
} from './survey-types'

import type {
  SiteSurveyInsert,
  SiteSurveyUpdate,
  SiteSurvey,
  SurveyAccessInfo,
  SurveyEnvironmentInfo,
  SurveyHazardAssessments,
  SurveyPhotoMetadata,
} from '@/types/database'

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
): SiteSurveyUpdate {
  const { formData, startedAt, customerId } = state
  const { property, access, environment, hazards, photos, notes } = formData

  // Map access data to database format
  const accessInfo: SurveyAccessInfo = {
    hasRestrictions: access.hasRestrictions,
    restrictions: access.restrictions,
    restrictionNotes: access.restrictionNotes,
    parkingAvailable: access.parkingAvailable,
    loadingZoneAvailable: access.loadingZoneAvailable,
    equipmentAccess: access.equipmentAccess,
    equipmentAccessNotes: access.equipmentAccessNotes,
    elevatorAvailable: access.elevatorAvailable,
    minDoorwayWidth: access.minDoorwayWidth,
  }

  // Map environment data to database format
  const environmentInfo: SurveyEnvironmentInfo = {
    temperature: environment.temperature,
    humidity: environment.humidity,
    moistureIssues: environment.moistureIssues,
    moistureNotes: environment.moistureNotes,
    hasStructuralConcerns: environment.hasStructuralConcerns,
    structuralConcerns: environment.structuralConcerns,
    structuralNotes: environment.structuralNotes,
    utilityShutoffsLocated: environment.utilityShutoffsLocated,
  }

  // Map hazard assessments to database format
  const hazardAssessments: SurveyHazardAssessments = {
    types: hazards.types,
    asbestos: hazards.asbestos
      ? {
          materials: hazards.asbestos.materials.map((m) => ({
            id: m.id,
            materialType: m.materialType,
            quantity: m.quantity,
            unit: m.unit,
            location: m.location,
            condition: m.condition,
            friable: m.friable,
            pipeDiameter: m.pipeDiameter,
            pipeThickness: m.pipeThickness,
            notes: m.notes,
          })),
          estimatedWasteVolume: hazards.asbestos.estimatedWasteVolume,
          containmentLevel: hazards.asbestos.containmentLevel,
          epaNotificationRequired: hazards.asbestos.epaNotificationRequired,
        }
      : null,
    mold: hazards.mold
      ? {
          moistureSourceIdentified: hazards.mold.moistureSourceIdentified,
          moistureSourceTypes: hazards.mold.moistureSourceTypes,
          moistureSourceStatus: hazards.mold.moistureSourceStatus,
          moistureSourceNotes: hazards.mold.moistureSourceNotes,
          affectedAreas: hazards.mold.affectedAreas.map((a) => ({
            id: a.id,
            location: a.location,
            squareFootage: a.squareFootage,
            materialType: a.materialType,
            materialsAffected: a.materialsAffected,
            severity: a.severity,
            moistureReading: a.moistureReading,
          })),
          hvacContaminated: hazards.mold.hvacContaminated,
          odorLevel: hazards.mold.odorLevel,
          sizeCategory: hazards.mold.sizeCategory,
        }
      : null,
    lead: hazards.lead
      ? {
          childrenUnder6Present: hazards.lead.childrenUnder6Present,
          workScope: hazards.lead.workScope,
          components: hazards.lead.components.map((c) => ({
            id: c.id,
            componentType: c.componentType,
            location: c.location,
            quantity: c.quantity,
            unit: c.unit,
            condition: c.condition,
          })),
          rrpRuleApplies: hazards.lead.rrpRuleApplies,
          workMethod: hazards.lead.workMethod,
          totalWorkArea: hazards.lead.totalWorkArea,
        }
      : null,
    other: hazards.other
      ? {
          description: hazards.other.description,
          notes: hazards.other.notes,
        }
      : null,
  }

  // Map photos to metadata format (URLs will be added after upload)
  const photoMetadata: SurveyPhotoMetadata[] = photos.photos
    .filter((p) => p.dataUrl) // Only include photos with data
    .map((p) => ({
      id: p.id,
      url: p.dataUrl || '', // Will be replaced with remote URL after upload
      category: p.category,
      location: p.location,
      caption: p.caption,
      gpsCoordinates: p.gpsCoordinates,
      timestamp: p.timestamp,
    }))

  // Determine primary hazard type for legacy field
  const primaryHazardType = hazards.types[0] || 'other'

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
    // Default customer info from owner if not set via customer_id
    customer_name: property.ownerName || 'Site Survey',
    customer_email: property.ownerEmail,
    customer_phone: property.ownerPhone,
    // Job name from address
    job_name: property.address || 'New Survey',
    // JSONB fields
    access_info: accessInfo,
    environment_info: environmentInfo,
    hazard_assessments: hazardAssessments,
    photo_metadata: photoMetadata,
    // Legacy hazard field
    hazard_type: primaryHazardType as 'asbestos' | 'mold' | 'lead' | 'vermiculite' | 'other',
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
export function mapDbToStore(db: SiteSurvey): Partial<SurveyStoreState> {
  const accessInfo = (db.access_info as SurveyAccessInfo) || {}
  const environmentInfo = (db.environment_info as SurveyEnvironmentInfo) || {}
  const hazardAssessments = (db.hazard_assessments as SurveyHazardAssessments) || { types: [] }
  const photoMetadata = (db.photo_metadata as SurveyPhotoMetadata[]) || []

  // Map property data
  const property: PropertyData = {
    address: db.site_address || '',
    city: db.site_city || '',
    state: db.site_state || '',
    zip: db.site_zip || '',
    buildingType: (db.building_type as PropertyData['buildingType']) || null,
    yearBuilt: db.year_built,
    squareFootage: db.building_sqft,
    stories: db.stories || 1,
    constructionType: (db.construction_type as PropertyData['constructionType']) || null,
    occupancyStatus: (db.occupancy_status as PropertyData['occupancyStatus']) || null,
    occupiedHoursStart: null, // Not stored in DB currently
    occupiedHoursEnd: null,
    ownerName: db.owner_name || '',
    ownerPhone: db.owner_phone || '',
    ownerEmail: db.owner_email || '',
  }

  // Map access data
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

  // Map environment data
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

  // Map hazards data
  const hazards: HazardsData = {
    types: hazardAssessments.types || [],
    asbestos: hazardAssessments.asbestos
      ? {
          materials: hazardAssessments.asbestos.materials.map((m) => ({
            id: m.id,
            materialType: m.materialType as AsbestosMaterialType | null,
            quantity: m.quantity,
            unit: (m.unit as QuantityUnit) || 'sq_ft',
            location: m.location || '',
            condition: m.condition as AsbestosMaterialCondition | null,
            friable: m.friable || false,
            pipeDiameter: m.pipeDiameter,
            pipeThickness: m.pipeThickness,
            notes: m.notes || '',
          })),
          estimatedWasteVolume: hazardAssessments.asbestos.estimatedWasteVolume,
          containmentLevel: hazardAssessments.asbestos.containmentLevel as ContainmentLevel | null,
          epaNotificationRequired: hazardAssessments.asbestos.epaNotificationRequired || false,
        }
      : null,
    mold: hazardAssessments.mold
      ? {
          moistureSourceIdentified: hazardAssessments.mold.moistureSourceIdentified,
          moistureSourceTypes: (hazardAssessments.mold.moistureSourceTypes || []) as MoistureSourceType[],
          moistureSourceStatus: hazardAssessments.mold.moistureSourceStatus as MoistureSourceStatus | null,
          moistureSourceNotes: hazardAssessments.mold.moistureSourceNotes || '',
          affectedAreas: hazardAssessments.mold.affectedAreas.map((a) => ({
            id: a.id,
            location: a.location || '',
            squareFootage: a.squareFootage,
            materialType: a.materialType as MoldMaterialType | null,
            materialsAffected: (a.materialsAffected || []) as MoldAffectedMaterial[],
            severity: a.severity as MoldSeverity | null,
            moistureReading: a.moistureReading,
          })),
          hvacContaminated: hazardAssessments.mold.hvacContaminated,
          odorLevel: hazardAssessments.mold.odorLevel as OdorLevel | null,
          sizeCategory: hazardAssessments.mold.sizeCategory as MoldSizeCategory | null,
        }
      : null,
    lead: hazardAssessments.lead
      ? {
          childrenUnder6Present: hazardAssessments.lead.childrenUnder6Present,
          workScope: hazardAssessments.lead.workScope as LeadWorkScope | null,
          components: hazardAssessments.lead.components.map((c) => ({
            id: c.id,
            componentType: c.componentType as LeadComponentType | null,
            location: c.location || '',
            quantity: c.quantity,
            unit: (c.unit as QuantityUnit | 'count') || 'sq_ft',
            condition: c.condition as LeadCondition | null,
          })),
          rrpRuleApplies: hazardAssessments.lead.rrpRuleApplies || false,
          workMethod: hazardAssessments.lead.workMethod as LeadWorkMethod | null,
          totalWorkArea: hazardAssessments.lead.totalWorkArea || 0,
        }
      : null,
    other: hazardAssessments.other
      ? {
          description: hazardAssessments.other.description || '',
          notes: hazardAssessments.other.notes || '',
        }
      : null,
  }

  // Map photos (note: these are remote URLs from DB)
  const photos: PhotoData[] = photoMetadata.map((p) => ({
    id: p.id,
    blob: null, // Not stored locally after sync
    dataUrl: p.url, // Remote URL becomes the dataUrl for display
    timestamp: p.timestamp,
    gpsCoordinates: p.gpsCoordinates,
    category: p.category as PhotoData['category'],
    location: p.location || '',
    caption: p.caption || '',
  }))

  return {
    currentSurveyId: db.id,
    customerId: db.customer_id,
    formData: {
      property,
      access,
      environment,
      hazards,
      photos: { photos },
      notes: db.technician_notes || '',
    },
    startedAt: db.started_at,
  }
}

/**
 * Create initial database record for a new survey
 */
export function createInitialDbRecord(
  organizationId: string,
  customerId?: string
): SiteSurveyInsert {
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
    hazard_assessments: { types: [], asbestos: null, mold: null, lead: null, other: null } as SurveyHazardAssessments,
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
    } as SurveyAccessInfo,
    environment_info: {
      temperature: null,
      humidity: null,
      moistureIssues: [],
      moistureNotes: '',
      hasStructuralConcerns: null,
      structuralConcerns: [],
      structuralNotes: '',
      utilityShutoffsLocated: null,
    } as SurveyEnvironmentInfo,
    photo_metadata: [],
    started_at: new Date().toISOString(),
  }
}
