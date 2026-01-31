// Database types for HazardOS
// These types match the Supabase schema

export type HazardType = 'asbestos' | 'mold' | 'lead' | 'vermiculite' | 'other'
export type SiteSurveyStatus = 'draft' | 'submitted' | 'estimated' | 'quoted' | 'scheduled' | 'completed'
// Legacy alias for backward compatibility
export type AssessmentStatus = SiteSurveyStatus
export type UserRole = 'platform_owner' | 'platform_admin' | 'tenant_owner' | 'admin' | 'estimator' | 'technician' | 'viewer'
export type OrganizationStatus = 'active' | 'suspended' | 'cancelled' | 'trial'
export type SubscriptionTier = 'trial' | 'starter' | 'professional' | 'enterprise'

// Customer management types
export type CustomerStatus = 'lead' | 'prospect' | 'customer' | 'inactive'
export type CustomerSource = 'phone' | 'website' | 'mail' | 'referral' | 'other'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type DisposalHazardType = 'asbestos_friable' | 'asbestos_non_friable' | 'mold' | 'lead' | 'other'

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
          created_at?: string
          updated_at?: string
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
      customers: {
        Row: {
          id: string
          organization_id: string
          name: string
          company_name: string | null
          email: string | null
          phone: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          state: string | null
          zip: string | null
          status: CustomerStatus
          source: CustomerSource | null
          communication_preferences: unknown
          marketing_consent: boolean
          marketing_consent_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          company_name?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          status?: CustomerStatus
          source?: CustomerSource | null
          communication_preferences?: unknown
          marketing_consent?: boolean
          marketing_consent_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          company_name?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          status?: CustomerStatus
          source?: CustomerSource | null
          communication_preferences?: unknown
          marketing_consent?: boolean
          marketing_consent_date?: string | null
          notes?: string | null
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
        }
        Insert: {
          id?: string
          organization_id: string
          estimator_id?: string | null
          customer_id?: string | null
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
        }
        Update: {
          id?: string
          organization_id?: string
          estimator_id?: string | null
          customer_id?: string | null
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
          role_title: string
          hourly_rate: number
          overtime_multiplier: number
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          role_title: string
          hourly_rate: number
          overtime_multiplier?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          role_title?: string
          hourly_rate?: number
          overtime_multiplier?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      equipment_rates: {
        Row: {
          id: string
          organization_id: string
          equipment_name: string
          daily_rate: number
          weekly_rate: number | null
          monthly_rate: number | null
          category: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          equipment_name: string
          daily_rate: number
          weekly_rate?: number | null
          monthly_rate?: number | null
          category?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          equipment_name?: string
          daily_rate?: number
          weekly_rate?: number | null
          monthly_rate?: number | null
          category?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      material_costs: {
        Row: {
          id: string
          organization_id: string
          material_name: string
          unit_cost: number
          unit_type: string
          category: string | null
          supplier: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          material_name: string
          unit_cost: number
          unit_type: string
          category?: string | null
          supplier?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          material_name?: string
          unit_cost?: number
          unit_type?: string
          category?: string | null
          supplier?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      disposal_fees: {
        Row: {
          id: string
          organization_id: string
          hazard_type: DisposalHazardType
          unit_cost: number
          unit_type: string
          facility_name: string | null
          location: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          hazard_type: DisposalHazardType
          unit_cost: number
          unit_type: string
          facility_name?: string | null
          location?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          hazard_type?: DisposalHazardType
          unit_cost?: number
          unit_type?: string
          facility_name?: string | null
          location?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      travel_rates: {
        Row: {
          id: string
          organization_id: string
          rate_name: string
          mileage_rate: number | null
          hourly_rate: number | null
          flat_fee: number | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          rate_name: string
          mileage_rate?: number | null
          hourly_rate?: number | null
          flat_fee?: number | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          rate_name?: string
          mileage_rate?: number | null
          hourly_rate?: number | null
          flat_fee?: number | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      pricing_settings: {
        Row: {
          id: string
          organization_id: string
          default_markup_percentage: number
          minimum_job_amount: number | null
          emergency_multiplier: number | null
          weekend_multiplier: number | null
          holiday_multiplier: number | null
          settings: unknown
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          default_markup_percentage: number
          minimum_job_amount?: number | null
          emergency_multiplier?: number | null
          weekend_multiplier?: number | null
          holiday_multiplier?: number | null
          settings?: unknown
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          default_markup_percentage?: number
          minimum_job_amount?: number | null
          emergency_multiplier?: number | null
          weekend_multiplier?: number | null
          holiday_multiplier?: number | null
          settings?: unknown
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
export type Customer = Database['public']['Tables']['customers']['Row']
export type LaborRate = Database['public']['Tables']['labor_rates']['Row']
export type EquipmentRate = Database['public']['Tables']['equipment_rates']['Row']
export type MaterialCost = Database['public']['Tables']['material_costs']['Row']
export type DisposalFee = Database['public']['Tables']['disposal_fees']['Row']
export type TravelRate = Database['public']['Tables']['travel_rates']['Row']
export type PricingSetting = Database['public']['Tables']['pricing_settings']['Row']

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
export type CustomerInsert = Database['public']['Tables']['customers']['Insert']
export type LaborRateInsert = Database['public']['Tables']['labor_rates']['Insert']
export type EquipmentRateInsert = Database['public']['Tables']['equipment_rates']['Insert']
export type MaterialCostInsert = Database['public']['Tables']['material_costs']['Insert']
export type DisposalFeeInsert = Database['public']['Tables']['disposal_fees']['Insert']
export type TravelRateInsert = Database['public']['Tables']['travel_rates']['Insert']
export type PricingSettingInsert = Database['public']['Tables']['pricing_settings']['Insert']

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
export type CustomerUpdate = Database['public']['Tables']['customers']['Update']
export type LaborRateUpdate = Database['public']['Tables']['labor_rates']['Update']
export type EquipmentRateUpdate = Database['public']['Tables']['equipment_rates']['Update']
export type MaterialCostUpdate = Database['public']['Tables']['material_costs']['Update']
export type DisposalFeeUpdate = Database['public']['Tables']['disposal_fees']['Update']
export type TravelRateUpdate = Database['public']['Tables']['travel_rates']['Update']
export type PricingSettingUpdate = Database['public']['Tables']['pricing_settings']['Update']

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