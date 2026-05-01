// Survey Form Types for Mobile UI

export type SurveySection =
  | 'property'
  | 'access'
  | 'environment'
  | 'hazards'
  | 'photos'
  | 'review'

export const SURVEY_SECTIONS: SurveySection[] = [
  'property',
  'access',
  'environment',
  'hazards',
  'photos',
  'review',
]

export const SECTION_LABELS: Record<SurveySection, string> = {
  property: 'Property',
  access: 'Access',
  environment: 'Environment',
  hazards: 'Areas & Hazards',
  photos: 'Photos & Videos',
  review: 'Review',
}

// Property Section
export type BuildingType =
  | 'residential_single'
  | 'residential_multi'
  | 'commercial'
  | 'industrial'
  | 'institutional'
  | 'warehouse'
  | 'retail'

export type ConstructionType =
  | 'wood_frame'
  | 'concrete'
  | 'steel'
  | 'masonry'
  | 'mixed'

export type OccupancyStatus = 'occupied' | 'vacant' | 'partial'

export interface PropertyData {
  address: string
  city: string
  state: string
  zip: string
  buildingType: BuildingType | null
  yearBuilt: number | null
  squareFootage: number | null
  stories: number
  constructionType: ConstructionType | null
  occupancyStatus: OccupancyStatus | null
  occupiedHoursStart: string | null
  occupiedHoursEnd: string | null
  ownerName: string
  ownerPhone: string
  ownerEmail: string
}

// Access Section
export type AccessRestriction =
  | 'gated_locked'
  | 'security_required'
  | 'escort_required'
  | 'background_check'
  | 'hours_restricted'

export type EquipmentAccess = 'adequate' | 'limited' | 'difficult'

export interface AccessData {
  hasRestrictions: boolean | null
  restrictions: AccessRestriction[]
  restrictionNotes: string
  parkingAvailable: boolean | null
  loadingZoneAvailable: boolean | null
  equipmentAccess: EquipmentAccess | null
  equipmentAccessNotes: string
  elevatorAvailable: boolean | null
  minDoorwayWidth: number
}

// Environment Section
export type MoistureIssue =
  | 'none_observed'
  | 'active_leak'
  | 'water_staining'
  | 'standing_water'
  | 'condensation'
  | 'musty_odor'

export type StructuralConcern =
  | 'foundation_cracks'
  | 'settlement'
  | 'roof_damage'
  | 'compromised_envelope'

export type HvacSystemType =
  | 'central_air'
  | 'window_units'
  | 'heat_pump'
  | 'radiant_baseboard'
  | 'forced_air_furnace'
  | 'no_hvac'
  | 'other'

export interface EnvironmentData {
  temperature: number | null
  humidity: number | null
  hvacType: HvacSystemType | null
  moistureIssues: MoistureIssue[]
  moistureNotes: string
  hasStructuralConcerns: boolean | null
  structuralConcerns: StructuralConcern[]
  structuralNotes: string
  utilityShutoffsLocated: boolean | null
}

// ============================================
// Area-Based Hazard System
// ============================================

export type HazardType = 'asbestos' | 'mold' | 'lead' | 'vermiculite' | 'other'

export type QuantityUnit = 'linear_ft' | 'sq_ft' | 'cu_ft'

// Condition types by hazard category
export type AsbestosCondition = 'intact' | 'damaged' | 'friable'
export type MoldCondition = 'light' | 'moderate' | 'heavy'
export type LeadCondition = 'intact' | 'damaged' | 'friable'
export type HazardCondition = AsbestosCondition | MoldCondition

// Containment levels (OSHA)
export type ContainmentLevel = 'type_i' | 'type_ii' | 'type_iii'

