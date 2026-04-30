// Database types for HazardOS
// These types match the Supabase schema

export type HazardType = 'asbestos' | 'mold' | 'lead' | 'vermiculite' | 'other'
export type SiteSurveyStatus = 'draft' | 'scheduled' | 'in_progress' | 'submitted' | 'reviewed' | 'estimated' | 'quoted' | 'completed' | 'cancelled'
// Legacy alias for backward compatibility
export type AssessmentStatus = SiteSurveyStatus
export type UserRole = 'platform_owner' | 'platform_admin' | 'tenant_owner' | 'admin' | 'estimator' | 'technician' | 'viewer'
export type OrganizationStatus = 'active' | 'suspended' | 'cancelled' | 'trial'
export type SubscriptionTier = 'trial' | 'starter' | 'professional' | 'enterprise'

// CRM types
export type ContactType = 'residential' | 'commercial'
export type CompanyStatus = 'active' | 'inactive'
export type CompanyType = 'residential_property_mgr' | 'commercial_property_mgr' | 'general_contractor' | 'industrial' | 'hoa' | 'government' | 'direct_homeowner' | 'other'
export type AccountStatus = 'prospect' | 'active' | 'inactive' | 'churned'
export type ContactRole = 'decision_maker' | 'influencer' | 'billing' | 'property_manager' | 'site_contact' | 'other'
export type ContactStatus = 'active' | 'inactive' | 'do_not_contact'
export type OpportunityStatus = 'new' | 'assessment_scheduled' | 'survey_completed' | 'estimate_sent' | 'won' | 'lost' | 'no_decision'
export type PropertyType = 'residential_single_family' | 'residential_multi_family' | 'commercial' | 'industrial' | 'government'
export type UrgencyLevel = 'routine' | 'urgent' | 'emergency'
export type RegulatoryTrigger = 'inspection_required' | 'sale_pending' | 'tenant_complaint' | 'insurance_claim' | 'voluntary'
export type TouchType = 'first_touch' | 'last_touch' | 'converting_touch' | 'nurture_touch'
export type TouchChannel = 'web' | 'phone' | 'email' | 'in_person' | 'social' | 'event'

// Multi-touch attribution fields (shared across entities)
export interface MultiTouchAttribution {
  first_touch_source: string | null
  first_touch_medium: string | null
  first_touch_campaign: string | null
  last_touch_source: string | null
  last_touch_medium: string | null
  last_touch_campaign: string | null
  converting_touch_source: string | null
  converting_touch_medium: string | null
  converting_touch_campaign: string | null
}

export interface AttributionTouchpoint {
  id: string
  organization_id: string
  entity_type: 'contact' | 'company' | 'opportunity' | 'job'
  entity_id: string
  touch_type: TouchType
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null
  referrer_url: string | null
  landing_page: string | null
  referred_by_contact_id: string | null
  referred_by_company_id: string | null
  referred_by_job_id: string | null
  channel: TouchChannel | null
  notes: string | null
  touched_at: string
  created_at: string
}

// Customer management types
export type PropertyContactRole = 'owner' | 'previous_owner' | 'tenant' | 'site_contact' | 'billing_contact'
export type JobDocumentCategory =
  | 'permit'
  | 'manifest'
  | 'clearance'
  | 'air_monitoring'
  | 'insurance'
  | 'regulatory'
  | 'customer_signoff'
  | 'correspondence'
  | 'video'
  | 'other'
export type CustomerStatus = 'lead' | 'prospect' | 'customer' | 'inactive'
export type CustomerSource = 'phone' | 'website' | 'mail' | 'referral' | 'other'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type DisposalHazardType = 'asbestos_friable' | 'asbestos_non_friable' | 'mold' | 'lead' | 'other'

// Mobile survey JSONB types
export interface SurveyAccessInfo {
  hasRestrictions: boolean | null
  restrictions: string[]
  restrictionNotes: string
  parkingAvailable: boolean | null
  loadingZoneAvailable: boolean | null
  equipmentAccess: 'adequate' | 'limited' | 'difficult' | null
  equipmentAccessNotes: string
  elevatorAvailable: boolean | null
  minDoorwayWidth: number
}

export interface SurveyEnvironmentInfo {
  temperature: number | null
  humidity: number | null
  moistureIssues: string[]
  moistureNotes: string
  hasStructuralConcerns: boolean | null
  structuralConcerns: string[]
  structuralNotes: string
  utilityShutoffsLocated: boolean | null
}

