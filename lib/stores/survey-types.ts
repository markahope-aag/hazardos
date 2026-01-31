// Survey Form Types for Mobile UI
// These are independent of database types - will be reconciled after branch merge

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
  hazards: 'Hazards',
  photos: 'Photos',
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

export interface EnvironmentData {
  temperature: number | null
  humidity: number | null
  moistureIssues: MoistureIssue[]
  moistureNotes: string
  hasStructuralConcerns: boolean | null
  structuralConcerns: StructuralConcern[]
  structuralNotes: string
  utilityShutoffsLocated: boolean | null
}

// Hazards Section
export type HazardType = 'asbestos' | 'mold' | 'lead' | 'other'

// Asbestos Types
export type AsbestosMaterialType =
  | 'pipe_insulation'
  | 'boiler_insulation'
  | 'duct_insulation'
  | 'ceiling_tiles'
  | 'spray_applied_ceiling'
  | 'floor_tiles_9x9'
  | 'floor_tiles_12x12'
  | 'sheet_vinyl'
  | 'mastic_adhesive'
  | 'transite_siding'
  | 'roofing_materials'
  | 'vermiculite_insulation'
  | 'drywall_joint_compound'
  | 'other'

export type AsbestosMaterialCondition =
  | 'intact'
  | 'minor_damage'
  | 'significant_damage'
  | 'severe_damage'

export type QuantityUnit = 'linear_ft' | 'sq_ft' | 'cu_ft'

export interface AsbestosMaterial {
  id: string
  materialType: AsbestosMaterialType | null
  quantity: number | null
  unit: QuantityUnit
  location: string
  condition: AsbestosMaterialCondition | null
  friable: boolean
  pipeDiameter: number | null // For pipe insulation
  pipeThickness: number | null // For pipe insulation
  notes: string
}

export type ContainmentLevel = 1 | 2 | 3 | 4

export interface AsbestosData {
  materials: AsbestosMaterial[]
  estimatedWasteVolume: number | null
  containmentLevel: ContainmentLevel | null
  epaNotificationRequired: boolean
}

// Mold Types
export type MoistureSourceType =
  | 'roof_leak'
  | 'plumbing_leak'
  | 'hvac_condensation'
  | 'foundation_intrusion'
  | 'window_leak'
  | 'appliance_overflow'
  | 'unknown'

export type MoistureSourceStatus = 'active' | 'fixed'

export type MoldMaterialType = 'porous' | 'semi_porous' | 'non_porous'

export type MoldAffectedMaterial =
  | 'drywall'
  | 'wood_studs'
  | 'insulation'
  | 'baseboard_trim'
  | 'flooring'
  | 'ceiling'

export type MoldSeverity = 'light' | 'moderate' | 'heavy'

export type MoldSizeCategory = 'small' | 'medium' | 'large'

export type OdorLevel = 'none' | 'mild' | 'moderate' | 'strong'

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

// Lead Types
export type LeadWorkScope = 'interior_only' | 'exterior_only' | 'both'

export type LeadComponentType =
  | 'interior_walls'
  | 'windows_trim'
  | 'doors_frames'
  | 'baseboards'
  | 'stairs_railings'
  | 'cabinets'
  | 'exterior_siding'
  | 'exterior_trim'
  | 'porch_deck'
  | 'fencing'

export type LeadCondition = 'intact' | 'minor_deterioration' | 'significant_deterioration'

export type LeadWorkMethod = 'stabilization' | 'partial_removal' | 'full_abatement'

export interface LeadComponent {
  id: string
  componentType: LeadComponentType | null
  location: string
  quantity: number | null
  unit: QuantityUnit | 'count'
  condition: LeadCondition | null
}

export interface LeadData {
  childrenUnder6Present: boolean | null
  workScope: LeadWorkScope | null
  components: LeadComponent[]
  rrpRuleApplies: boolean
  workMethod: LeadWorkMethod | null
  totalWorkArea: number
}

// Other Hazard
export interface OtherHazardData {
  description: string
  notes: string
}

export interface HazardsData {
  types: HazardType[]
  asbestos: AsbestosData | null
  mold: MoldData | null
  lead: LeadData | null
  other: OtherHazardData | null
}

// Photos Section
export type PhotoCategory =
  | 'exterior'
  | 'interior'
  | 'asbestos_materials'
  | 'mold_areas'
  | 'lead_components'
  | 'utility_access'
  | 'other'

export interface PhotoData {
  id: string
  blob: Blob | null
  dataUrl: string | null
  timestamp: string
  gpsCoordinates: {
    latitude: number
    longitude: number
  } | null
  category: PhotoCategory
  location: string
  caption: string
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
  moistureIssues: [],
  moistureNotes: '',
  hasStructuralConcerns: null,
  structuralConcerns: [],
  structuralNotes: '',
  utilityShutoffsLocated: null,
}

export const DEFAULT_ASBESTOS_DATA: AsbestosData = {
  materials: [],
  estimatedWasteVolume: null,
  containmentLevel: null,
  epaNotificationRequired: false,
}

export const DEFAULT_MOLD_DATA: MoldData = {
  moistureSourceIdentified: null,
  moistureSourceTypes: [],
  moistureSourceStatus: null,
  moistureSourceNotes: '',
  affectedAreas: [],
  hvacContaminated: null,
  odorLevel: null,
  sizeCategory: null,
}

export const DEFAULT_LEAD_DATA: LeadData = {
  childrenUnder6Present: null,
  workScope: null,
  components: [],
  rrpRuleApplies: false,
  workMethod: null,
  totalWorkArea: 0,
}

export const DEFAULT_HAZARDS_DATA: HazardsData = {
  types: [],
  asbestos: null,
  mold: null,
  lead: null,
  other: null,
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
  asbestos_materials: { label: 'Asbestos Materials', required: 0 },
  mold_areas: { label: 'Mold Areas', required: 0 },
  lead_components: { label: 'Lead Components', required: 0 },
  utility_access: { label: 'Utility/Access', required: 0 },
  other: { label: 'Other', required: 0 },
}