// Material type options by hazard type
export const MATERIAL_TYPES_BY_HAZARD: Record<HazardType, { value: string; label: string }[]> = {
  asbestos: [
    { value: 'floor_tile_9x9', label: 'Floor Tile (9x9)' },
    { value: 'floor_tile_12x12', label: 'Floor Tile (12x12)' },
    { value: 'sheet_vinyl', label: 'Sheet Vinyl' },
    { value: 'pipe_insulation', label: 'Pipe Insulation' },
    { value: 'boiler_insulation', label: 'Boiler Insulation' },
    { value: 'ceiling_tile', label: 'Ceiling Tile' },
    { value: 'drywall_joint_compound', label: 'Drywall/Joint Compound' },
    { value: 'transite_siding', label: 'Transite Siding' },
    { value: 'roofing_felt', label: 'Roofing Felt' },
    { value: 'vermiculite_insulation', label: 'Vermiculite Insulation' },
    { value: 'other', label: 'Other' },
  ],
  mold: [
    { value: 'drywall', label: 'Drywall' },
    { value: 'wood_framing', label: 'Wood Framing/Studs' },
    { value: 'insulation', label: 'Insulation' },
    { value: 'concrete_masonry', label: 'Concrete/Masonry' },
    { value: 'ceiling_tile', label: 'Ceiling Tile' },
    { value: 'subfloor', label: 'Subfloor' },
    { value: 'other', label: 'Other' },
  ],
  lead: [
    { value: 'interior_wall', label: 'Interior Wall' },
    { value: 'exterior_siding', label: 'Exterior Siding' },
    { value: 'window', label: 'Window (frame/sill/sash)' },
    { value: 'door', label: 'Door (frame/slab)' },
    { value: 'baseboard_trim', label: 'Baseboard/Trim' },
    { value: 'structural_steel', label: 'Structural Steel' },
    { value: 'other', label: 'Other' },
  ],
  vermiculite: [
    { value: 'attic_insulation', label: 'Attic Insulation' },
    { value: 'wall_insulation', label: 'Wall Insulation' },
    { value: 'other', label: 'Other' },
  ],
  other: [
    { value: 'other', label: 'Other (describe in notes)' },
  ],
}

// Condition options by hazard type
export const CONDITION_OPTIONS_BY_HAZARD: Record<HazardType, { value: string; label: string }[]> = {
  asbestos: [
    { value: 'intact', label: 'Intact' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'friable', label: 'Friable' },
  ],
  mold: [
    { value: 'light', label: 'Light' },
    { value: 'moderate', label: 'Moderate' },
    { value: 'heavy', label: 'Heavy' },
  ],
  lead: [
    { value: 'intact', label: 'Intact' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'friable', label: 'Friable' },
  ],
  vermiculite: [
    { value: 'intact', label: 'Intact' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'friable', label: 'Friable' },
  ],
  other: [
    { value: 'intact', label: 'Intact' },
    { value: 'damaged', label: 'Damaged' },
  ],
}

// Containment auto-suggestion logic
export function suggestContainment(hazardType: HazardType, condition: string): ContainmentLevel {
  if (hazardType === 'asbestos' || hazardType === 'vermiculite') {
    if (condition === 'friable') return 'type_iii'
    if (condition === 'damaged') return 'type_ii'
    return 'type_i'
  }
  // Lead and Mold default to Type II
  return 'type_ii'
}

export const CONTAINMENT_LABELS: Record<ContainmentLevel, string> = {
  type_i: 'Type I (Mini)',
  type_ii: 'Type II (Standard)',
  type_iii: 'Type III (Large/Complex)',
}

// Single hazard record within an area
export interface AreaHazard {
  id: string
  hazard_type: HazardType
  material_type: string
  condition: string
  quantity: number | null
  unit: QuantityUnit
  containment_level: ContainmentLevel | null
  notes: string
}

// An area with its hazards and photos
export interface SurveyArea {
  id: string
  area_name: string
  floor_level: string
  hazards: AreaHazard[]
  photo_ids: string[] // references to photos by ID
}

// The hazards section now contains areas
export interface HazardsData {
  areas: SurveyArea[]
}

// ============================================
// Legacy type aliases for backward compatibility
// ============================================
export type AsbestosMaterialType = string
export type AsbestosMaterialCondition = string
export interface AsbestosMaterial {
  id: string
  materialType: AsbestosMaterialType | null
  quantity: number | null
  unit: QuantityUnit
  location: string
  condition: AsbestosMaterialCondition | null
  friable: boolean
  pipeDiameter: number | null
  pipeThickness: number | null
  notes: string
}
export interface AsbestosData {
  materials: AsbestosMaterial[]
  estimatedWasteVolume: number | null
  containmentLevel: number | null
  epaNotificationRequired: boolean
}
export type MoldSeverity = string
export type MoldSizeCategory = string
export type OdorLevel = string
export type MoistureSourceType = string
export type MoistureSourceStatus = string
export type MoldMaterialType = string
export type MoldAffectedMaterial = string
export interface MoldAffectedArea {
  id: string
  location: string
  squareFootage: number | null
  materialType: MoldMaterialType | null
  materialsAffected: MoldAffectedMaterial[]
  severity: MoldSeverity | null
  moistureReading: number | null
}
export interface MoldData {
  moistureSourceIdentified: boolean | null
  moistureSourceTypes: MoistureSourceType[]
  moistureSourceStatus: MoistureSourceStatus | null
  moistureSourceNotes: string
  affectedAreas: MoldAffectedArea[]
  hvacContaminated: boolean | null
  odorLevel: OdorLevel | null
  sizeCategory: MoldSizeCategory | null
}
export type LeadWorkScope = string
export type LeadComponentType = string
export type LeadWorkMethod = string
export interface LeadComponent {
  id: string
  componentType: LeadComponentType | null
  location: string
  quantity: number | null
  unit: QuantityUnit | 'count'
  condition: string | null
}
export interface LeadData {
  childrenUnder6Present: boolean | null
  workScope: LeadWorkScope | null
  components: LeadComponent[]
  rrpRuleApplies: boolean
  workMethod: LeadWorkMethod | null
  totalWorkArea: number
}
export interface OtherHazardData {
  description: string
  notes: string
}