export interface SurveyAsbestosMaterial {
  id: string
  materialType: string | null
  quantity: number | null
  unit: string
  location: string
  condition: string | null
  friable: boolean
  pipeDiameter: number | null
  pipeThickness: number | null
  notes: string
}

export interface SurveyMoldArea {
  id: string
  location: string
  squareFootage: number | null
  materialType: string | null
  materialsAffected: string[]
  severity: string | null
  moistureReading: number | null
}

export interface SurveyLeadComponent {
  id: string
  componentType: string | null
  location: string
  quantity: number | null
  unit: string
  condition: string | null
}

export interface SurveyHazardAssessments {
  types: ('asbestos' | 'mold' | 'lead' | 'other')[]
  asbestos: {
    materials: SurveyAsbestosMaterial[]
    estimatedWasteVolume: number | null
    containmentLevel: number | null
    epaNotificationRequired: boolean
  } | null
  mold: {
    moistureSourceIdentified: boolean | null
    moistureSourceTypes: string[]
    moistureSourceStatus: string | null
    moistureSourceNotes: string
    affectedAreas: SurveyMoldArea[]
    hvacContaminated: boolean | null
    odorLevel: string | null
    sizeCategory: string | null
  } | null
  lead: {
    childrenUnder6Present: boolean | null
    workScope: string | null
    components: SurveyLeadComponent[]
    rrpRuleApplies: boolean
    workMethod: string | null
    totalWorkArea: number
  } | null
  other: {
    description: string
    notes: string
  } | null
}

