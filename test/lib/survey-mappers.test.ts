import { describe, it, expect } from 'vitest'
import {
  mapStoreToDb,
  mapDbToStore,
  createInitialDbRecord
} from '@/lib/stores/survey-mappers'
import type { SiteSurvey } from '@/types/database'

describe('Survey Mappers', () => {
  describe('createInitialDbRecord', () => {
    it('should create initial record with organization_id', () => {
      const result = createInitialDbRecord('org-123')

      expect(result.organization_id).toBe('org-123')
      expect(result.job_name).toBe('New Survey')
      expect(result.customer_name).toBe('Site Survey')
      expect(result.status).toBe('draft')
    })

    it('should set customer_id when provided', () => {
      const result = createInitialDbRecord('org-123', 'customer-456')

      expect(result.customer_id).toBe('customer-456')
    })

    it('should set customer_id to null when not provided', () => {
      const result = createInitialDbRecord('org-123')

      expect(result.customer_id).toBeNull()
    })

    it('should initialize empty address fields', () => {
      const result = createInitialDbRecord('org-123')

      expect(result.site_address).toBe('')
      expect(result.site_city).toBe('')
      expect(result.site_state).toBe('')
      expect(result.site_zip).toBe('')
    })

    it('should set default hazard_type to other', () => {
      const result = createInitialDbRecord('org-123')

      expect(result.hazard_type).toBe('other')
    })

    it('should initialize hazard_assessments with empty types', () => {
      const result = createInitialDbRecord('org-123')

      expect(result.hazard_assessments).toEqual({
        types: [],
        asbestos: null,
        mold: null,
        lead: null,
        other: null
      })
    })

    it('should initialize access_info with defaults', () => {
      const result = createInitialDbRecord('org-123')

      expect(result.access_info).toEqual({
        hasRestrictions: null,
        restrictions: [],
        restrictionNotes: '',
        parkingAvailable: null,
        loadingZoneAvailable: null,
        equipmentAccess: null,
        equipmentAccessNotes: '',
        elevatorAvailable: null,
        minDoorwayWidth: 32
      })
    })

    it('should initialize environment_info with defaults', () => {
      const result = createInitialDbRecord('org-123')

      expect(result.environment_info).toEqual({
        temperature: null,
        humidity: null,
        moistureIssues: [],
        moistureNotes: '',
        hasStructuralConcerns: null,
        structuralConcerns: [],
        structuralNotes: '',
        utilityShutoffsLocated: null
      })
    })

    it('should initialize empty photo_metadata', () => {
      const result = createInitialDbRecord('org-123')

      expect(result.photo_metadata).toEqual([])
    })

    it('should set started_at to current timestamp', () => {
      const before = new Date().toISOString()
      const result = createInitialDbRecord('org-123')
      const after = new Date().toISOString()

      expect(result.started_at).toBeDefined()
      expect(result.started_at! >= before).toBe(true)
      expect(result.started_at! <= after).toBe(true)
    })
  })

  describe('mapStoreToDb', () => {
    const baseStoreState = {
      currentSurveyId: 'survey-1',
      customerId: 'customer-1',
      startedAt: '2026-01-15T10:00:00Z',
      formData: {
        property: {
          address: '123 Main St',
          city: 'Springfield',
          state: 'IL',
          zip: '62701',
          buildingType: null,
          yearBuilt: null,
          squareFootage: null,
          stories: 1,
          constructionType: null,
          occupancyStatus: 'occupied' as const,
          occupiedHoursStart: null,
          occupiedHoursEnd: null,
          ownerName: 'John Doe',
          ownerPhone: '555-123-4567',
          ownerEmail: 'john@example.com'
        },
        access: {
          hasRestrictions: false,
          restrictions: [],
          restrictionNotes: '',
          parkingAvailable: true,
          loadingZoneAvailable: null,
          equipmentAccess: 'limited' as const,
          equipmentAccessNotes: 'No elevator',
          elevatorAvailable: false,
          minDoorwayWidth: 36
        },
        environment: {
          temperature: 72,
          humidity: 45,
          moistureIssues: [],
          moistureNotes: '',
          hasStructuralConcerns: false,
          structuralConcerns: [],
          structuralNotes: '',
          utilityShutoffsLocated: true
        },
        hazards: {
          types: ['asbestos' as const],
          asbestos: {
            materials: [{
              id: 'mat-1',
              materialType: 'pipe_insulation' as const,
              quantity: 100,
              unit: 'linear_ft' as const,
              location: 'Basement',
              condition: 'minor_damage' as const,
              friable: true,
              pipeDiameter: 4,
              pipeThickness: null,
              notes: 'Visible damage'
            }],
            estimatedWasteVolume: 50,
            containmentLevel: 2 as const,
            epaNotificationRequired: true
          },
          mold: null,
          lead: null,
          other: null
        },
        photos: {
          photos: []
        },
        notes: 'Test survey notes'
      }
    }

    it('should map property fields correctly', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.site_address).toBe('123 Main St')
      expect(result.site_city).toBe('Springfield')
      expect(result.site_state).toBe('IL')
      expect(result.site_zip).toBe('62701')
      expect(result.owner_name).toBe('John Doe')
      expect(result.owner_phone).toBe('555-123-4567')
      expect(result.owner_email).toBe('john@example.com')
    })

    it('should set organization_id', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.organization_id).toBe('org-123')
    })

    it('should set customer_id from state', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.customer_id).toBe('customer-1')
    })

    it('should set occupied based on occupancy_status', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.occupied).toBe(true)
    })

    it('should map access info correctly', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.access_info).toMatchObject({
        hasRestrictions: false,
        parkingAvailable: true,
        elevatorAvailable: false,
        minDoorwayWidth: 36
      })
    })

    it('should map environment info correctly', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.environment_info).toMatchObject({
        temperature: 72,
        humidity: 45,
        utilityShutoffsLocated: true
      })
    })

    it('should map hazard assessments correctly', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.hazard_assessments).toBeDefined()
      const hazards = result.hazard_assessments as any
      expect(hazards.types).toEqual(['asbestos'])
      expect(hazards.asbestos).toBeDefined()
      expect(hazards.asbestos.materials).toHaveLength(1)
      expect(hazards.asbestos.containmentLevel).toBe(2)
    })

    it('should set primary hazard type for legacy field', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.hazard_type).toBe('asbestos')
    })

    it('should set job_name from address', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.job_name).toBe('123 Main St')
    })

    it('should set technician_notes from notes', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.technician_notes).toBe('Test survey notes')
    })

    it('should set started_at from state', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.started_at).toBe('2026-01-15T10:00:00Z')
    })

    it('should set status from options', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123', { status: 'submitted' })

      expect(result.status).toBe('submitted')
    })

    it('should set submitted_at from options', () => {
      const submittedAt = '2026-01-15T12:00:00Z'
      const result = mapStoreToDb(baseStoreState, 'org-123', { submittedAt })

      expect(result.submitted_at).toBe(submittedAt)
    })

    it('should default status to draft', () => {
      const result = mapStoreToDb(baseStoreState, 'org-123')

      expect(result.status).toBe('draft')
    })

    it('should set updated_at to current time', () => {
      const before = new Date().toISOString()
      const result = mapStoreToDb(baseStoreState, 'org-123')
      const after = new Date().toISOString()

      expect(result.updated_at).toBeDefined()
      expect(result.updated_at! >= before).toBe(true)
      expect(result.updated_at! <= after).toBe(true)
    })
  })

  describe('mapDbToStore', () => {
    const baseDbRecord: SiteSurvey = {
      id: 'survey-1',
      organization_id: 'org-123',
      estimator_id: null,
      customer_id: 'customer-1',
      created_at: '2026-01-15T10:00:00Z',
      updated_at: '2026-01-15T10:00:00Z',
      job_name: 'Test Survey',
      customer_name: 'John Doe',
      customer_email: 'john@example.com',
      customer_phone: '555-123-4567',
      site_address: '123 Main St',
      site_city: 'Springfield',
      site_state: 'IL',
      site_zip: '62701',
      site_location: null,
      hazard_type: 'asbestos',
      status: 'draft',
      scheduled_date: null,
      scheduled_time_start: null,
      scheduled_time_end: null,
      assigned_to: null,
      appointment_status: null,
      building_type: 'commercial',
      year_built: 1985,
      building_sqft: 5000,
      stories: 2,
      construction_type: 'steel_frame',
      occupancy_status: 'occupied',
      owner_name: 'John Doe',
      owner_phone: '555-123-4567',
      owner_email: 'john@example.com',
      access_info: {
        hasRestrictions: false,
        restrictions: [],
        restrictionNotes: '',
        parkingAvailable: true,
        loadingZoneAvailable: null,
        equipmentAccess: 'limited',
        equipmentAccessNotes: '',
        elevatorAvailable: false,
        minDoorwayWidth: 36
      },
      environment_info: {
        temperature: 72,
        humidity: 45,
        moistureIssues: [],
        moistureNotes: '',
        hasStructuralConcerns: false,
        structuralConcerns: [],
        structuralNotes: '',
        utilityShutoffsLocated: true
      },
      hazard_assessments: {
        types: ['asbestos'],
        asbestos: {
          materials: [{
            id: 'mat-1',
            materialType: 'pipe_insulation',
            quantity: 100,
            unit: 'linear_ft',
            location: 'Basement',
            condition: 'minor_damage',
            friable: true,
            pipeDiameter: 4,
            pipeThickness: null,
            notes: 'Visible damage'
          }],
          estimatedWasteVolume: 50,
          containmentLevel: 2,
          epaNotificationRequired: true
        },
        mold: null,
        lead: null,
        other: null
      },
      photo_metadata: [],
      technician_notes: 'Test notes',
      started_at: '2026-01-15T10:00:00Z',
      submitted_at: null,
      occupied: true,
      hazard_subtype: null,
      containment_level: 2,
      area_sqft: null,
      linear_ft: 100,
      volume_cuft: null,
      material_type: null,
      access_issues: null,
      special_conditions: null,
      clearance_required: true,
      clearance_lab: null,
      regulatory_notifications_needed: true,
      notes: null
    }

    it('should map currentSurveyId from db id', () => {
      const result = mapDbToStore(baseDbRecord)

      expect(result.currentSurveyId).toBe('survey-1')
    })

    it('should map customerId from db customer_id', () => {
      const result = mapDbToStore(baseDbRecord)

      expect(result.customerId).toBe('customer-1')
    })

    it('should map startedAt from db started_at', () => {
      const result = mapDbToStore(baseDbRecord)

      expect(result.startedAt).toBe('2026-01-15T10:00:00Z')
    })

    it('should map property data correctly', () => {
      const result = mapDbToStore(baseDbRecord)

      expect(result.formData?.property).toMatchObject({
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        buildingType: 'commercial',
        yearBuilt: 1985,
        squareFootage: 5000,
        stories: 2
      })
    })

    it('should map access data correctly', () => {
      const result = mapDbToStore(baseDbRecord)

      expect(result.formData?.access).toMatchObject({
        hasRestrictions: false,
        parkingAvailable: true,
        elevatorAvailable: false,
        minDoorwayWidth: 36
      })
    })

    it('should map environment data correctly', () => {
      const result = mapDbToStore(baseDbRecord)

      expect(result.formData?.environment).toMatchObject({
        temperature: 72,
        humidity: 45,
        utilityShutoffsLocated: true
      })
    })

    it('should map hazards data correctly', () => {
      const result = mapDbToStore(baseDbRecord)

      expect(result.formData?.hazards.types).toEqual(['asbestos'])
      expect(result.formData?.hazards.asbestos).toBeDefined()
      expect(result.formData?.hazards.asbestos?.materials).toHaveLength(1)
    })

    it('should map notes from technician_notes', () => {
      const result = mapDbToStore(baseDbRecord)

      expect(result.formData?.notes).toBe('Test notes')
    })

    it('should handle null/undefined JSONB fields', () => {
      const dbWithNulls = {
        ...baseDbRecord,
        access_info: null,
        environment_info: null,
        hazard_assessments: null,
        photo_metadata: null
      }

      const result = mapDbToStore(dbWithNulls as any)

      expect(result.formData?.access).toBeDefined()
      expect(result.formData?.environment).toBeDefined()
      expect(result.formData?.hazards).toBeDefined()
      expect(result.formData?.photos).toBeDefined()
    })

    it('should handle empty arrays', () => {
      const dbWithEmpty = {
        ...baseDbRecord,
        hazard_assessments: { types: [] },
        photo_metadata: []
      }

      const result = mapDbToStore(dbWithEmpty as any)

      expect(result.formData?.hazards.types).toEqual([])
      expect(result.formData?.photos.photos).toEqual([])
    })
  })
})