// Photos Section
export type PhotoCategory =
  | 'exterior'
  | 'interior'
  | 'hazard_area'
  | 'utility_access'
  | 'other'

export type MediaType = 'image' | 'video'

export interface PhotoData {
  id: string
  blob: Blob | null
  dataUrl: string | null
  // Storage object path within the survey-photos bucket. Set when an
  // item has been uploaded to remote storage; the render path uses it
  // to generate signed URLs. For forensic rows this mirrors
  // `original_path` for backwards compatibility with legacy readers.
  path: string | null
  timestamp: string
  gpsCoordinates: {
    latitude: number
    longitude: number
  } | null
  category: PhotoCategory
  area_id: string | null // links photo to a specific area
  location: string
  caption: string
  mediaType: MediaType
  mimeType: string | null
  fileSize: number | null

  // Forensic pipeline. Populated by the stamp endpoint after the
  // original is uploaded. See SurveyPhotoMetadata for the full contract.
  original_path?: string | null
  stamped_path?: string | null
  file_hash?: string | null
  captured_at?: string | null
  captured_lat?: number | null
  captured_lng?: number | null
  device_make?: string | null
  device_model?: string | null
  stamp_status?: 'pending' | 'stamped' | 'failed' | 'skipped' | null
  stamp_error?: string | null
}

export interface PhotosData {
  photos: PhotoData[]
}

// Complete Survey Form Data
export interface SurveyFormData {
  property: PropertyData
  access: AccessData
  environment: EnvironmentData
  hazards: HazardsData
  photos: PhotosData
  notes: string
}

// Initial/Default Values
export const DEFAULT_PROPERTY_DATA: PropertyData = {
  address: '',
  city: '',
  state: '',
  zip: '',
  buildingType: null,
  yearBuilt: null,
  squareFootage: null,
  stories: 1,
  constructionType: null,
  occupancyStatus: null,
  occupiedHoursStart: null,
  occupiedHoursEnd: null,
  ownerName: '',
  ownerPhone: '',
  ownerEmail: '',
}

export const DEFAULT_ACCESS_DATA: AccessData = {
  hasRestrictions: null,
  restrictions: [],
  restrictionNotes: '',
  parkingAvailable: null,
  loadingZoneAvailable: null,
  equipmentAccess: null,
  equipmentAccessNotes: '',
  elevatorAvailable: null,
  minDoorwayWidth: 32,
}

export const DEFAULT_ENVIRONMENT_DATA: EnvironmentData = {
  temperature: null,
  humidity: null,
  hvacType: null,
  moistureIssues: [],
  moistureNotes: '',
  hasStructuralConcerns: null,
  structuralConcerns: [],
  structuralNotes: '',
  utilityShutoffsLocated: null,
}

export const DEFAULT_HAZARDS_DATA: HazardsData = {
  areas: [],
}

export const DEFAULT_PHOTOS_DATA: PhotosData = {
  photos: [],
}

export const DEFAULT_SURVEY_FORM_DATA: SurveyFormData = {
  property: DEFAULT_PROPERTY_DATA,
  access: DEFAULT_ACCESS_DATA,
  environment: DEFAULT_ENVIRONMENT_DATA,
  hazards: DEFAULT_HAZARDS_DATA,
  photos: DEFAULT_PHOTOS_DATA,
  notes: '',
}

// Photo Requirements by Category
export const PHOTO_REQUIREMENTS: Record<PhotoCategory, { label: string; required: number }> = {
  exterior: { label: 'Exterior', required: 4 },
  interior: { label: 'Interior', required: 0 },
  hazard_area: { label: 'Hazard Areas', required: 0 },
  utility_access: { label: 'Utility/Access', required: 0 },
  other: { label: 'Other', required: 0 },
}

// Default values for new area hazard
export const DEFAULT_AREA_HAZARD: Omit<AreaHazard, 'id'> = {
  hazard_type: 'asbestos',
  material_type: '',
  condition: '',
  quantity: null,
  unit: 'sq_ft',
  containment_level: null,
  notes: '',
}

// Default values for new survey area
export const DEFAULT_SURVEY_AREA: Omit<SurveyArea, 'id'> = {
  area_name: '',
  floor_level: '',
  hazards: [],
  photo_ids: [],
}