export interface SurveyPhotoMetadata {
  id: string
  url: string
  category: string
  location: string
  caption: string
  gpsCoordinates: { latitude: number; longitude: number } | null
  timestamp: string
  // Media type defaults to 'image' for legacy rows that pre-date video
  // support; new uploads always set this explicitly. Read sites should
  // assume `undefined === 'image'`.
  mediaType?: 'image' | 'video'
  mimeType?: string | null
  fileSize?: number | null
}

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          address: string | null
          city: string | null
          state: string | null
          zip: string | null
          phone: string | null
          email: string | null
          website: string | null
          license_number: string | null
          timezone: string
          email_from_name: string | null
          email_reply_to: string | null
          email_domain: string | null
          email_domain_status: 'pending' | 'verified' | 'failed' | null
          email_domain_provider_id: string | null
          email_domain_records: unknown | null // JSONB
          email_domain_verified_at: string | null
          status: OrganizationStatus
          subscription_tier: SubscriptionTier
          trial_ends_at: string | null
          max_users: number
          max_assessments_per_month: number
          features: unknown // JSONB
          billing_email: string | null
          billing_address: unknown | null // JSONB
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          license_number?: string | null
          timezone?: string
          email_from_name?: string | null
          email_reply_to?: string | null
          email_domain?: string | null
          email_domain_status?: 'pending' | 'verified' | 'failed' | null
          email_domain_provider_id?: string | null
          email_domain_records?: unknown | null
          email_domain_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          license_number?: string | null
          timezone?: string
          email_from_name?: string | null
          email_reply_to?: string | null
          email_domain?: string | null
          email_domain_status?: 'pending' | 'verified' | 'failed' | null
          email_domain_provider_id?: string | null
          email_domain_records?: unknown | null
          email_domain_verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_sends: {
        Row: {
          id: string
          organization_id: string
          sent_by: string | null
          to_email: string
          cc: string[] | null
          bcc: string[] | null
          reply_to: string | null
          from_email: string
          from_name: string | null
          subject: string
          provider: string
          provider_message_id: string | null
          status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
          error_message: string | null
          sent_at: string | null
          delivered_at: string | null
          bounced_at: string | null
          complained_at: string | null
          first_opened_at: string | null
          last_opened_at: string | null
          open_count: number
          first_clicked_at: string | null
          click_count: number
          related_entity_type: string | null
          related_entity_id: string | null
          tags: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          sent_by?: string | null
          to_email: string
          cc?: string[] | null
          bcc?: string[] | null
          reply_to?: string | null
          from_email: string
          from_name?: string | null
          subject: string
          provider?: string
          provider_message_id?: string | null
          status?: 'queued' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
          error_message?: string | null
          sent_at?: string | null
          related_entity_type?: string | null
          related_entity_id?: string | null
          tags?: string[] | null
        }
        Update: {
          status?: 'queued' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed'
          error_message?: string | null
          sent_at?: string | null
          delivered_at?: string | null
          bounced_at?: string | null
          complained_at?: string | null
          first_opened_at?: string | null
          last_opened_at?: string | null
          open_count?: number
          first_clicked_at?: string | null
          click_count?: number
          provider_message_id?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          organization_id: string | null
          email: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          role: UserRole
          is_active: boolean
          is_platform_user: boolean
          last_login_at: string | null
          login_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          email: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          role?: UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          email?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          role?: UserRole
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      companies: {
        Row: {
          id: string
          organization_id: string
          name: string
          company_type: CompanyType | null
          industry: string | null
          website: string | null
          primary_phone: string | null
          primary_email: string | null
          phone: string | null
          email: string | null
          // Billing address
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_state: string | null
          billing_zip: string | null
          // Service address
          service_address_line1: string | null
          service_address_line2: string | null
          service_city: string | null
          service_state: string | null
          service_zip: string | null
          // Relationship
          account_owner_id: string | null
          primary_contact_id: string | null
          account_status: AccountStatus
          customer_since: string | null
          preferred_contact_method: string | null
          // Marketing attribution
          lead_source: string | null
          lead_source_detail: string | null
          first_touch_date: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          referred_by_company_id: string | null
          referred_by_contact_id: string | null
          // Multi-touch
          last_touch_source: string | null
          last_touch_medium: string | null
          last_touch_campaign: string | null
          last_touch_date: string | null
          converting_touch_source: string | null
          converting_touch_medium: string | null
          converting_touch_campaign: string | null
          converting_touch_date: string | null
          // Financial
          lifetime_value: number
          total_jobs_completed: number
          average_job_value: number
          payment_terms: string | null
          quickbooks_customer_id: string | null
          // Meta
          notes: string | null
          status: CompanyStatus
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          company_type?: CompanyType | null
          industry?: string | null
          website?: string | null
          primary_phone?: string | null
          primary_email?: string | null
          phone?: string | null
          email?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          service_address_line1?: string | null
          service_address_line2?: string | null
          service_city?: string | null
          service_state?: string | null
          service_zip?: string | null
          account_owner_id?: string | null
          primary_contact_id?: string | null
          account_status?: AccountStatus
          customer_since?: string | null
          preferred_contact_method?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          first_touch_date?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          referred_by_company_id?: string | null
          referred_by_contact_id?: string | null
          payment_terms?: string | null
          quickbooks_customer_id?: string | null
          notes?: string | null
          status?: CompanyStatus
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          company_type?: CompanyType | null
          industry?: string | null
          website?: string | null
          primary_phone?: string | null
          primary_email?: string | null
          phone?: string | null
          email?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          service_address_line1?: string | null
          service_address_line2?: string | null
          service_city?: string | null
          service_state?: string | null
          service_zip?: string | null
          account_owner_id?: string | null
          primary_contact_id?: string | null
          account_status?: AccountStatus
          customer_since?: string | null
          preferred_contact_method?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          first_touch_date?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          referred_by_company_id?: string | null
          referred_by_contact_id?: string | null
          payment_terms?: string | null
          quickbooks_customer_id?: string | null
          notes?: string | null
          status?: CompanyStatus
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      customers: {
        Row: {
          id: string
          organization_id: string
          name: string
          first_name: string | null
          last_name: string | null
          title: string | null
          role_title: string | null
          company_name: string | null
          company_id: string | null
          contact_type: ContactType
          email: string | null
          phone: string | null
          mobile_phone: string | null
          office_phone: string | null
          preferred_contact_method: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip: string | null
          // Relationship
          account_owner_id: string | null
          contact_role: ContactRole | null
          is_primary_contact: boolean
          contact_status: ContactStatus
          opted_into_email: boolean
          opted_into_email_date: string | null
          opted_into_sms: boolean
          opted_into_sms_date: string | null
          // Legacy
          status: CustomerStatus
          source: CustomerSource | null
          communication_preferences: unknown
          marketing_consent: boolean
          marketing_consent_date: string | null
          // Marketing attribution
          lead_source: string | null
          lead_source_detail: string | null
          first_touch_date: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          referred_by_contact_id: string | null
          // Notes
          notes: string | null
          last_contacted_date: string | null
          next_followup_date: string | null
          next_followup_note: string | null
          // Business intelligence
          lifetime_value: number
          total_jobs: number
          last_job_date: string | null
          referral_source: string | null
          // Insurance
          insurance_carrier: string | null
          insurance_policy_number: string | null
          insurance_adjuster_name: string | null
          insurance_adjuster_phone: string | null
          insurance_adjuster_email: string | null
          // Property
          property_id: string | null
          // Meta
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          first_name?: string | null
          last_name?: string | null
          title?: string | null
          role_title?: string | null
          company_name?: string | null
          company_id?: string | null
          contact_type?: ContactType
          email?: string | null
          phone?: string | null
          mobile_phone?: string | null
          office_phone?: string | null
          preferred_contact_method?: string | null
          address_line1?: string | null
          address_line2?: string | null
          property_id?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          account_owner_id?: string | null
          contact_role?: ContactRole | null
          is_primary_contact?: boolean
          contact_status?: ContactStatus
          opted_into_email?: boolean
          opted_into_email_date?: string | null
          opted_into_sms?: boolean
          opted_into_sms_date?: string | null
          status?: CustomerStatus
          source?: CustomerSource | null
          communication_preferences?: unknown
          marketing_consent?: boolean
          marketing_consent_date?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          first_touch_date?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          referred_by_contact_id?: string | null
          notes?: string | null
          last_contacted_date?: string | null
          next_followup_date?: string | null
          next_followup_note?: string | null
          lifetime_value?: number
          total_jobs?: number
          last_job_date?: string | null
          referral_source?: string | null
          insurance_carrier?: string | null
          insurance_policy_number?: string | null
          insurance_adjuster_name?: string | null
          insurance_adjuster_phone?: string | null
          insurance_adjuster_email?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          first_name?: string | null
          last_name?: string | null
          title?: string | null
          role_title?: string | null
          company_name?: string | null
          company_id?: string | null
          contact_type?: ContactType
          email?: string | null
          phone?: string | null
          mobile_phone?: string | null
          property_id?: string | null
          office_phone?: string | null
          preferred_contact_method?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          account_owner_id?: string | null
          contact_role?: ContactRole | null
          is_primary_contact?: boolean
          contact_status?: ContactStatus
          opted_into_email?: boolean
          opted_into_email_date?: string | null
          opted_into_sms?: boolean
          opted_into_sms_date?: string | null
          status?: CustomerStatus
          source?: CustomerSource | null
          communication_preferences?: unknown
          marketing_consent?: boolean
          marketing_consent_date?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          first_touch_date?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          referred_by_contact_id?: string | null
          notes?: string | null
          last_contacted_date?: string | null
          next_followup_date?: string | null
          next_followup_note?: string | null
          lifetime_value?: number
          total_jobs?: number
          last_job_date?: string | null
          referral_source?: string | null
          insurance_carrier?: string | null
          insurance_policy_number?: string | null
          insurance_adjuster_name?: string | null
          insurance_adjuster_phone?: string | null
          insurance_adjuster_email?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      site_surveys: {
        Row: {
          id: string
          organization_id: string
          estimator_id: string | null
          customer_id: string | null
          property_id: string | null
          created_at: string
          updated_at: string
          job_name: string
          customer_name: string
          customer_email: string | null
          customer_phone: string | null
          site_address: string
          site_city: string
          site_state: string
          site_zip: string
          site_location: unknown | null // PostGIS POINT type
          hazard_type: HazardType
          hazard_subtype: string | null
          containment_level: number | null
          area_sqft: number | null
          linear_ft: number | null
          volume_cuft: number | null
          material_type: string | null
          occupied: boolean
          access_issues: string[] | null
          special_conditions: string | null
          clearance_required: boolean
          clearance_lab: string | null
          regulatory_notifications_needed: boolean
          notes: string | null
          status: SiteSurveyStatus
          scheduled_date: string | null
          scheduled_time_start: string | null
          scheduled_time_end: string | null
          assigned_to: string | null
          appointment_status: AppointmentStatus | null
          // Mobile survey extended fields
          building_type: string | null
          year_built: number | null
          building_sqft: number | null
          stories: number | null
          construction_type: string | null
          occupancy_status: string | null
          owner_name: string | null
          owner_phone: string | null
          owner_email: string | null
          access_info: SurveyAccessInfo | null
          environment_info: SurveyEnvironmentInfo | null
          hazard_assessments: SurveyHazardAssessments | null
          photo_metadata: SurveyPhotoMetadata[] | null
          technician_notes: string | null
          started_at: string | null
          submitted_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          estimator_id?: string | null
          customer_id?: string | null
          property_id?: string | null
          created_at?: string
          updated_at?: string
          job_name: string
          customer_name: string
          customer_email?: string | null
          customer_phone?: string | null
          site_address: string
          site_city: string
          site_state: string
          site_zip: string
          site_location?: unknown | null
          hazard_type: HazardType
          hazard_subtype?: string | null
          containment_level?: number | null
          area_sqft?: number | null
          linear_ft?: number | null
          volume_cuft?: number | null
          material_type?: string | null
          occupied?: boolean
          access_issues?: string[] | null
          special_conditions?: string | null
          clearance_required?: boolean
          clearance_lab?: string | null
          regulatory_notifications_needed?: boolean
          notes?: string | null
          status?: SiteSurveyStatus
          scheduled_date?: string | null
          scheduled_time_start?: string | null
          scheduled_time_end?: string | null
          assigned_to?: string | null
          appointment_status?: AppointmentStatus | null
          // Mobile survey extended fields
          building_type?: string | null
          year_built?: number | null
          building_sqft?: number | null
          stories?: number | null
          construction_type?: string | null
          occupancy_status?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_email?: string | null
          access_info?: SurveyAccessInfo | null
          environment_info?: SurveyEnvironmentInfo | null
          hazard_assessments?: SurveyHazardAssessments | null
          photo_metadata?: SurveyPhotoMetadata[] | null
          technician_notes?: string | null
          started_at?: string | null
          submitted_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          estimator_id?: string | null
          customer_id?: string | null
          property_id?: string | null
          created_at?: string
          updated_at?: string
          job_name?: string
          customer_name?: string
          customer_email?: string | null
          customer_phone?: string | null
          site_address?: string
          site_city?: string
          site_state?: string
          site_zip?: string
          site_location?: unknown | null
          hazard_type?: HazardType
          hazard_subtype?: string | null
          containment_level?: number | null
          area_sqft?: number | null
          linear_ft?: number | null
          volume_cuft?: number | null
          material_type?: string | null
          occupied?: boolean
          access_issues?: string[] | null
          special_conditions?: string | null
          clearance_required?: boolean
          clearance_lab?: string | null
          regulatory_notifications_needed?: boolean
          notes?: string | null
          status?: SiteSurveyStatus
          scheduled_date?: string | null
          scheduled_time_start?: string | null
          scheduled_time_end?: string | null
          assigned_to?: string | null
          appointment_status?: AppointmentStatus | null
          // Mobile survey extended fields
          building_type?: string | null
          year_built?: number | null
          building_sqft?: number | null
          stories?: number | null
          construction_type?: string | null
          occupancy_status?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          owner_email?: string | null
          access_info?: SurveyAccessInfo | null
          environment_info?: SurveyEnvironmentInfo | null
          hazard_assessments?: SurveyHazardAssessments | null
          photo_metadata?: SurveyPhotoMetadata[] | null
          technician_notes?: string | null
          started_at?: string | null
          submitted_at?: string | null
        }
      }
      site_survey_photos: {
        Row: {
          id: string
          site_survey_id: string
          url: string
          thumbnail_url: string | null
          caption: string | null
          gps_coordinates: unknown | null // PostGIS POINT type
          file_size: number | null
          file_type: string | null
          created_at: string
        }
        Insert: {
          id?: string
          site_survey_id: string
          url: string
          thumbnail_url?: string | null
          caption?: string | null
          gps_coordinates?: unknown | null
          file_size?: number | null
          file_type?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          site_survey_id?: string
          url?: string
          thumbnail_url?: string | null
          caption?: string | null
          gps_coordinates?: unknown | null
          file_size?: number | null
          file_type?: string | null
          created_at?: string
        }
      }
      equipment_catalog: {
        Row: {
          id: string
          organization_id: string
          name: string
          category: string | null
          daily_rate: number
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          category?: string | null
          daily_rate: number
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          category?: string | null
          daily_rate?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      materials_catalog: {
        Row: {
          id: string
          organization_id: string
          name: string
          category: string | null
          unit: string | null
          unit_cost: number
          description: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          category?: string | null
          unit?: string | null
          unit_cost: number
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          category?: string | null
          unit?: string | null
          unit_cost?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      estimates: {
        Row: {
          id: string
          site_survey_id: string
          created_at: string
          created_by: string | null
          estimated_duration_days: number
          estimated_labor_hours: number
          crew_type: string | null
          crew_size: number
          labor_rate_per_hour: number
          equipment_needed: unknown // JSONB
          equipment_cost: number
          materials_needed: unknown // JSONB
          materials_cost: number
          disposal_method: string | null
          disposal_cost: number
          total_direct_cost: number
          markup_percentage: number
          total_price: number
          overrides: unknown // JSONB
          is_active: boolean
        }
        Insert: {
          id?: string
          site_survey_id: string
          created_at?: string
          created_by?: string | null
          estimated_duration_days: number
          estimated_labor_hours: number
          crew_type?: string | null
          crew_size: number
          labor_rate_per_hour: number
          equipment_needed?: unknown
          equipment_cost?: number
          materials_needed?: unknown
          materials_cost?: number
          disposal_method?: string | null
          disposal_cost?: number
          total_direct_cost: number
          markup_percentage?: number
          total_price: number
          overrides?: unknown
          is_active?: boolean
        }
        Update: {
          id?: string
          site_survey_id?: string
          created_at?: string
          created_by?: string | null
          estimated_duration_days?: number
          estimated_labor_hours?: number
          crew_type?: string | null
          crew_size?: number
          labor_rate_per_hour?: number
          equipment_needed?: unknown
          equipment_cost?: number
          materials_needed?: unknown
          materials_cost?: number
          disposal_method?: string | null
          disposal_cost?: number
          total_direct_cost?: number
          markup_percentage?: number
          total_price?: number
          overrides?: unknown
          is_active?: boolean
        }
      }
      jobs: {
        Row: {
          id: string
          site_survey_id: string
          estimate_id: string
          organization_id: string
          property_id: string | null
          job_number: string
          start_date: string | null
          end_date: string | null
          actual_start_date: string | null
          actual_end_date: string | null
          assigned_crew: unknown // JSONB
          project_manager_id: string | null
          status: string
          actual_labor_hours: number | null
          actual_material_cost: number | null
          actual_equipment_cost: number | null
          actual_disposal_cost: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          site_survey_id: string
          estimate_id: string
          organization_id: string
          property_id?: string | null
          job_number: string
          start_date?: string | null
          end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          assigned_crew?: unknown
          project_manager_id?: string | null
          status?: string
          actual_labor_hours?: number | null
          actual_material_cost?: number | null
          actual_equipment_cost?: number | null
          actual_disposal_cost?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          site_survey_id?: string
          estimate_id?: string
          organization_id?: string
          property_id?: string | null
          job_number?: string
          start_date?: string | null
          end_date?: string | null
          actual_start_date?: string | null
          actual_end_date?: string | null
          assigned_crew?: unknown
          project_manager_id?: string | null
          status?: string
          actual_labor_hours?: number | null
          actual_material_cost?: number | null
          actual_equipment_cost?: number | null
          actual_disposal_cost?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          value: unknown // JSONB
          description: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: unknown
          description?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: unknown
          description?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      tenant_usage: {
        Row: {
          id: string
          organization_id: string
          month_year: string
          assessments_created: number
          photos_uploaded: number
          storage_used_mb: number
          api_calls: number
          active_users: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          month_year: string
          assessments_created?: number
          photos_uploaded?: number
          storage_used_mb?: number
          api_calls?: number
          active_users?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          month_year?: string
          assessments_created?: number
          photos_uploaded?: number
          storage_used_mb?: number
          api_calls?: number
          active_users?: number
          created_at?: string
          updated_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          organization_id: string | null
          user_id: string | null
          action: string
          resource_type: string | null
          resource_id: string | null
          old_values: unknown | null // JSONB
          new_values: unknown | null // JSONB
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          action: string
          resource_type?: string | null
          resource_id?: string | null
          old_values?: unknown | null
          new_values?: unknown | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          user_id?: string | null
          action?: string
          resource_type?: string | null
          resource_id?: string | null
          old_values?: unknown | null
          new_values?: unknown | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
      }
      tenant_invitations: {
        Row: {
          id: string
          organization_id: string
          email: string
          role: UserRole
          invited_by: string
          token: string
          expires_at: string
          accepted_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          email: string
          role: UserRole
          invited_by: string
          token: string
          expires_at: string
          accepted_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          email?: string
          role?: UserRole
          invited_by?: string
          token?: string
          expires_at?: string
          accepted_at?: string | null
          created_at?: string
        }
      }
      labor_rates: {
        Row: {
          id: string
          organization_id: string
          name: string
          rate_per_hour: number
          description: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          rate_per_hour: number
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          rate_per_hour?: number
          description?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      equipment_rates: {
        Row: {
          id: string
          organization_id: string
          name: string
          rate_per_day: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          rate_per_day: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          rate_per_day?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      material_costs: {
        Row: {
          id: string
          organization_id: string
          name: string
          cost_per_unit: number
          unit: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          cost_per_unit: number
          unit: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          cost_per_unit?: number
          unit?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      disposal_fees: {
        Row: {
          id: string
          organization_id: string
          hazard_type: DisposalHazardType
          cost_per_cubic_yard: number
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          hazard_type: DisposalHazardType
          cost_per_cubic_yard: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          hazard_type?: DisposalHazardType
          cost_per_cubic_yard?: number
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      travel_rates: {
        Row: {
          id: string
          organization_id: string
          min_miles: number
          max_miles: number | null
          flat_fee: number | null
          per_mile_rate: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          min_miles: number
          max_miles?: number | null
          flat_fee?: number | null
          per_mile_rate?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          min_miles?: number
          max_miles?: number | null
          flat_fee?: number | null
          per_mile_rate?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      pricing_settings: {
        Row: {
          id: string
          organization_id: string
          default_markup_percent: number
          minimum_markup_percent: number
          maximum_markup_percent: number
          office_address_line1: string | null
          office_address_line2: string | null
          office_city: string | null
          office_state: string | null
          office_zip: string | null
          office_lat: number | null
          office_lng: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          default_markup_percent?: number
          minimum_markup_percent?: number
          maximum_markup_percent?: number
          office_address_line1?: string | null
          office_address_line2?: string | null
          office_city?: string | null
          office_state?: string | null
          office_zip?: string | null
          office_lat?: number | null
          office_lng?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          default_markup_percent?: number
          minimum_markup_percent?: number
          maximum_markup_percent?: number
          office_address_line1?: string | null
          office_address_line2?: string | null
          office_city?: string | null
          office_state?: string | null
          office_zip?: string | null
          office_lat?: number | null
          office_lng?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      properties: {
        Row: {
          id: string
          organization_id: string
          address_line1: string
          address_line2: string | null
          city: string | null
          state: string | null
          zip: string | null
          normalized_address: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          address_line1: string
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          address_line1?: string
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      job_documents: {
        Row: {
          id: string
          organization_id: string
          job_id: string
          file_name: string
          storage_path: string
          mime_type: string | null
          size_bytes: number | null
          category: JobDocumentCategory
          notes: string | null
          uploaded_by: string | null
          uploaded_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          job_id: string
          file_name: string
          storage_path: string
          mime_type?: string | null
          size_bytes?: number | null
          category?: JobDocumentCategory
          notes?: string | null
          uploaded_by?: string | null
          uploaded_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          job_id?: string
          file_name?: string
          storage_path?: string
          mime_type?: string | null
          size_bytes?: number | null
          category?: JobDocumentCategory
          notes?: string | null
          uploaded_by?: string | null
          uploaded_at?: string
          updated_at?: string
        }
      }
      property_contacts: {
        Row: {
          id: string
          organization_id: string
          property_id: string
          contact_id: string
          role: PropertyContactRole
          is_current: boolean
          moved_in_date: string | null
          moved_out_date: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          property_id: string
          contact_id: string
          role: PropertyContactRole
          is_current?: boolean
          moved_in_date?: string | null
          moved_out_date?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          property_id?: string
          contact_id?: string
          role?: PropertyContactRole
          is_current?: boolean
          moved_in_date?: string | null
          moved_out_date?: string | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      hazard_type: HazardType
      site_survey_status: SiteSurveyStatus
      user_role: UserRole
      organization_status: OrganizationStatus
      subscription_tier: SubscriptionTier
      customer_status: CustomerStatus
      customer_source: CustomerSource
      appointment_status: AppointmentStatus
      disposal_hazard_type: DisposalHazardType
    }
  }
}

// Helper types for common operations
export type Organization = Database['public']['Tables']['organizations']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type SiteSurvey = Database['public']['Tables']['site_surveys']['Row']
export type SiteSurveyPhoto = Database['public']['Tables']['site_survey_photos']['Row']
// Legacy aliases for backward compatibility
export type Assessment = SiteSurvey
export type AssessmentPhoto = SiteSurveyPhoto
export type Photo = SiteSurveyPhoto
export type EquipmentItem = Database['public']['Tables']['equipment_catalog']['Row']
export type MaterialItem = Database['public']['Tables']['materials_catalog']['Row']
export type Estimate = Database['public']['Tables']['estimates']['Row']
export type Job = Database['public']['Tables']['jobs']['Row']
export type PlatformSetting = Database['public']['Tables']['platform_settings']['Row']
export type TenantUsage = Database['public']['Tables']['tenant_usage']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']
export type TenantInvitation = Database['public']['Tables']['tenant_invitations']['Row']
export type Company = Database['public']['Tables']['companies']['Row']
export type Customer = Database['public']['Tables']['customers']['Row']
export type LaborRate = Database['public']['Tables']['labor_rates']['Row']
export type EquipmentRate = Database['public']['Tables']['equipment_rates']['Row']
export type MaterialCost = Database['public']['Tables']['material_costs']['Row']
export type DisposalFee = Database['public']['Tables']['disposal_fees']['Row']
export type TravelRate = Database['public']['Tables']['travel_rates']['Row']
export type PricingSetting = Database['public']['Tables']['pricing_settings']['Row']
export type Property = Database['public']['Tables']['properties']['Row']
export type PropertyContact = Database['public']['Tables']['property_contacts']['Row']
export type JobDocument = Database['public']['Tables']['job_documents']['Row']

// Insert types
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type SiteSurveyInsert = Database['public']['Tables']['site_surveys']['Insert']
// Legacy alias for backward compatibility
export type AssessmentInsert = SiteSurveyInsert
export type SiteSurveyPhotoInsert = Database['public']['Tables']['site_survey_photos']['Insert']
export type PhotoInsert = SiteSurveyPhotoInsert
export type EquipmentItemInsert = Database['public']['Tables']['equipment_catalog']['Insert']
export type MaterialItemInsert = Database['public']['Tables']['materials_catalog']['Insert']
export type EstimateInsert = Database['public']['Tables']['estimates']['Insert']
export type JobInsert = Database['public']['Tables']['jobs']['Insert']
export type CompanyInsert = Database['public']['Tables']['companies']['Insert']
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type LaborRateInsert = Database['public']['Tables']['labor_rates']['Insert']
export type EquipmentRateInsert = Database['public']['Tables']['equipment_rates']['Insert']
export type MaterialCostInsert = Database['public']['Tables']['material_costs']['Insert']
export type DisposalFeeInsert = Database['public']['Tables']['disposal_fees']['Insert']
export type TravelRateInsert = Database['public']['Tables']['travel_rates']['Insert']
export type PricingSettingInsert = Database['public']['Tables']['pricing_settings']['Insert']
export type PropertyInsert = Database['public']['Tables']['properties']['Insert']
export type PropertyContactInsert = Database['public']['Tables']['property_contacts']['Insert']
export type JobDocumentInsert = Database['public']['Tables']['job_documents']['Insert']

// Update types
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']
export type SiteSurveyUpdate = Database['public']['Tables']['site_surveys']['Update']
// Legacy alias for backward compatibility
export type AssessmentUpdate = SiteSurveyUpdate
export type SiteSurveyPhotoUpdate = Database['public']['Tables']['site_survey_photos']['Update']
export type PhotoUpdate = SiteSurveyPhotoUpdate
export type EquipmentItemUpdate = Database['public']['Tables']['equipment_catalog']['Update']
export type MaterialItemUpdate = Database['public']['Tables']['materials_catalog']['Update']
export type EstimateUpdate = Database['public']['Tables']['estimates']['Update']
export type JobUpdate = Database['public']['Tables']['jobs']['Update']
export type CompanyUpdate = Database['public']['Tables']['companies']['Update']
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']
export type LaborRateUpdate = Database['public']['Tables']['labor_rates']['Update']
export type EquipmentRateUpdate = Database['public']['Tables']['equipment_rates']['Update']
export type MaterialCostUpdate = Database['public']['Tables']['material_costs']['Update']
export type DisposalFeeUpdate = Database['public']['Tables']['disposal_fees']['Update']
export type TravelRateUpdate = Database['public']['Tables']['travel_rates']['Update']
export type PricingSettingUpdate = Database['public']['Tables']['pricing_settings']['Update']
export type PropertyUpdate = Database['public']['Tables']['properties']['Update']
export type PropertyContactUpdate = Database['public']['Tables']['property_contacts']['Update']
export type JobDocumentUpdate = Database['public']['Tables']['job_documents']['Update']

// Structured types for JSONB fields
export interface EquipmentNeeded {
  id: string
  name: string
  quantity: number
  daily_rate: number
  days_needed: number
  total_cost: number
}

export interface MaterialNeeded {
  id: string
  name: string
  quantity: number
  unit: string
  unit_cost: number
  total_cost: number
}

export interface EstimateOverride {
  field: string
  original_value: unknown
  override_value: unknown
  reason: string
  overridden_by: string
  overridden_at: string
}

export interface CrewMember {
  profile_id: string
  role: string
  hourly_rate?: number
}

// Location type for GPS coordinates
export interface GpsCoordinates {
  lat: number
  lng: number
}