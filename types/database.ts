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
  | 'daily_log'
  | 'opp'
  | 'other'
export type OrganizationDocumentCategory =
  | 'license'
  | 'certification'
  | 'insurance'
  | 'bond'
  | 'w9'
  | 'safety_plan'
  | 'references'
  | 'other'
export type CustomerStatus = 'inquiry' | 'prospect' | 'customer' | 'past_customer' | 'inactive'
export type CustomerSource = 'phone' | 'website' | 'mail' | 'referral' | 'other'
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
export type DisposalHazardType = 'asbestos_friable' | 'asbestos_non_friable' | 'mold' | 'lead' | 'other'

// Per-organization boilerplate for the four Protective Measures
// paragraphs of an Occupant Protection Plan. Pre-fills the OPP wizard
// so the office isn't retyping the same text per job.
export interface OppDefaults {
  containment?: string
  ventilation?: string
  work_practices?: string
  final_cleaning?: string
}

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
  // Either:
  //   - data: URL (legacy mobile photos, base64-embedded — render directly), or
  //   - storage public URL (legacy fallback only — private bucket means
  //     these don't load and `path` should be present instead).
  // For new uploads `path` is the source of truth; `url` may be empty.
  url: string
  // Storage object path inside the survey-photos bucket. New uploads
  // always populate this; render code should sign it on the fly. For
  // forensic-pipeline rows this mirrors `original_path` for backwards
  // compatibility with legacy readers.
  path?: string | null
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

  // Forensic photo pipeline (added 2026-04-30). Read sites should prefer
  // `stamped_path`; fall back to `original_path` (or `path` for legacy
  // rows) if `stamp_status` is not 'stamped'. Originals are admin-only;
  // stamped images follow normal org access.
  original_path?: string | null
  stamped_path?: string | null
  file_hash?: string | null // SHA-256 of original bytes
  captured_at?: string | null // EXIF DateTimeOriginal → client → server
  captured_lat?: number | null
  captured_lng?: number | null
  device_make?: string | null
  device_model?: string | null
  exif_raw?: Record<string, unknown> | null
  stamp_status?: 'pending' | 'stamped' | 'failed' | 'skipped' | null
  stamp_error?: string | null
}

// ============================================================================
// AUTO-GENERATED Database type below — produced by:
//   npx supabase gen types typescript --linked > types/_database_generated.ts
// Regenerate after schema changes; do not hand-edit.
// The hand-written enums above and the aliases below it are preserved.
// ============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          entity_id: string
          entity_name: string | null
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          organization_id: string
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          entity_id: string
          entity_name?: string | null
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          organization_id: string
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          entity_id?: string
          entity_name?: string | null
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_log: {
        Row: {
          created_at: string | null
          customer_id: string | null
          data_categories: string[] | null
          error_message: string | null
          id: string
          input_token_count: number | null
          model_version: string | null
          operation: string
          organization_id: string
          output_token_count: number | null
          pii_redacted: boolean | null
          processing_time_ms: number | null
          provider: string
          related_entity_id: string | null
          related_entity_type: string | null
          service_name: string
          success: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          data_categories?: string[] | null
          error_message?: string | null
          id?: string
          input_token_count?: number | null
          model_version?: string | null
          operation: string
          organization_id: string
          output_token_count?: number | null
          pii_redacted?: boolean | null
          processing_time_ms?: number | null
          provider: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          service_name: string
          success?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          data_categories?: string[] | null
          error_message?: string | null
          id?: string
          input_token_count?: number | null
          model_version?: string | null
          operation?: string
          organization_id?: string
          output_token_count?: number | null
          pii_redacted?: boolean | null
          processing_time_ms?: number | null
          provider?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          service_name?: string
          success?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ai_usage_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          organization_id: string
          rate_limit: number | null
          rate_limit_count: number | null
          rate_limit_reset_at: string | null
          revoked_at: string | null
          scopes: string[]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          organization_id: string
          rate_limit?: number | null
          rate_limit_count?: number | null
          rate_limit_reset_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          rate_limit?: number | null
          rate_limit_count?: number | null
          rate_limit_reset_at?: string | null
          revoked_at?: string | null
          scopes?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_log: {
        Row: {
          api_key_id: string
          created_at: string | null
          id: string
          ip_address: unknown
          method: string
          organization_id: string
          path: string
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
        }
        Insert: {
          api_key_id: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          method: string
          organization_id: string
          path: string
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          organization_id?: string
          path?: string
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_log_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_request_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_requests: {
        Row: {
          amount: number | null
          created_at: string | null
          entity_id: string
          entity_type: string
          final_status: string | null
          id: string
          level1_approver: string | null
          level1_at: string | null
          level1_notes: string | null
          level1_status: string | null
          level2_approver: string | null
          level2_at: string | null
          level2_notes: string | null
          level2_status: string | null
          organization_id: string
          requested_at: string | null
          requested_by: string
          requires_level2: boolean | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          final_status?: string | null
          id?: string
          level1_approver?: string | null
          level1_at?: string | null
          level1_notes?: string | null
          level1_status?: string | null
          level2_approver?: string | null
          level2_at?: string | null
          level2_notes?: string | null
          level2_status?: string | null
          organization_id: string
          requested_at?: string | null
          requested_by: string
          requires_level2?: boolean | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          final_status?: string | null
          id?: string
          level1_approver?: string | null
          level1_at?: string | null
          level1_notes?: string | null
          level1_status?: string | null
          level2_approver?: string | null
          level2_at?: string | null
          level2_notes?: string | null
          level2_status?: string | null
          organization_id?: string
          requested_at?: string | null
          requested_by?: string
          requires_level2?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_level1_approver_fkey"
            columns: ["level1_approver"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approval_requests_level1_approver_fkey"
            columns: ["level1_approver"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_level2_approver_fkey"
            columns: ["level2_approver"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approval_requests_level2_approver_fkey"
            columns: ["level2_approver"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "approval_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_thresholds: {
        Row: {
          approval_level: number
          approver_role: string | null
          created_at: string | null
          entity_type: string
          id: string
          is_active: boolean | null
          organization_id: string
          threshold_amount: number
        }
        Insert: {
          approval_level: number
          approver_role?: string | null
          created_at?: string | null
          entity_type: string
          id?: string
          is_active?: boolean | null
          organization_id: string
          threshold_amount: number
        }
        Update: {
          approval_level?: number
          approver_role?: string | null
          created_at?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean | null
          organization_id?: string
          threshold_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "approval_thresholds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attribution_touchpoints: {
        Row: {
          campaign: string | null
          channel: string | null
          content: string | null
          created_at: string | null
          entity_id: string
          entity_type: string
          id: string
          landing_page: string | null
          medium: string | null
          notes: string | null
          organization_id: string
          referred_by_company_id: string | null
          referred_by_contact_id: string | null
          referred_by_job_id: string | null
          referrer_url: string | null
          source: string | null
          term: string | null
          touch_type: string
          touched_at: string | null
        }
        Insert: {
          campaign?: string | null
          channel?: string | null
          content?: string | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          id?: string
          landing_page?: string | null
          medium?: string | null
          notes?: string | null
          organization_id: string
          referred_by_company_id?: string | null
          referred_by_contact_id?: string | null
          referred_by_job_id?: string | null
          referrer_url?: string | null
          source?: string | null
          term?: string | null
          touch_type: string
          touched_at?: string | null
        }
        Update: {
          campaign?: string | null
          channel?: string | null
          content?: string | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          landing_page?: string | null
          medium?: string | null
          notes?: string | null
          organization_id?: string
          referred_by_company_id?: string | null
          referred_by_contact_id?: string | null
          referred_by_job_id?: string | null
          referrer_url?: string | null
          source?: string | null
          term?: string | null
          touch_type?: string
          touched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attribution_touchpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_referred_by_company_id_fkey"
            columns: ["referred_by_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_referred_by_contact_id_fkey"
            columns: ["referred_by_contact_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_referred_by_job_id_fkey"
            columns: ["referred_by_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attribution_touchpoints_referred_by_job_id_fkey"
            columns: ["referred_by_job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_invoices: {
        Row: {
          amount_due: number | null
          amount_paid: number | null
          created_at: string | null
          due_date: string | null
          hosted_invoice_url: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          invoice_pdf_url: string | null
          organization_id: string
          paid_at: string | null
          status: string | null
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
        }
        Insert: {
          amount_due?: number | null
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          organization_id: string
          paid_at?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
        }
        Update: {
          amount_due?: number | null
          amount_paid?: number | null
          created_at?: string | null
          due_date?: string | null
          hosted_invoice_url?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          invoice_pdf_url?: string | null
          organization_id?: string
          paid_at?: string | null
          status?: string | null
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "organization_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_sync_events: {
        Row: {
          calendar_type: string
          created_at: string | null
          event_type: string
          google_event_id: string | null
          id: string
          job_id: string | null
          last_synced_at: string | null
          organization_id: string
          outlook_event_id: string | null
          sync_error: string | null
          updated_at: string | null
        }
        Insert: {
          calendar_type: string
          created_at?: string | null
          event_type: string
          google_event_id?: string | null
          id?: string
          job_id?: string | null
          last_synced_at?: string | null
          organization_id: string
          outlook_event_id?: string | null
          sync_error?: string | null
          updated_at?: string | null
        }
        Update: {
          calendar_type?: string
          created_at?: string | null
          event_type?: string
          google_event_id?: string | null
          id?: string
          job_id?: string | null
          last_synced_at?: string | null
          organization_id?: string
          outlook_event_id?: string | null
          sync_error?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calendar_sync_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_sync_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "calendar_sync_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_earnings: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          base_amount: number
          commission_amount: number
          commission_rate: number
          created_at: string | null
          earning_date: string
          id: string
          invoice_id: string | null
          job_id: string | null
          opportunity_id: string | null
          organization_id: string
          paid_at: string | null
          pay_period: string | null
          plan_id: string
          status: string | null
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount: number
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          earning_date: string
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          opportunity_id?: string | null
          organization_id: string
          paid_at?: string | null
          pay_period?: string | null
          plan_id: string
          status?: string | null
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          base_amount?: number
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          earning_date?: string
          id?: string
          invoice_id?: string | null
          job_id?: string | null
          opportunity_id?: string | null
          organization_id?: string
          paid_at?: string | null
          pay_period?: string | null
          plan_id?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_earnings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commission_earnings_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_earnings_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_earnings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_earnings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "commission_earnings_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_earnings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_earnings_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commission_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commission_earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "commission_earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_plans: {
        Row: {
          applies_to: string | null
          base_rate: number | null
          commission_type: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          tiers: Json | null
        }
        Insert: {
          applies_to?: string | null
          base_rate?: number | null
          commission_type: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          tiers?: Json | null
        }
        Update: {
          applies_to?: string | null
          base_rate?: number | null
          commission_type?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          tiers?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "commission_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          account_owner_id: string | null
          account_status: Database["public"]["Enums"]["account_status"] | null
          average_job_value: number | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_state: string | null
          billing_zip: string | null
          company_type: Database["public"]["Enums"]["company_type"] | null
          converting_touch_campaign: string | null
          converting_touch_date: string | null
          converting_touch_medium: string | null
          converting_touch_source: string | null
          created_at: string
          created_by: string | null
          customer_since: string | null
          email: string | null
          first_touch_date: string | null
          id: string
          industry: string | null
          last_touch_campaign: string | null
          last_touch_date: string | null
          last_touch_medium: string | null
          last_touch_source: string | null
          lead_source: string | null
          lead_source_detail: string | null
          lifetime_value: number | null
          location_id: string | null
          name: string
          notes: string | null
          organization_id: string
          payment_terms: string | null
          phone: string | null
          preferred_contact_method: string | null
          primary_contact_id: string | null
          primary_email: string | null
          primary_phone: string | null
          quickbooks_customer_id: string | null
          referred_by_company_id: string | null
          referred_by_contact_id: string | null
          service_address_line1: string | null
          service_address_line2: string | null
          service_city: string | null
          service_state: string | null
          service_zip: string | null
          status: string
          total_jobs_completed: number | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          website: string | null
        }
        Insert: {
          account_owner_id?: string | null
          account_status?: Database["public"]["Enums"]["account_status"] | null
          average_job_value?: number | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          company_type?: Database["public"]["Enums"]["company_type"] | null
          converting_touch_campaign?: string | null
          converting_touch_date?: string | null
          converting_touch_medium?: string | null
          converting_touch_source?: string | null
          created_at?: string
          created_by?: string | null
          customer_since?: string | null
          email?: string | null
          first_touch_date?: string | null
          id?: string
          industry?: string | null
          last_touch_campaign?: string | null
          last_touch_date?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          lifetime_value?: number | null
          location_id?: string | null
          name: string
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          primary_contact_id?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          quickbooks_customer_id?: string | null
          referred_by_company_id?: string | null
          referred_by_contact_id?: string | null
          service_address_line1?: string | null
          service_address_line2?: string | null
          service_city?: string | null
          service_state?: string | null
          service_zip?: string | null
          status?: string
          total_jobs_completed?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website?: string | null
        }
        Update: {
          account_owner_id?: string | null
          account_status?: Database["public"]["Enums"]["account_status"] | null
          average_job_value?: number | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip?: string | null
          company_type?: Database["public"]["Enums"]["company_type"] | null
          converting_touch_campaign?: string | null
          converting_touch_date?: string | null
          converting_touch_medium?: string | null
          converting_touch_source?: string | null
          created_at?: string
          created_by?: string | null
          customer_since?: string | null
          email?: string | null
          first_touch_date?: string | null
          id?: string
          industry?: string | null
          last_touch_campaign?: string | null
          last_touch_date?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          lifetime_value?: number | null
          location_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          phone?: string | null
          preferred_contact_method?: string | null
          primary_contact_id?: string | null
          primary_email?: string | null
          primary_phone?: string | null
          quickbooks_customer_id?: string | null
          referred_by_company_id?: string | null
          referred_by_contact_id?: string | null
          service_address_line1?: string | null
          service_address_line2?: string | null
          service_city?: string | null
          service_state?: string | null
          service_zip?: string | null
          status?: string
          total_jobs_completed?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_account_owner_id_fkey"
            columns: ["account_owner_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "companies_account_owner_id_fkey"
            columns: ["account_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_referred_by_company_id_fkey"
            columns: ["referred_by_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_referred_by_contact_id_fkey"
            columns: ["referred_by_contact_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_runs: {
        Row: {
          cron_name: string
          duration_ms: number | null
          error_message: string | null
          failure_count: number
          finished_at: string | null
          id: string
          started_at: string
          status: string
          summary: Json | null
        }
        Insert: {
          cron_name: string
          duration_ms?: number | null
          error_message?: string | null
          failure_count?: number
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: Json | null
        }
        Update: {
          cron_name?: string
          duration_ms?: number | null
          error_message?: string | null
          failure_count?: number
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          summary?: Json | null
        }
        Relationships: []
      }
      custom_domains: {
        Row: {
          created_at: string | null
          dns_records: Json | null
          domain: string
          id: string
          is_verified: boolean | null
          organization_id: string
          ssl_status: string | null
          updated_at: string | null
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          dns_records?: Json | null
          domain: string
          id?: string
          is_verified?: boolean | null
          organization_id: string
          ssl_status?: string | null
          updated_at?: string | null
          verification_token: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          dns_records?: Json | null
          domain?: string
          id?: string
          is_verified?: boolean | null
          organization_id?: string
          ssl_status?: string | null
          updated_at?: string | null
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          created_at: string
          customer_id: string
          email: string | null
          id: string
          is_primary: boolean
          mobile: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          preferred_contact_method: string | null
          role: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string | null
          id?: string
          is_primary?: boolean
          mobile?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          preferred_contact_method?: string | null
          role?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          mobile?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          preferred_contact_method?: string | null
          role?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          hubspot_list_id: string | null
          hubspot_synced_at: string | null
          id: string
          is_active: boolean | null
          last_calculated_at: string | null
          mailchimp_synced_at: string | null
          mailchimp_tag_id: string | null
          member_count: number | null
          name: string
          organization_id: string
          rules: Json | null
          segment_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hubspot_list_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          is_active?: boolean | null
          last_calculated_at?: string | null
          mailchimp_synced_at?: string | null
          mailchimp_tag_id?: string | null
          member_count?: number | null
          name: string
          organization_id: string
          rules?: Json | null
          segment_type?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hubspot_list_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          is_active?: boolean | null
          last_calculated_at?: string | null
          mailchimp_synced_at?: string | null
          mailchimp_tag_id?: string | null
          member_count?: number | null
          name?: string
          organization_id?: string
          rules?: Json | null
          segment_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "customer_segments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_segments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          account_owner_id: string | null
          address_line1: string | null
          address_line2: string | null
          ai_consent_date: string | null
          ai_consent_source: string | null
          ai_processing_consent: boolean | null
          city: string | null
          communication_preferences: Json | null
          company_id: string | null
          company_name: string | null
          contact_role: Database["public"]["Enums"]["contact_role"] | null
          contact_status: Database["public"]["Enums"]["contact_status"] | null
          contact_type: string
          converting_touch_campaign: string | null
          converting_touch_date: string | null
          converting_touch_medium: string | null
          converting_touch_source: string | null
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string | null
          first_touch_date: string | null
          hubspot_id: string | null
          hubspot_synced_at: string | null
          id: string
          insurance_adjuster_email: string | null
          insurance_adjuster_name: string | null
          insurance_adjuster_phone: string | null
          insurance_carrier: string | null
          insurance_policy_number: string | null
          is_primary_contact: boolean | null
          last_contacted_date: string | null
          last_job_date: string | null
          last_name: string | null
          last_touch_campaign: string | null
          last_touch_date: string | null
          last_touch_medium: string | null
          last_touch_source: string | null
          lead_source: string | null
          lead_source_detail: string | null
          lifetime_value: number | null
          location_id: string | null
          mailchimp_id: string | null
          mailchimp_synced_at: string | null
          marketing_consent: boolean | null
          marketing_consent_date: string | null
          mobile_phone: string | null
          name: string
          next_followup_date: string | null
          next_followup_note: string | null
          notes: string | null
          office_phone: string | null
          opted_into_email: boolean | null
          opted_into_email_date: string | null
          opted_into_sms: boolean | null
          opted_into_sms_date: string | null
          organization_id: string
          phone: string | null
          preferred_contact_method: string | null
          property_id: string | null
          qb_customer_id: string | null
          qb_sync_error: string | null
          qb_synced_at: string | null
          referral_source: string | null
          referred_by_contact_id: string | null
          role_title: string | null
          sms_opt_in: boolean | null
          sms_opt_in_at: string | null
          sms_opt_out_at: string | null
          source: Database["public"]["Enums"]["customer_source"] | null
          state: string | null
          status: Database["public"]["Enums"]["customer_status"]
          title: string | null
          total_jobs: number | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          zip: string | null
        }
        Insert: {
          account_owner_id?: string | null
          address_line1?: string | null
          address_line2?: string | null
          ai_consent_date?: string | null
          ai_consent_source?: string | null
          ai_processing_consent?: boolean | null
          city?: string | null
          communication_preferences?: Json | null
          company_id?: string | null
          company_name?: string | null
          contact_role?: Database["public"]["Enums"]["contact_role"] | null
          contact_status?: Database["public"]["Enums"]["contact_status"] | null
          contact_type?: string
          converting_touch_campaign?: string | null
          converting_touch_date?: string | null
          converting_touch_medium?: string | null
          converting_touch_source?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          first_touch_date?: string | null
          hubspot_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          insurance_adjuster_email?: string | null
          insurance_adjuster_name?: string | null
          insurance_adjuster_phone?: string | null
          insurance_carrier?: string | null
          insurance_policy_number?: string | null
          is_primary_contact?: boolean | null
          last_contacted_date?: string | null
          last_job_date?: string | null
          last_name?: string | null
          last_touch_campaign?: string | null
          last_touch_date?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          lifetime_value?: number | null
          location_id?: string | null
          mailchimp_id?: string | null
          mailchimp_synced_at?: string | null
          marketing_consent?: boolean | null
          marketing_consent_date?: string | null
          mobile_phone?: string | null
          name: string
          next_followup_date?: string | null
          next_followup_note?: string | null
          notes?: string | null
          office_phone?: string | null
          opted_into_email?: boolean | null
          opted_into_email_date?: string | null
          opted_into_sms?: boolean | null
          opted_into_sms_date?: string | null
          organization_id: string
          phone?: string | null
          preferred_contact_method?: string | null
          property_id?: string | null
          qb_customer_id?: string | null
          qb_sync_error?: string | null
          qb_synced_at?: string | null
          referral_source?: string | null
          referred_by_contact_id?: string | null
          role_title?: string | null
          sms_opt_in?: boolean | null
          sms_opt_in_at?: string | null
          sms_opt_out_at?: string | null
          source?: Database["public"]["Enums"]["customer_source"] | null
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          title?: string | null
          total_jobs?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          zip?: string | null
        }
        Update: {
          account_owner_id?: string | null
          address_line1?: string | null
          address_line2?: string | null
          ai_consent_date?: string | null
          ai_consent_source?: string | null
          ai_processing_consent?: boolean | null
          city?: string | null
          communication_preferences?: Json | null
          company_id?: string | null
          company_name?: string | null
          contact_role?: Database["public"]["Enums"]["contact_role"] | null
          contact_status?: Database["public"]["Enums"]["contact_status"] | null
          contact_type?: string
          converting_touch_campaign?: string | null
          converting_touch_date?: string | null
          converting_touch_medium?: string | null
          converting_touch_source?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string | null
          first_touch_date?: string | null
          hubspot_id?: string | null
          hubspot_synced_at?: string | null
          id?: string
          insurance_adjuster_email?: string | null
          insurance_adjuster_name?: string | null
          insurance_adjuster_phone?: string | null
          insurance_carrier?: string | null
          insurance_policy_number?: string | null
          is_primary_contact?: boolean | null
          last_contacted_date?: string | null
          last_job_date?: string | null
          last_name?: string | null
          last_touch_campaign?: string | null
          last_touch_date?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          lifetime_value?: number | null
          location_id?: string | null
          mailchimp_id?: string | null
          mailchimp_synced_at?: string | null
          marketing_consent?: boolean | null
          marketing_consent_date?: string | null
          mobile_phone?: string | null
          name?: string
          next_followup_date?: string | null
          next_followup_note?: string | null
          notes?: string | null
          office_phone?: string | null
          opted_into_email?: boolean | null
          opted_into_email_date?: string | null
          opted_into_sms?: boolean | null
          opted_into_sms_date?: string | null
          organization_id?: string
          phone?: string | null
          preferred_contact_method?: string | null
          property_id?: string | null
          qb_customer_id?: string | null
          qb_sync_error?: string | null
          qb_synced_at?: string | null
          referral_source?: string | null
          referred_by_contact_id?: string | null
          role_title?: string | null
          sms_opt_in?: boolean | null
          sms_opt_in_at?: string | null
          sms_opt_out_at?: string | null
          source?: Database["public"]["Enums"]["customer_source"] | null
          state?: string | null
          status?: Database["public"]["Enums"]["customer_status"]
          title?: string | null
          total_jobs?: number | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_account_owner_id_fkey"
            columns: ["account_owner_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "customers_account_owner_id_fkey"
            columns: ["account_owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_referred_by_contact_id_fkey"
            columns: ["referred_by_contact_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      disposal_fees: {
        Row: {
          cost_per_cubic_yard: number
          created_at: string
          description: string | null
          hazard_type: Database["public"]["Enums"]["disposal_hazard_type"]
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          cost_per_cubic_yard: number
          created_at?: string
          description?: string | null
          hazard_type: Database["public"]["Enums"]["disposal_hazard_type"]
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          cost_per_cubic_yard?: number
          created_at?: string
          description?: string | null
          hazard_type?: Database["public"]["Enums"]["disposal_hazard_type"]
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disposal_fees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_sends: {
        Row: {
          bcc: string[] | null
          bounced_at: string | null
          cc: string[] | null
          click_count: number | null
          complained_at: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          first_clicked_at: string | null
          first_opened_at: string | null
          from_email: string
          from_name: string | null
          id: string
          last_opened_at: string | null
          open_count: number | null
          organization_id: string
          provider: string
          provider_message_id: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          reply_to: string | null
          sent_at: string | null
          sent_by: string | null
          status: string
          subject: string
          tags: string[] | null
          to_email: string
          updated_at: string
        }
        Insert: {
          bcc?: string[] | null
          bounced_at?: string | null
          cc?: string[] | null
          click_count?: number | null
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          from_email: string
          from_name?: string | null
          id?: string
          last_opened_at?: string | null
          open_count?: number | null
          organization_id: string
          provider?: string
          provider_message_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reply_to?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject: string
          tags?: string[] | null
          to_email: string
          updated_at?: string
        }
        Update: {
          bcc?: string[] | null
          bounced_at?: string | null
          cc?: string[] | null
          click_count?: number | null
          complained_at?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          first_clicked_at?: string | null
          first_opened_at?: string | null
          from_email?: string
          from_name?: string | null
          id?: string
          last_opened_at?: string | null
          open_count?: number | null
          organization_id?: string
          provider?: string
          provider_message_id?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          reply_to?: string | null
          sent_at?: string | null
          sent_by?: string | null
          status?: string
          subject?: string
          tags?: string[] | null
          to_email?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_sends_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "email_sends_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          daily_rate: number
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          daily_rate: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          daily_rate?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_rates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          rate_per_day: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          rate_per_day: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          rate_per_day?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_attached_documents: {
        Row: {
          attached_at: string
          attached_by: string | null
          document_id: string
          estimate_id: string
          organization_id: string
        }
        Insert: {
          attached_at?: string
          attached_by?: string | null
          document_id: string
          estimate_id: string
          organization_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string | null
          document_id?: string
          estimate_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estimate_attached_documents_attached_by_fkey"
            columns: ["attached_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "estimate_attached_documents_attached_by_fkey"
            columns: ["attached_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_attached_documents_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "organization_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_attached_documents_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_attached_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_line_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string
          estimate_id: string
          id: string
          is_included: boolean | null
          is_optional: boolean | null
          item_type: Database["public"]["Enums"]["line_item_type"]
          notes: string | null
          quantity: number | null
          sort_order: number | null
          source_rate_id: string | null
          source_table: string | null
          total_price: number | null
          unit: string | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description: string
          estimate_id: string
          id?: string
          is_included?: boolean | null
          is_optional?: boolean | null
          item_type: Database["public"]["Enums"]["line_item_type"]
          notes?: string | null
          quantity?: number | null
          sort_order?: number | null
          source_rate_id?: string | null
          source_table?: string | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string
          estimate_id?: string
          id?: string
          is_included?: boolean | null
          is_optional?: boolean | null
          item_type?: Database["public"]["Enums"]["line_item_type"]
          notes?: string | null
          quantity?: number | null
          sort_order?: number | null
          source_rate_id?: string | null
          source_table?: string | null
          total_price?: number | null
          unit?: string | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_line_items_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_suggestions: {
        Row: {
          accepted_at: string | null
          confidence_score: number | null
          created_at: string | null
          hazard_types: string[] | null
          id: string
          model_version: string | null
          modified_before_accept: boolean | null
          organization_id: string
          property_type: string | null
          reasoning: string | null
          site_survey_id: string | null
          square_footage: number | null
          suggested_items: Json
          total_amount: number | null
          was_accepted: boolean | null
        }
        Insert: {
          accepted_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          hazard_types?: string[] | null
          id?: string
          model_version?: string | null
          modified_before_accept?: boolean | null
          organization_id: string
          property_type?: string | null
          reasoning?: string | null
          site_survey_id?: string | null
          square_footage?: number | null
          suggested_items?: Json
          total_amount?: number | null
          was_accepted?: boolean | null
        }
        Update: {
          accepted_at?: string | null
          confidence_score?: number | null
          created_at?: string | null
          hazard_types?: string[] | null
          id?: string
          model_version?: string | null
          modified_before_accept?: boolean | null
          organization_id?: string
          property_type?: string | null
          reasoning?: string | null
          site_survey_id?: string | null
          square_footage?: number | null
          suggested_items?: Json
          total_amount?: number | null
          was_accepted?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_suggestions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_suggestions_site_survey_id_fkey"
            columns: ["site_survey_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          approval_notes: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          discount_amount: number | null
          discount_percent: number | null
          estimate_number: string
          estimate_root_id: string
          estimated_duration_days: number | null
          estimated_end_date: string | null
          estimated_start_date: string | null
          id: string
          internal_notes: string | null
          location_id: string | null
          markup_amount: number | null
          markup_percent: number | null
          organization_id: string
          parent_estimate_id: string | null
          project_description: string | null
          project_name: string | null
          revision_notes: string | null
          scope_of_work: string | null
          site_survey_id: string | null
          status: Database["public"]["Enums"]["estimate_status"] | null
          subtotal: number | null
          tax_amount: number | null
          tax_percent: number | null
          total: number | null
          updated_at: string | null
          valid_until: string | null
          version: number
        }
        Insert: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          estimate_number: string
          estimate_root_id: string
          estimated_duration_days?: number | null
          estimated_end_date?: string | null
          estimated_start_date?: string | null
          id?: string
          internal_notes?: string | null
          location_id?: string | null
          markup_amount?: number | null
          markup_percent?: number | null
          organization_id: string
          parent_estimate_id?: string | null
          project_description?: string | null
          project_name?: string | null
          revision_notes?: string | null
          scope_of_work?: string | null
          site_survey_id?: string | null
          status?: Database["public"]["Enums"]["estimate_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_percent?: number | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number
        }
        Update: {
          approval_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          discount_percent?: number | null
          estimate_number?: string
          estimate_root_id?: string
          estimated_duration_days?: number | null
          estimated_end_date?: string | null
          estimated_start_date?: string | null
          id?: string
          internal_notes?: string | null
          location_id?: string | null
          markup_amount?: number | null
          markup_percent?: number | null
          organization_id?: string
          parent_estimate_id?: string | null
          project_description?: string | null
          project_name?: string | null
          revision_notes?: string | null
          scope_of_work?: string | null
          site_survey_id?: string | null
          status?: Database["public"]["Enums"]["estimate_status"] | null
          subtotal?: number | null
          tax_amount?: number | null
          tax_percent?: number | null
          total?: number | null
          updated_at?: string | null
          valid_until?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "estimates_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "estimates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_estimate_root_id_fkey"
            columns: ["estimate_root_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_parent_estimate_id_fkey"
            columns: ["parent_estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimates_site_survey_id_fkey"
            columns: ["site_survey_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_surveys: {
        Row: {
          access_token: string
          completed_at: string | null
          created_at: string | null
          customer_company: string | null
          customer_id: string
          customer_name: string | null
          feedback_text: string | null
          id: string
          improvement_suggestions: string | null
          ip_address: string | null
          job_id: string
          likelihood_to_recommend: number | null
          organization_id: string
          rating_communication: number | null
          rating_overall: number | null
          rating_quality: number | null
          rating_timeliness: number | null
          rating_value: number | null
          reminder_sent_at: string | null
          sent_at: string | null
          sent_to_email: string | null
          status: string
          testimonial_approved: boolean | null
          testimonial_approved_at: string | null
          testimonial_approved_by: string | null
          testimonial_permission: boolean | null
          testimonial_text: string | null
          token_expires_at: string
          updated_at: string | null
          user_agent: string | null
          viewed_at: string | null
          would_recommend: boolean | null
        }
        Insert: {
          access_token: string
          completed_at?: string | null
          created_at?: string | null
          customer_company?: string | null
          customer_id: string
          customer_name?: string | null
          feedback_text?: string | null
          id?: string
          improvement_suggestions?: string | null
          ip_address?: string | null
          job_id: string
          likelihood_to_recommend?: number | null
          organization_id: string
          rating_communication?: number | null
          rating_overall?: number | null
          rating_quality?: number | null
          rating_timeliness?: number | null
          rating_value?: number | null
          reminder_sent_at?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          status?: string
          testimonial_approved?: boolean | null
          testimonial_approved_at?: string | null
          testimonial_approved_by?: string | null
          testimonial_permission?: boolean | null
          testimonial_text?: string | null
          token_expires_at: string
          updated_at?: string | null
          user_agent?: string | null
          viewed_at?: string | null
          would_recommend?: boolean | null
        }
        Update: {
          access_token?: string
          completed_at?: string | null
          created_at?: string | null
          customer_company?: string | null
          customer_id?: string
          customer_name?: string | null
          feedback_text?: string | null
          id?: string
          improvement_suggestions?: string | null
          ip_address?: string | null
          job_id?: string
          likelihood_to_recommend?: number | null
          organization_id?: string
          rating_communication?: number | null
          rating_overall?: number | null
          rating_quality?: number | null
          rating_timeliness?: number | null
          rating_value?: number | null
          reminder_sent_at?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          status?: string
          testimonial_approved?: boolean | null
          testimonial_approved_at?: string | null
          testimonial_approved_by?: string | null
          testimonial_permission?: boolean | null
          testimonial_text?: string | null
          token_expires_at?: string
          updated_at?: string | null
          user_agent?: string | null
          viewed_at?: string | null
          would_recommend?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_surveys_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_surveys_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_surveys_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "feedback_surveys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_surveys_testimonial_approved_by_fkey"
            columns: ["testimonial_approved_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "feedback_surveys_testimonial_approved_by_fkey"
            columns: ["testimonial_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          due_date: string
          entity_id: string
          entity_type: string
          id: string
          note: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date: string
          entity_id: string
          entity_type: string
          id?: string
          note?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string
          entity_id?: string
          entity_type?: string
          id?: string
          note?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follow_ups_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "follow_ups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      industry_events: {
        Row: {
          all_day: boolean
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string
          id: string
          location: string | null
          organization_id: string
          registration_url: string | null
          source: string | null
          source_ref: string | null
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at: string
          id?: string
          location?: string | null
          organization_id: string
          registration_url?: string | null
          source?: string | null
          source_ref?: string | null
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string
          id?: string
          location?: string | null
          organization_id?: string
          registration_url?: string | null
          source?: string | null
          source_ref?: string | null
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "industry_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "industry_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "industry_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_sync_log: {
        Row: {
          completed_at: string | null
          direction: string
          duration_ms: number | null
          errors: Json | null
          id: string
          integration_type: string
          organization_id: string
          records_failed: number | null
          records_processed: number | null
          records_succeeded: number | null
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          direction: string
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          integration_type: string
          organization_id: string
          records_failed?: number | null
          records_processed?: number | null
          records_succeeded?: number | null
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          direction?: string
          duration_ms?: number | null
          errors?: Json | null
          id?: string
          integration_type?: string
          organization_id?: string
          records_failed?: number | null
          records_processed?: number | null
          records_succeeded?: number | null
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_sync_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_attached_documents: {
        Row: {
          attached_at: string
          attached_by: string | null
          invoice_id: string
          job_document_id: string
          organization_id: string
        }
        Insert: {
          attached_at?: string
          attached_by?: string | null
          invoice_id: string
          job_document_id: string
          organization_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string | null
          invoice_id?: string
          job_document_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_attached_documents_attached_by_fkey"
            columns: ["attached_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoice_attached_documents_attached_by_fkey"
            columns: ["attached_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attached_documents_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attached_documents_job_document_id_fkey"
            columns: ["job_document_id"]
            isOneToOne: false
            referencedRelation: "job_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_attached_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string
          line_total: number
          quantity: number
          sort_order: number | null
          source_id: string | null
          source_type: string | null
          unit: string | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id: string
          line_total: number
          quantity?: number
          sort_order?: number | null
          source_id?: string | null
          source_type?: string | null
          unit?: string | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          line_total?: number
          quantity?: number
          sort_order?: number | null
          source_id?: string | null
          source_type?: string | null
          unit?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number | null
          balance_due: number
          created_at: string | null
          created_by: string | null
          customer_id: string
          discount_amount: number | null
          due_date: string
          id: string
          invoice_date: string
          invoice_number: string
          job_id: string | null
          location_id: string | null
          notes: string | null
          organization_id: string
          payment_terms: string | null
          qb_invoice_id: string | null
          qb_synced_at: string | null
          sent_at: string | null
          sent_via: string | null
          status: string
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total: number
          updated_at: string | null
          viewed_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          balance_due?: number
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          discount_amount?: number | null
          due_date: string
          id?: string
          invoice_date?: string
          invoice_number: string
          job_id?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id: string
          payment_terms?: string | null
          qb_invoice_id?: string | null
          qb_synced_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string | null
          viewed_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          balance_due?: number
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          discount_amount?: number | null
          due_date?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          job_id?: string | null
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          payment_terms?: string | null
          qb_invoice_id?: string | null
          qb_synced_at?: string | null
          sent_at?: string | null
          sent_via?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total?: number
          updated_at?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "invoices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      job_change_orders: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          change_order_number: string
          created_at: string | null
          created_by: string | null
          customer_approved: boolean | null
          customer_approved_at: string | null
          description: string
          id: string
          job_id: string
          reason: string | null
          status: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          change_order_number: string
          created_at?: string | null
          created_by?: string | null
          customer_approved?: boolean | null
          customer_approved_at?: string | null
          description: string
          id?: string
          job_id: string
          reason?: string | null
          status?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          change_order_number?: string
          created_at?: string | null
          created_by?: string | null
          customer_approved?: boolean | null
          customer_approved_at?: string | null
          description?: string
          id?: string
          job_id?: string
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_change_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_change_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_change_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_change_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_change_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_change_orders_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      job_completion_checklists: {
        Row: {
          category: string
          completed_at: string | null
          completed_by: string | null
          completion_notes: string | null
          created_at: string | null
          evidence_photo_ids: string[] | null
          id: string
          is_completed: boolean | null
          is_required: boolean | null
          item_description: string | null
          item_name: string
          job_id: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          category: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          evidence_photo_ids?: string[] | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          item_description?: string | null
          item_name: string
          job_id: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          completed_at?: string | null
          completed_by?: string | null
          completion_notes?: string | null
          created_at?: string | null
          evidence_photo_ids?: string[] | null
          id?: string
          is_completed?: boolean | null
          is_required?: boolean | null
          item_description?: string | null
          item_name?: string
          job_id?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_completion_checklists_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_completion_checklists_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_completion_checklists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_completion_checklists_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      job_completion_photos: {
        Row: {
          camera_make: string | null
          camera_model: string | null
          caption: string | null
          created_at: string | null
          file_name: string | null
          file_size: number | null
          id: string
          image_height: number | null
          image_width: number | null
          job_id: string
          location_lat: number | null
          location_lng: number | null
          mime_type: string | null
          photo_type: string
          photo_url: string
          storage_path: string
          taken_at: string | null
          thumbnail_url: string | null
          uploaded_by: string | null
        }
        Insert: {
          camera_make?: string | null
          camera_model?: string | null
          caption?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          job_id: string
          location_lat?: number | null
          location_lng?: number | null
          mime_type?: string | null
          photo_type?: string
          photo_url: string
          storage_path: string
          taken_at?: string | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Update: {
          camera_make?: string | null
          camera_model?: string | null
          caption?: string | null
          created_at?: string | null
          file_name?: string | null
          file_size?: number | null
          id?: string
          image_height?: number | null
          image_width?: number | null
          job_id?: string
          location_lat?: number | null
          location_lng?: number | null
          mime_type?: string | null
          photo_type?: string
          photo_url?: string
          storage_path?: string
          taken_at?: string | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_completion_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_completion_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_completion_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_completion_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_completions: {
        Row: {
          actual_hours: number | null
          actual_labor_cost: number | null
          actual_material_cost: number | null
          actual_total: number | null
          cost_variance: number | null
          cost_variance_percent: number | null
          created_at: string | null
          customer_signature_data: string | null
          customer_signature_name: string | null
          customer_signed: boolean | null
          customer_signed_at: string | null
          estimated_hours: number | null
          estimated_material_cost: number | null
          estimated_total: number | null
          field_notes: string | null
          hours_variance: number | null
          hours_variance_percent: number | null
          id: string
          issues_encountered: string | null
          job_id: string
          recommendations: string | null
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string | null
        }
        Insert: {
          actual_hours?: number | null
          actual_labor_cost?: number | null
          actual_material_cost?: number | null
          actual_total?: number | null
          cost_variance?: number | null
          cost_variance_percent?: number | null
          created_at?: string | null
          customer_signature_data?: string | null
          customer_signature_name?: string | null
          customer_signed?: boolean | null
          customer_signed_at?: string | null
          estimated_hours?: number | null
          estimated_material_cost?: number | null
          estimated_total?: number | null
          field_notes?: string | null
          hours_variance?: number | null
          hours_variance_percent?: number | null
          id?: string
          issues_encountered?: string | null
          job_id: string
          recommendations?: string | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_hours?: number | null
          actual_labor_cost?: number | null
          actual_material_cost?: number | null
          actual_total?: number | null
          cost_variance?: number | null
          cost_variance_percent?: number | null
          created_at?: string | null
          customer_signature_data?: string | null
          customer_signature_name?: string | null
          customer_signed?: boolean | null
          customer_signed_at?: string | null
          estimated_hours?: number | null
          estimated_material_cost?: number | null
          estimated_total?: number | null
          field_notes?: string | null
          hours_variance?: number | null
          hours_variance_percent?: number | null
          id?: string
          issues_encountered?: string | null
          job_id?: string
          recommendations?: string | null
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_completions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_completions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_completions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_completions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_completions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_completions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_crew: {
        Row: {
          break_minutes: number | null
          clock_in_at: string | null
          clock_out_at: string | null
          created_at: string | null
          hours_worked: number | null
          id: string
          is_lead: boolean | null
          job_id: string
          notes: string | null
          profile_id: string
          role: string
          scheduled_end: string | null
          scheduled_start: string | null
          updated_at: string | null
        }
        Insert: {
          break_minutes?: number | null
          clock_in_at?: string | null
          clock_out_at?: string | null
          created_at?: string | null
          hours_worked?: number | null
          id?: string
          is_lead?: boolean | null
          job_id: string
          notes?: string | null
          profile_id: string
          role?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          updated_at?: string | null
        }
        Update: {
          break_minutes?: number | null
          clock_in_at?: string | null
          clock_out_at?: string | null
          created_at?: string | null
          hours_worked?: number | null
          id?: string
          is_lead?: boolean | null
          job_id?: string
          notes?: string | null
          profile_id?: string
          role?: string
          scheduled_end?: string | null
          scheduled_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_crew_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_crew_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_crew_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_crew_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_disposal: {
        Row: {
          created_at: string | null
          disposal_cost: number | null
          disposal_facility_address: string | null
          disposal_facility_name: string | null
          disposal_type: string | null
          hazard_type: string
          id: string
          job_id: string
          manifest_date: string | null
          manifest_document_url: string | null
          manifest_number: string | null
          quantity: number
          unit: string
        }
        Insert: {
          created_at?: string | null
          disposal_cost?: number | null
          disposal_facility_address?: string | null
          disposal_facility_name?: string | null
          disposal_type?: string | null
          hazard_type: string
          id?: string
          job_id: string
          manifest_date?: string | null
          manifest_document_url?: string | null
          manifest_number?: string | null
          quantity: number
          unit: string
        }
        Update: {
          created_at?: string | null
          disposal_cost?: number | null
          disposal_facility_address?: string | null
          disposal_facility_name?: string | null
          disposal_type?: string | null
          hazard_type?: string
          id?: string
          job_id?: string
          manifest_date?: string | null
          manifest_document_url?: string | null
          manifest_number?: string | null
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_disposal_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_disposal_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      job_documents: {
        Row: {
          category: string
          file_name: string
          id: string
          job_id: string
          mime_type: string | null
          notes: string | null
          organization_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          file_name: string
          id?: string
          job_id: string
          mime_type?: string | null
          notes?: string | null
          organization_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          file_name?: string
          id?: string
          job_id?: string
          mime_type?: string | null
          notes?: string | null
          organization_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_documents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_equipment: {
        Row: {
          created_at: string | null
          equipment_name: string
          equipment_type: string | null
          id: string
          is_rental: boolean | null
          job_id: string
          notes: string | null
          quantity: number | null
          rental_days: number | null
          rental_end_date: string | null
          rental_rate_daily: number | null
          rental_start_date: string | null
          rental_total: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          equipment_name: string
          equipment_type?: string | null
          id?: string
          is_rental?: boolean | null
          job_id: string
          notes?: string | null
          quantity?: number | null
          rental_days?: number | null
          rental_end_date?: string | null
          rental_rate_daily?: number | null
          rental_start_date?: string | null
          rental_total?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          equipment_name?: string
          equipment_type?: string | null
          id?: string
          is_rental?: boolean | null
          job_id?: string
          notes?: string | null
          quantity?: number | null
          rental_days?: number | null
          rental_end_date?: string | null
          rental_rate_daily?: number | null
          rental_start_date?: string | null
          rental_total?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_equipment_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_equipment_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      job_material_usage: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          job_id: string
          job_material_id: string | null
          material_name: string
          material_type: string | null
          notes: string | null
          quantity_estimated: number | null
          quantity_used: number
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
          variance_percent: number | null
          variance_quantity: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          job_id: string
          job_material_id?: string | null
          material_name: string
          material_type?: string | null
          notes?: string | null
          quantity_estimated?: number | null
          quantity_used: number
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          variance_percent?: number | null
          variance_quantity?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          job_id?: string
          job_material_id?: string | null
          material_name?: string
          material_type?: string | null
          notes?: string | null
          quantity_estimated?: number | null
          quantity_used?: number
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
          variance_percent?: number | null
          variance_quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_material_usage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_material_usage_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_material_usage_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_material_usage_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_material_usage_job_material_id_fkey"
            columns: ["job_material_id"]
            isOneToOne: false
            referencedRelation: "job_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      job_materials: {
        Row: {
          created_at: string | null
          id: string
          job_id: string
          material_name: string
          material_type: string | null
          notes: string | null
          quantity_estimated: number | null
          quantity_used: number | null
          total_cost: number | null
          unit: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          job_id: string
          material_name: string
          material_type?: string | null
          notes?: string | null
          quantity_estimated?: number | null
          quantity_used?: number | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          job_id?: string
          material_name?: string
          material_type?: string | null
          notes?: string | null
          quantity_estimated?: number | null
          quantity_used?: number | null
          total_cost?: number | null
          unit?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_materials_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      job_notes: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_internal: boolean | null
          job_id: string
          note_type: string
        }
        Insert: {
          attachments?: Json | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_internal?: boolean | null
          job_id: string
          note_type?: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_internal?: boolean | null
          job_id?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_notes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_notes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
        ]
      }
      job_time_entries: {
        Row: {
          billable: boolean | null
          created_at: string | null
          created_by: string | null
          description: string | null
          hourly_rate: number | null
          hours: number
          id: string
          job_id: string
          notes: string | null
          profile_id: string | null
          updated_at: string | null
          work_date: string
          work_type: string
        }
        Insert: {
          billable?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hourly_rate?: number | null
          hours: number
          id?: string
          job_id: string
          notes?: string | null
          profile_id?: string | null
          updated_at?: string | null
          work_date: string
          work_type?: string
        }
        Update: {
          billable?: boolean | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          hourly_rate?: number | null
          hours?: number
          id?: string
          job_id?: string
          notes?: string | null
          profile_id?: string | null
          updated_at?: string | null
          work_date?: string
          work_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_time_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_time_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_time_entries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "job_time_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_time_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          access_notes: string | null
          actual_affected_area_sqft: number | null
          actual_cost: number | null
          actual_duration_days: number | null
          actual_end_at: string | null
          actual_end_date: string | null
          actual_labor_hours: number | null
          actual_revenue: number | null
          actual_start_at: string | null
          actual_start_date: string | null
          air_monitoring_required: boolean | null
          attributed_lead_source: string | null
          attributed_lead_source_detail: string | null
          change_order_amount: number | null
          clearance_testing_required: boolean | null
          company_id: string | null
          completion_id: string | null
          completion_notes: string | null
          completion_photos: Json | null
          contact_onsite_name: string | null
          contact_onsite_phone: string | null
          containment_level:
            | Database["public"]["Enums"]["containment_level"]
            | null
          contract_amount: number | null
          converting_touch_campaign: string | null
          converting_touch_medium: string | null
          converting_touch_source: string | null
          created_at: string | null
          created_by: string | null
          crew_lead_id: string | null
          customer_id: string
          customer_signed_off: boolean | null
          customer_signoff_at: string | null
          customer_signoff_name: string | null
          deposit_amount: number | null
          deposit_received_date: string | null
          disposal_manifest_numbers: string[] | null
          estimate_id: string | null
          estimated_cost: number | null
          estimated_duration_hours: number | null
          estimated_labor_hours: number | null
          estimated_revenue: number | null
          final_amount: number | null
          final_invoice_date: string | null
          final_payment_date: string | null
          first_touch_campaign: string | null
          first_touch_medium: string | null
          first_touch_source: string | null
          gate_code: string | null
          gross_margin_pct: number | null
          hazard_types: string[] | null
          id: string
          inspection_date: string | null
          inspection_notes: string | null
          inspection_passed: boolean | null
          inspection_required: boolean | null
          internal_notes: string | null
          invoice_id: string | null
          is_repeat_customer: boolean | null
          job_address: string
          job_city: string | null
          job_latitude: number | null
          job_longitude: number | null
          job_number: string
          job_state: string | null
          job_zip: string | null
          last_touch_campaign: string | null
          last_touch_medium: string | null
          last_touch_source: string | null
          lead_source: string | null
          location_id: string | null
          lockbox_code: string | null
          name: string | null
          opportunity_id: string | null
          organization_id: string
          permit_numbers: string[] | null
          primary_contact_id: string | null
          property_id: string | null
          proposal_id: string | null
          referral_job_id: string | null
          scheduled_end_date: string | null
          scheduled_end_time: string | null
          scheduled_start_date: string
          scheduled_start_time: string | null
          site_contact_id: string | null
          site_survey_id: string | null
          special_instructions: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          access_notes?: string | null
          actual_affected_area_sqft?: number | null
          actual_cost?: number | null
          actual_duration_days?: number | null
          actual_end_at?: string | null
          actual_end_date?: string | null
          actual_labor_hours?: number | null
          actual_revenue?: number | null
          actual_start_at?: string | null
          actual_start_date?: string | null
          air_monitoring_required?: boolean | null
          attributed_lead_source?: string | null
          attributed_lead_source_detail?: string | null
          change_order_amount?: number | null
          clearance_testing_required?: boolean | null
          company_id?: string | null
          completion_id?: string | null
          completion_notes?: string | null
          completion_photos?: Json | null
          contact_onsite_name?: string | null
          contact_onsite_phone?: string | null
          containment_level?:
            | Database["public"]["Enums"]["containment_level"]
            | null
          contract_amount?: number | null
          converting_touch_campaign?: string | null
          converting_touch_medium?: string | null
          converting_touch_source?: string | null
          created_at?: string | null
          created_by?: string | null
          crew_lead_id?: string | null
          customer_id: string
          customer_signed_off?: boolean | null
          customer_signoff_at?: string | null
          customer_signoff_name?: string | null
          deposit_amount?: number | null
          deposit_received_date?: string | null
          disposal_manifest_numbers?: string[] | null
          estimate_id?: string | null
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          estimated_labor_hours?: number | null
          estimated_revenue?: number | null
          final_amount?: number | null
          final_invoice_date?: string | null
          final_payment_date?: string | null
          first_touch_campaign?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          gate_code?: string | null
          gross_margin_pct?: number | null
          hazard_types?: string[] | null
          id?: string
          inspection_date?: string | null
          inspection_notes?: string | null
          inspection_passed?: boolean | null
          inspection_required?: boolean | null
          internal_notes?: string | null
          invoice_id?: string | null
          is_repeat_customer?: boolean | null
          job_address: string
          job_city?: string | null
          job_latitude?: number | null
          job_longitude?: number | null
          job_number: string
          job_state?: string | null
          job_zip?: string | null
          last_touch_campaign?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          lead_source?: string | null
          location_id?: string | null
          lockbox_code?: string | null
          name?: string | null
          opportunity_id?: string | null
          organization_id: string
          permit_numbers?: string[] | null
          primary_contact_id?: string | null
          property_id?: string | null
          proposal_id?: string | null
          referral_job_id?: string | null
          scheduled_end_date?: string | null
          scheduled_end_time?: string | null
          scheduled_start_date: string
          scheduled_start_time?: string | null
          site_contact_id?: string | null
          site_survey_id?: string | null
          special_instructions?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          access_notes?: string | null
          actual_affected_area_sqft?: number | null
          actual_cost?: number | null
          actual_duration_days?: number | null
          actual_end_at?: string | null
          actual_end_date?: string | null
          actual_labor_hours?: number | null
          actual_revenue?: number | null
          actual_start_at?: string | null
          actual_start_date?: string | null
          air_monitoring_required?: boolean | null
          attributed_lead_source?: string | null
          attributed_lead_source_detail?: string | null
          change_order_amount?: number | null
          clearance_testing_required?: boolean | null
          company_id?: string | null
          completion_id?: string | null
          completion_notes?: string | null
          completion_photos?: Json | null
          contact_onsite_name?: string | null
          contact_onsite_phone?: string | null
          containment_level?:
            | Database["public"]["Enums"]["containment_level"]
            | null
          contract_amount?: number | null
          converting_touch_campaign?: string | null
          converting_touch_medium?: string | null
          converting_touch_source?: string | null
          created_at?: string | null
          created_by?: string | null
          crew_lead_id?: string | null
          customer_id?: string
          customer_signed_off?: boolean | null
          customer_signoff_at?: string | null
          customer_signoff_name?: string | null
          deposit_amount?: number | null
          deposit_received_date?: string | null
          disposal_manifest_numbers?: string[] | null
          estimate_id?: string | null
          estimated_cost?: number | null
          estimated_duration_hours?: number | null
          estimated_labor_hours?: number | null
          estimated_revenue?: number | null
          final_amount?: number | null
          final_invoice_date?: string | null
          final_payment_date?: string | null
          first_touch_campaign?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          gate_code?: string | null
          gross_margin_pct?: number | null
          hazard_types?: string[] | null
          id?: string
          inspection_date?: string | null
          inspection_notes?: string | null
          inspection_passed?: boolean | null
          inspection_required?: boolean | null
          internal_notes?: string | null
          invoice_id?: string | null
          is_repeat_customer?: boolean | null
          job_address?: string
          job_city?: string | null
          job_latitude?: number | null
          job_longitude?: number | null
          job_number?: string
          job_state?: string | null
          job_zip?: string | null
          last_touch_campaign?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          lead_source?: string | null
          location_id?: string | null
          lockbox_code?: string | null
          name?: string | null
          opportunity_id?: string | null
          organization_id?: string
          permit_numbers?: string[] | null
          primary_contact_id?: string | null
          property_id?: string | null
          proposal_id?: string | null
          referral_job_id?: string | null
          scheduled_end_date?: string | null
          scheduled_end_time?: string | null
          scheduled_start_date?: string
          scheduled_start_time?: string | null
          site_contact_id?: string | null
          site_survey_id?: string | null
          special_instructions?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_completion_id_fkey"
            columns: ["completion_id"]
            isOneToOne: false
            referencedRelation: "job_completions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_crew_lead_id_fkey"
            columns: ["crew_lead_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "jobs_crew_lead_id_fkey"
            columns: ["crew_lead_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_referral_job_id_fkey"
            columns: ["referral_job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_referral_job_id_fkey"
            columns: ["referral_job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "jobs_site_contact_id_fkey"
            columns: ["site_contact_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_site_survey_id_fkey"
            columns: ["site_survey_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_reports: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string | null
          estimate_id: string | null
          file_name: string | null
          id: string
          invoice_id: string | null
          lab_id: string | null
          location_id: string | null
          mime_type: string | null
          notes: string | null
          ordered_date: string
          organization_id: string
          received_date: string | null
          report_number: string
          sample_description: string | null
          sample_type: Database["public"]["Enums"]["lab_sample_type"]
          site_address: string | null
          site_city: string | null
          site_state: string | null
          site_zip: string | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["lab_report_status"]
          storage_path: string | null
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          estimate_id?: string | null
          file_name?: string | null
          id?: string
          invoice_id?: string | null
          lab_id?: string | null
          location_id?: string | null
          mime_type?: string | null
          notes?: string | null
          ordered_date: string
          organization_id: string
          received_date?: string | null
          report_number: string
          sample_description?: string | null
          sample_type?: Database["public"]["Enums"]["lab_sample_type"]
          site_address?: string | null
          site_city?: string | null
          site_state?: string | null
          site_zip?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["lab_report_status"]
          storage_path?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          estimate_id?: string | null
          file_name?: string | null
          id?: string
          invoice_id?: string | null
          lab_id?: string | null
          location_id?: string | null
          mime_type?: string | null
          notes?: string | null
          ordered_date?: string
          organization_id?: string
          received_date?: string | null
          report_number?: string
          sample_description?: string | null
          sample_type?: Database["public"]["Enums"]["lab_sample_type"]
          site_address?: string | null
          site_city?: string | null
          site_state?: string | null
          site_zip?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["lab_report_status"]
          storage_path?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "lab_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_lab_id_fkey"
            columns: ["lab_id"]
            isOneToOne: false
            referencedRelation: "labs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_reports_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      labor_rates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          organization_id: string
          rate_per_day: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          organization_id: string
          rate_per_day: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          organization_id?: string
          rate_per_day?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labor_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      labs: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "labs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_webhook_endpoints: {
        Row: {
          api_key: string | null
          created_at: string | null
          field_mapping: Json | null
          id: string
          is_active: boolean | null
          last_lead_at: string | null
          leads_received: number | null
          name: string
          organization_id: string
          provider: string
          secret: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_lead_at?: string | null
          leads_received?: number | null
          name: string
          organization_id: string
          provider: string
          secret?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          field_mapping?: Json | null
          id?: string
          is_active?: boolean | null
          last_lead_at?: string | null
          leads_received?: number | null
          name?: string
          organization_id?: string
          provider?: string
          secret?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_webhook_endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_webhook_log: {
        Row: {
          created_at: string | null
          customer_id: string | null
          endpoint_id: string
          error_message: string | null
          headers: Json | null
          id: string
          ip_address: unknown
          opportunity_id: string | null
          organization_id: string
          raw_payload: Json
          status: string
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          endpoint_id: string
          error_message?: string | null
          headers?: Json | null
          id?: string
          ip_address?: unknown
          opportunity_id?: string | null
          organization_id: string
          raw_payload: Json
          status: string
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          endpoint_id?: string
          error_message?: string | null
          headers?: Json | null
          id?: string
          ip_address?: unknown
          opportunity_id?: string | null
          organization_id?: string
          raw_payload?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_webhook_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_webhook_log_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "lead_webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_webhook_log_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_webhook_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      location_users: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          can_manage: boolean | null
          id: string
          is_primary: boolean | null
          location_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_manage?: boolean | null
          id?: string
          is_primary?: boolean | null
          location_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          can_manage?: boolean | null
          id?: string
          is_primary?: boolean | null
          location_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_users_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "location_users_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_users_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "location_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          code: string | null
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_headquarters: boolean | null
          name: string
          organization_id: string
          phone: string | null
          state: string | null
          timezone: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_headquarters?: boolean | null
          name: string
          organization_id: string
          phone?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          code?: string | null
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_headquarters?: boolean | null
          name?: string
          organization_id?: string
          phone?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_sync_log: {
        Row: {
          completed_at: string | null
          duration_ms: number | null
          entity_id: string | null
          error_message: string | null
          external_id: string | null
          id: string
          integration_type: string
          organization_id: string
          started_at: string | null
          status: string
          sync_type: string
        }
        Insert: {
          completed_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          integration_type: string
          organization_id: string
          started_at?: string | null
          status: string
          sync_type: string
        }
        Update: {
          completed_at?: string | null
          duration_ms?: number | null
          entity_id?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          integration_type?: string
          organization_id?: string
          started_at?: string | null
          status?: string
          sync_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_sync_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      material_costs: {
        Row: {
          cost_per_unit: number
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          unit: string
          updated_at: string
        }
        Insert: {
          cost_per_unit: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          unit: string
          updated_at?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_costs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      materials_catalog: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          unit: string | null
          unit_cost: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          unit?: string | null
          unit_cost: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          unit?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_catalog_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email: boolean | null
          id: string
          in_app: boolean | null
          notification_type: string
          organization_id: string
          push: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email?: boolean | null
          id?: string
          in_app?: boolean | null
          notification_type: string
          organization_id: string
          push?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: boolean | null
          id?: string
          in_app?: boolean | null
          notification_type?: string
          organization_id?: string
          push?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          organization_id: string
          priority: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          organization_id: string
          priority?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          email_sent?: boolean | null
          email_sent_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          metadata?: Json | null
          organization_id?: string
          priority?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          actual_close_date: string | null
          assessment_date: string | null
          company_id: string | null
          competitor: string | null
          converting_touch_campaign: string | null
          converting_touch_medium: string | null
          converting_touch_source: string | null
          created_at: string | null
          created_from_assessment_id: string | null
          customer_id: string
          description: string | null
          estimate_id: string | null
          estimate_sent_date: string | null
          estimated_affected_area_sqft: number | null
          estimated_value: number | null
          expected_close_date: string | null
          first_touch_campaign: string | null
          first_touch_date: string | null
          first_touch_medium: string | null
          first_touch_source: string | null
          follow_up_date: string | null
          hazard_types: string[] | null
          id: string
          job_id: string | null
          last_touch_campaign: string | null
          last_touch_medium: string | null
          last_touch_source: string | null
          lead_source: string | null
          lead_source_detail: string | null
          location_id: string | null
          loss_notes: string | null
          loss_reason: string | null
          lost_to_competitor: string | null
          name: string
          opportunity_status:
            | Database["public"]["Enums"]["opportunity_status"]
            | null
          organization_id: string
          outcome: string | null
          owner_id: string | null
          primary_contact_id: string | null
          probability_pct: number | null
          property_age: number | null
          property_id: string | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          proposal_id: string | null
          regulatory_trigger:
            | Database["public"]["Enums"]["regulatory_trigger"]
            | null
          service_address_line1: string | null
          service_address_line2: string | null
          service_city: string | null
          service_state: string | null
          service_zip: string | null
          site_contact_id: string | null
          stage_id: string
          updated_at: string | null
          urgency: Database["public"]["Enums"]["urgency_level"] | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          weighted_value: number | null
        }
        Insert: {
          actual_close_date?: string | null
          assessment_date?: string | null
          company_id?: string | null
          competitor?: string | null
          converting_touch_campaign?: string | null
          converting_touch_medium?: string | null
          converting_touch_source?: string | null
          created_at?: string | null
          created_from_assessment_id?: string | null
          customer_id: string
          description?: string | null
          estimate_id?: string | null
          estimate_sent_date?: string | null
          estimated_affected_area_sqft?: number | null
          estimated_value?: number | null
          expected_close_date?: string | null
          first_touch_campaign?: string | null
          first_touch_date?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          follow_up_date?: string | null
          hazard_types?: string[] | null
          id?: string
          job_id?: string | null
          last_touch_campaign?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          location_id?: string | null
          loss_notes?: string | null
          loss_reason?: string | null
          lost_to_competitor?: string | null
          name: string
          opportunity_status?:
            | Database["public"]["Enums"]["opportunity_status"]
            | null
          organization_id: string
          outcome?: string | null
          owner_id?: string | null
          primary_contact_id?: string | null
          probability_pct?: number | null
          property_age?: number | null
          property_id?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          proposal_id?: string | null
          regulatory_trigger?:
            | Database["public"]["Enums"]["regulatory_trigger"]
            | null
          service_address_line1?: string | null
          service_address_line2?: string | null
          service_city?: string | null
          service_state?: string | null
          service_zip?: string | null
          site_contact_id?: string | null
          stage_id: string
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          weighted_value?: number | null
        }
        Update: {
          actual_close_date?: string | null
          assessment_date?: string | null
          company_id?: string | null
          competitor?: string | null
          converting_touch_campaign?: string | null
          converting_touch_medium?: string | null
          converting_touch_source?: string | null
          created_at?: string | null
          created_from_assessment_id?: string | null
          customer_id?: string
          description?: string | null
          estimate_id?: string | null
          estimate_sent_date?: string | null
          estimated_affected_area_sqft?: number | null
          estimated_value?: number | null
          expected_close_date?: string | null
          first_touch_campaign?: string | null
          first_touch_date?: string | null
          first_touch_medium?: string | null
          first_touch_source?: string | null
          follow_up_date?: string | null
          hazard_types?: string[] | null
          id?: string
          job_id?: string | null
          last_touch_campaign?: string | null
          last_touch_medium?: string | null
          last_touch_source?: string | null
          lead_source?: string | null
          lead_source_detail?: string | null
          location_id?: string | null
          loss_notes?: string | null
          loss_reason?: string | null
          lost_to_competitor?: string | null
          name?: string
          opportunity_status?:
            | Database["public"]["Enums"]["opportunity_status"]
            | null
          organization_id?: string
          outcome?: string | null
          owner_id?: string | null
          primary_contact_id?: string | null
          probability_pct?: number | null
          property_age?: number | null
          property_id?: string | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          proposal_id?: string | null
          regulatory_trigger?:
            | Database["public"]["Enums"]["regulatory_trigger"]
            | null
          service_address_line1?: string | null
          service_address_line2?: string | null
          service_city?: string | null
          service_state?: string | null
          service_zip?: string | null
          site_contact_id?: string | null
          stage_id?: string
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["urgency_level"] | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          weighted_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_created_from_assessment_id_fkey"
            columns: ["created_from_assessment_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "opportunities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_site_contact_id_fkey"
            columns: ["site_contact_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_history: {
        Row: {
          changed_by: string
          created_at: string | null
          from_stage_id: string | null
          id: string
          notes: string | null
          opportunity_id: string
          to_stage_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string | null
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          opportunity_id: string
          to_stage_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string | null
          from_stage_id?: string | null
          id?: string
          notes?: string | null
          opportunity_id?: string
          to_stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "opportunity_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_history_from_stage_id_fkey"
            columns: ["from_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_history_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_history_to_stage_id_fkey"
            columns: ["to_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_ai_settings: {
        Row: {
          ai_enabled: boolean | null
          allow_model_improvement: boolean | null
          anonymize_customer_data: boolean | null
          consent_granted_at: string | null
          consent_granted_by: string | null
          estimate_suggestions_enabled: boolean | null
          id: string
          organization_id: string
          photo_analysis_enabled: boolean | null
          retain_ai_data: boolean | null
          updated_at: string | null
          updated_by: string | null
          voice_transcription_enabled: boolean | null
        }
        Insert: {
          ai_enabled?: boolean | null
          allow_model_improvement?: boolean | null
          anonymize_customer_data?: boolean | null
          consent_granted_at?: string | null
          consent_granted_by?: string | null
          estimate_suggestions_enabled?: boolean | null
          id?: string
          organization_id: string
          photo_analysis_enabled?: boolean | null
          retain_ai_data?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          voice_transcription_enabled?: boolean | null
        }
        Update: {
          ai_enabled?: boolean | null
          allow_model_improvement?: boolean | null
          anonymize_customer_data?: boolean | null
          consent_granted_at?: string | null
          consent_granted_by?: string | null
          estimate_suggestions_enabled?: boolean | null
          id?: string
          organization_id?: string
          photo_analysis_enabled?: boolean | null
          retain_ai_data?: boolean | null
          updated_at?: string | null
          updated_by?: string | null
          voice_transcription_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_ai_settings_consent_granted_by_fkey"
            columns: ["consent_granted_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_ai_settings_consent_granted_by_fkey"
            columns: ["consent_granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_ai_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_ai_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_ai_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_document_shares: {
        Row: {
          company_id: string | null
          customer_id: string | null
          document_id: string
          email_send_id: string | null
          id: string
          link_expires_at: string
          message: string | null
          organization_id: string
          recipient_email: string
          recipient_name: string | null
          shared_at: string
          shared_by: string | null
        }
        Insert: {
          company_id?: string | null
          customer_id?: string | null
          document_id: string
          email_send_id?: string | null
          id?: string
          link_expires_at: string
          message?: string | null
          organization_id: string
          recipient_email: string
          recipient_name?: string | null
          shared_at?: string
          shared_by?: string | null
        }
        Update: {
          company_id?: string | null
          customer_id?: string | null
          document_id?: string
          email_send_id?: string | null
          id?: string
          link_expires_at?: string
          message?: string | null
          organization_id?: string
          recipient_email?: string
          recipient_name?: string | null
          shared_at?: string
          shared_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_document_shares_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_document_shares_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_document_shares_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "organization_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_document_shares_email_send_id_fkey"
            columns: ["email_send_id"]
            isOneToOne: false
            referencedRelation: "email_sends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_document_shares_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_document_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_document_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_documents: {
        Row: {
          category: string
          display_name: string
          document_number: string | null
          expires_on: string | null
          file_name: string
          id: string
          issued_on: string | null
          issuing_authority: string | null
          mime_type: string | null
          notes: string | null
          organization_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          display_name: string
          document_number?: string | null
          expires_on?: string | null
          file_name: string
          id?: string
          issued_on?: string | null
          issuing_authority?: string | null
          mime_type?: string | null
          notes?: string | null
          organization_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          display_name?: string
          document_number?: string | null
          expires_on?: string | null
          file_name?: string
          id?: string
          issued_on?: string | null
          issuing_authority?: string | null
          mime_type?: string | null
          notes?: string | null
          organization_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organization_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_integrations: {
        Row: {
          access_token: string | null
          created_at: string | null
          external_id: string | null
          id: string
          integration_type: string
          is_active: boolean | null
          last_error: string | null
          last_sync_at: string | null
          organization_id: string
          refresh_token: string | null
          settings: Json | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          integration_type: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          organization_id: string
          refresh_token?: string | null
          settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          external_id?: string | null
          id?: string
          integration_type?: string
          is_active?: boolean | null
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string
          refresh_token?: string | null
          settings?: Json | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_sms_settings: {
        Row: {
          appointment_reminder_hours: number | null
          appointment_reminders_enabled: boolean | null
          created_at: string | null
          id: string
          job_status_updates_enabled: boolean | null
          lead_notifications_enabled: boolean | null
          organization_id: string
          payment_reminders_enabled: boolean | null
          quiet_hours_enabled: boolean | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          sms_brand_prefix: string | null
          sms_enabled: boolean | null
          timezone: string | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_phone_number: string | null
          updated_at: string | null
          use_platform_twilio: boolean | null
        }
        Insert: {
          appointment_reminder_hours?: number | null
          appointment_reminders_enabled?: boolean | null
          created_at?: string | null
          id?: string
          job_status_updates_enabled?: boolean | null
          lead_notifications_enabled?: boolean | null
          organization_id: string
          payment_reminders_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_brand_prefix?: string | null
          sms_enabled?: boolean | null
          timezone?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          use_platform_twilio?: boolean | null
        }
        Update: {
          appointment_reminder_hours?: number | null
          appointment_reminders_enabled?: boolean | null
          created_at?: string | null
          id?: string
          job_status_updates_enabled?: boolean | null
          lead_notifications_enabled?: boolean | null
          organization_id?: string
          payment_reminders_enabled?: boolean | null
          quiet_hours_enabled?: boolean | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          sms_brand_prefix?: string | null
          sms_enabled?: boolean | null
          timezone?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_phone_number?: string | null
          updated_at?: string | null
          use_platform_twilio?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_sms_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          billing_cycle: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          cancellation_reason: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          jobs_this_month: number | null
          organization_id: string
          plan_id: string
          status: string
          storage_used_mb: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
          users_count: number | null
        }
        Insert: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          jobs_this_month?: number | null
          organization_id: string
          plan_id: string
          status?: string
          storage_used_mb?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          users_count?: number | null
        }
        Update: {
          billing_cycle?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          jobs_this_month?: number | null
          organization_id?: string
          plan_id?: string
          status?: string
          storage_used_mb?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
          users_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          ai_consent_date: string | null
          ai_consent_user_id: string | null
          ai_features_enabled: boolean | null
          billing_address: Json | null
          billing_email: string | null
          billing_managed_externally: boolean
          city: string | null
          created_at: string | null
          email: string | null
          email_accent_color: string | null
          email_domain: string | null
          email_domain_provider_id: string | null
          email_domain_records: Json | null
          email_domain_status: string | null
          email_domain_verified_at: string | null
          email_from_name: string | null
          email_header_color: string | null
          email_logo_url: string | null
          email_reply_to: string | null
          email_signature: string | null
          features: Json | null
          id: string
          is_platform_admin: boolean | null
          license_number: string | null
          max_assessments_per_month: number | null
          max_users: number | null
          name: string
          opp_defaults: Json
          phone: string | null
          photo_retention_days: number
          state: string | null
          status: string | null
          stripe_customer_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          timezone: string
          trial_ends_at: string | null
          updated_at: string | null
          website: string | null
          white_label_config: Json | null
          white_label_enabled: boolean | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          ai_consent_date?: string | null
          ai_consent_user_id?: string | null
          ai_features_enabled?: boolean | null
          billing_address?: Json | null
          billing_email?: string | null
          billing_managed_externally?: boolean
          city?: string | null
          created_at?: string | null
          email?: string | null
          email_accent_color?: string | null
          email_domain?: string | null
          email_domain_provider_id?: string | null
          email_domain_records?: Json | null
          email_domain_status?: string | null
          email_domain_verified_at?: string | null
          email_from_name?: string | null
          email_header_color?: string | null
          email_logo_url?: string | null
          email_reply_to?: string | null
          email_signature?: string | null
          features?: Json | null
          id?: string
          is_platform_admin?: boolean | null
          license_number?: string | null
          max_assessments_per_month?: number | null
          max_users?: number | null
          name: string
          opp_defaults?: Json
          phone?: string | null
          photo_retention_days?: number
          state?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          website?: string | null
          white_label_config?: Json | null
          white_label_enabled?: boolean | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          ai_consent_date?: string | null
          ai_consent_user_id?: string | null
          ai_features_enabled?: boolean | null
          billing_address?: Json | null
          billing_email?: string | null
          billing_managed_externally?: boolean
          city?: string | null
          created_at?: string | null
          email?: string | null
          email_accent_color?: string | null
          email_domain?: string | null
          email_domain_provider_id?: string | null
          email_domain_records?: Json | null
          email_domain_status?: string | null
          email_domain_verified_at?: string | null
          email_from_name?: string | null
          email_header_color?: string | null
          email_logo_url?: string | null
          email_reply_to?: string | null
          email_signature?: string | null
          features?: Json | null
          id?: string
          is_platform_admin?: boolean | null
          license_number?: string | null
          max_assessments_per_month?: number | null
          max_users?: number | null
          name?: string
          opp_defaults?: Json
          phone?: string | null
          photo_retention_days?: number
          state?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          timezone?: string
          trial_ends_at?: string | null
          updated_at?: string | null
          website?: string | null
          white_label_config?: Json | null
          white_label_enabled?: boolean | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_ai_consent_user_id_fkey"
            columns: ["ai_consent_user_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "organizations_ai_consent_user_id_fkey"
            columns: ["ai_consent_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          organization_id: string
          stripe_payment_method_id: string | null
        }
        Insert: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          organization_id: string
          stripe_payment_method_id?: string | null
        }
        Update: {
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          organization_id?: string
          stripe_payment_method_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string
          payment_date: string
          payment_method: string | null
          qb_payment_id: string | null
          qb_synced_at: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id: string
          payment_date?: string
          payment_method?: string | null
          qb_payment_id?: string | null
          qb_synced_at?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string
          payment_method?: string | null
          qb_payment_id?: string | null
          qb_synced_at?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_analyses: {
        Row: {
          created_at: string | null
          detected_hazards: Json
          id: string
          image_hash: string | null
          image_url: string | null
          job_photo_id: string | null
          known_hazards: string[] | null
          model_version: string | null
          organization_id: string
          overall_risk_level: string | null
          processing_time_ms: number | null
          property_type: string | null
          raw_analysis: string | null
          recommendations: Json | null
        }
        Insert: {
          created_at?: string | null
          detected_hazards?: Json
          id?: string
          image_hash?: string | null
          image_url?: string | null
          job_photo_id?: string | null
          known_hazards?: string[] | null
          model_version?: string | null
          organization_id: string
          overall_risk_level?: string | null
          processing_time_ms?: number | null
          property_type?: string | null
          raw_analysis?: string | null
          recommendations?: Json | null
        }
        Update: {
          created_at?: string | null
          detected_hazards?: Json
          id?: string
          image_hash?: string | null
          image_url?: string | null
          job_photo_id?: string | null
          known_hazards?: string[] | null
          model_version?: string | null
          organization_id?: string
          overall_risk_level?: string | null
          processing_time_ms?: number | null
          property_type?: string | null
          raw_analysis?: string | null
          recommendations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_analyses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          assessment_id: string
          caption: string | null
          created_at: string | null
          file_size: number | null
          file_type: string | null
          gps_coordinates: unknown
          id: string
          thumbnail_url: string | null
          url: string
        }
        Insert: {
          assessment_id: string
          caption?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          gps_coordinates?: unknown
          id?: string
          thumbnail_url?: string | null
          url: string
        }
        Update: {
          assessment_id?: string
          caption?: string | null
          created_at?: string | null
          file_size?: number | null
          file_type?: string | null
          gps_coordinates?: unknown
          id?: string
          thumbnail_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          probability: number | null
          sort_order: number
          stage_type: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          probability?: number | null
          sort_order: number
          stage_type: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          probability?: number | null
          sort_order?: number
          stage_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_settings: {
        Row: {
          created_at: string
          default_markup_percent: number | null
          id: string
          maximum_markup_percent: number | null
          minimum_markup_percent: number | null
          office_address_line1: string | null
          office_address_line2: string | null
          office_city: string | null
          office_lat: number | null
          office_lng: number | null
          office_state: string | null
          office_zip: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_markup_percent?: number | null
          id?: string
          maximum_markup_percent?: number | null
          minimum_markup_percent?: number | null
          office_address_line1?: string | null
          office_address_line2?: string | null
          office_city?: string | null
          office_lat?: number | null
          office_lng?: number | null
          office_state?: string | null
          office_zip?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_markup_percent?: number | null
          id?: string
          maximum_markup_percent?: number | null
          minimum_markup_percent?: number | null
          office_address_line1?: string | null
          office_address_line2?: string | null
          office_city?: string | null
          office_lat?: number | null
          office_lng?: number | null
          office_state?: string | null
          office_zip?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          calendar_feed_token: string
          created_at: string | null
          default_location_id: string | null
          email: string
          first_name: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          is_platform_user: boolean | null
          last_login_at: string | null
          last_name: string | null
          login_count: number | null
          organization_id: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          calendar_feed_token?: string
          created_at?: string | null
          default_location_id?: string | null
          email: string
          first_name?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_platform_user?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          login_count?: number | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          calendar_feed_token?: string
          created_at?: string | null
          default_location_id?: string | null
          email?: string
          first_name?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_platform_user?: boolean | null
          last_login_at?: string | null
          last_name?: string | null
          login_count?: number | null
          organization_id?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string | null
          created_at: string
          created_by: string | null
          id: string
          latitude: number | null
          longitude: number | null
          normalized_address: string | null
          notes: string | null
          organization_id: string
          property_type: Database["public"]["Enums"]["property_type"] | null
          state: string | null
          updated_at: string
          zip: string | null
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          normalized_address?: string | null
          notes?: string | null
          organization_id: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          normalized_address?: string | null
          notes?: string | null
          organization_id?: string
          property_type?: Database["public"]["Enums"]["property_type"] | null
          state?: string | null
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_contacts: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          moved_in_date: string | null
          moved_out_date: string | null
          notes: string | null
          organization_id: string
          property_id: string
          role: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          moved_in_date?: string | null
          moved_out_date?: string | null
          notes?: string | null
          organization_id: string
          property_id: string
          role: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          moved_in_date?: string | null
          moved_out_date?: string | null
          notes?: string | null
          organization_id?: string
          property_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_contacts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "property_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_contacts_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      proposals: {
        Row: {
          access_token: string | null
          access_token_expires_at: string | null
          approval_method: string | null
          approved_by_user_id: string | null
          cover_letter: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string | null
          estimate_id: string
          exclusions: string[] | null
          id: string
          inclusions: string[] | null
          organization_id: string
          payment_terms: string | null
          pdf_generated_at: string | null
          pdf_path: string | null
          proposal_number: string
          sent_at: string | null
          sent_to_email: string | null
          signature_data: string | null
          signed_at: string | null
          signer_email: string | null
          signer_ip: string | null
          signer_name: string | null
          status: Database["public"]["Enums"]["proposal_status"] | null
          terms_and_conditions: string | null
          updated_at: string | null
          valid_until: string | null
          verbal_approval_note: string | null
          viewed_at: string | null
          viewed_count: number | null
        }
        Insert: {
          access_token?: string | null
          access_token_expires_at?: string | null
          approval_method?: string | null
          approved_by_user_id?: string | null
          cover_letter?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          estimate_id: string
          exclusions?: string[] | null
          id?: string
          inclusions?: string[] | null
          organization_id: string
          payment_terms?: string | null
          pdf_generated_at?: string | null
          pdf_path?: string | null
          proposal_number: string
          sent_at?: string | null
          sent_to_email?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          valid_until?: string | null
          verbal_approval_note?: string | null
          viewed_at?: string | null
          viewed_count?: number | null
        }
        Update: {
          access_token?: string | null
          access_token_expires_at?: string | null
          approval_method?: string | null
          approved_by_user_id?: string | null
          cover_letter?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string | null
          estimate_id?: string
          exclusions?: string[] | null
          id?: string
          inclusions?: string[] | null
          organization_id?: string
          payment_terms?: string | null
          pdf_generated_at?: string | null
          pdf_path?: string | null
          proposal_number?: string
          sent_at?: string | null
          sent_to_email?: string | null
          signature_data?: string | null
          signed_at?: string | null
          signer_email?: string | null
          signer_ip?: string | null
          signer_name?: string | null
          status?: Database["public"]["Enums"]["proposal_status"] | null
          terms_and_conditions?: string | null
          updated_at?: string | null
          valid_until?: string | null
          verbal_approval_note?: string | null
          viewed_at?: string | null
          viewed_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposals_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "proposals_approved_by_user_id_fkey"
            columns: ["approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "proposals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          device_name: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          last_used_at: string | null
          organization_id: string
          p256dh_key: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          device_name?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          organization_id: string
          p256dh_key: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          device_name?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          last_used_at?: string | null
          organization_id?: string
          p256dh_key?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      report_exports: {
        Row: {
          created_at: string | null
          export_format: string
          exported_by: string
          file_path: string | null
          file_size: number | null
          id: string
          organization_id: string
          parameters: Json | null
          report_id: string | null
          report_name: string
        }
        Insert: {
          created_at?: string | null
          export_format: string
          exported_by: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          organization_id: string
          parameters?: Json | null
          report_id?: string | null
          report_name: string
        }
        Update: {
          created_at?: string | null
          export_format?: string
          exported_by?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          organization_id?: string
          parameters?: Json | null
          report_id?: string | null
          report_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "report_exports_exported_by_fkey"
            columns: ["exported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "saved_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          click_token: string | null
          clicked_at: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string
          feedback_survey_id: string | null
          id: string
          organization_id: string
          platform: string
          platform_url: string | null
          sent_at: string | null
          sent_to_email: string | null
          status: string
        }
        Insert: {
          click_token?: string | null
          clicked_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id: string
          feedback_survey_id?: string | null
          id?: string
          organization_id: string
          platform: string
          platform_url?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          status?: string
        }
        Update: {
          click_token?: string | null
          clicked_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string
          feedback_survey_id?: string | null
          id?: string
          organization_id?: string
          platform?: string
          platform_url?: string | null
          sent_at?: string | null
          sent_to_email?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_feedback_survey_id_fkey"
            columns: ["feedback_survey_id"]
            isOneToOne: false
            referencedRelation: "feedback_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_reports: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_shared: boolean | null
          last_sent_at: string | null
          name: string
          organization_id: string
          report_type: string
          schedule_enabled: boolean | null
          schedule_frequency: string | null
          schedule_recipients: string[] | null
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_shared?: boolean | null
          last_sent_at?: string | null
          name: string
          organization_id: string
          report_type: string
          schedule_enabled?: boolean | null
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_shared?: boolean | null
          last_sent_at?: string | null
          name?: string
          organization_id?: string
          report_type?: string
          schedule_enabled?: boolean | null
          schedule_frequency?: string | null
          schedule_recipients?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "saved_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reminders: {
        Row: {
          channel: string
          created_at: string | null
          error: string | null
          id: string
          organization_id: string
          recipient_email: string | null
          recipient_phone: string | null
          recipient_type: string
          related_id: string
          related_type: string
          reminder_type: string
          scheduled_for: string
          sent_at: string | null
          status: string
          template_slug: string | null
          template_variables: Json | null
        }
        Insert: {
          channel?: string
          created_at?: string | null
          error?: string | null
          id?: string
          organization_id: string
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_type: string
          related_id: string
          related_type: string
          reminder_type: string
          scheduled_for: string
          sent_at?: string | null
          status?: string
          template_slug?: string | null
          template_variables?: Json | null
        }
        Update: {
          channel?: string
          created_at?: string | null
          error?: string | null
          id?: string
          organization_id?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          recipient_type?: string
          related_id?: string
          related_type?: string
          reminder_type?: string
          scheduled_for?: string
          sent_at?: string | null
          status?: string
          template_slug?: string | null
          template_variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_members: {
        Row: {
          added_at: string | null
          added_by: string | null
          customer_id: string
          id: string
          segment_id: string
        }
        Insert: {
          added_at?: string | null
          added_by?: string | null
          customer_id: string
          id?: string
          segment_id: string
        }
        Update: {
          added_at?: string | null
          added_by?: string | null
          customer_id?: string
          id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "segment_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_members_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_members_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      site_survey_photos: {
        Row: {
          area_id: string | null
          caption: string | null
          category: string | null
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          location: string | null
          site_survey_id: string
          updated_at: string | null
          url: string
        }
        Insert: {
          area_id?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          location?: string | null
          site_survey_id: string
          updated_at?: string | null
          url: string
        }
        Update: {
          area_id?: string | null
          caption?: string | null
          category?: string | null
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          location?: string | null
          site_survey_id?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_survey_photos_site_survey_id_fkey"
            columns: ["site_survey_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      site_surveys: {
        Row: {
          access_info: Json | null
          access_issues: string[] | null
          appointment_status:
            | Database["public"]["Enums"]["appointment_status"]
            | null
          area_sqft: number | null
          assigned_to: string | null
          building_sqft: number | null
          building_type: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          clearance_lab: string | null
          clearance_required: boolean | null
          construction_type: string | null
          containment_level: number | null
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          environment_info: Json | null
          estimator_id: string | null
          hazard_assessments: Json | null
          hazard_subtype: string | null
          hazard_type: Database["public"]["Enums"]["hazard_type"]
          id: string
          job_name: string
          linear_ft: number | null
          location_id: string | null
          material_type: string | null
          notes: string | null
          occupancy_status: string | null
          occupied: boolean | null
          organization_id: string
          owner_email: string | null
          owner_name: string | null
          owner_phone: string | null
          parent_survey_id: string | null
          photo_metadata: Json | null
          property_id: string | null
          regulatory_notifications_needed: boolean | null
          revision_notes: string | null
          scheduled_date: string | null
          scheduled_time_end: string | null
          scheduled_time_start: string | null
          site_address: string
          site_city: string
          site_location: unknown
          site_state: string
          site_zip: string
          special_conditions: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["site_survey_status"] | null
          stories: number | null
          submitted_at: string | null
          survey_root_id: string
          technician_notes: string | null
          updated_at: string | null
          version: number
          volume_cuft: number | null
          year_built: number | null
        }
        Insert: {
          access_info?: Json | null
          access_issues?: string[] | null
          appointment_status?:
            | Database["public"]["Enums"]["appointment_status"]
            | null
          area_sqft?: number | null
          assigned_to?: string | null
          building_sqft?: number | null
          building_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          clearance_lab?: string | null
          clearance_required?: boolean | null
          construction_type?: string | null
          containment_level?: number | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          environment_info?: Json | null
          estimator_id?: string | null
          hazard_assessments?: Json | null
          hazard_subtype?: string | null
          hazard_type: Database["public"]["Enums"]["hazard_type"]
          id?: string
          job_name: string
          linear_ft?: number | null
          location_id?: string | null
          material_type?: string | null
          notes?: string | null
          occupancy_status?: string | null
          occupied?: boolean | null
          organization_id: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          parent_survey_id?: string | null
          photo_metadata?: Json | null
          property_id?: string | null
          regulatory_notifications_needed?: boolean | null
          revision_notes?: string | null
          scheduled_date?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          site_address: string
          site_city: string
          site_location?: unknown
          site_state: string
          site_zip: string
          special_conditions?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["site_survey_status"] | null
          stories?: number | null
          submitted_at?: string | null
          survey_root_id: string
          technician_notes?: string | null
          updated_at?: string | null
          version?: number
          volume_cuft?: number | null
          year_built?: number | null
        }
        Update: {
          access_info?: Json | null
          access_issues?: string[] | null
          appointment_status?:
            | Database["public"]["Enums"]["appointment_status"]
            | null
          area_sqft?: number | null
          assigned_to?: string | null
          building_sqft?: number | null
          building_type?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          clearance_lab?: string | null
          clearance_required?: boolean | null
          construction_type?: string | null
          containment_level?: number | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          environment_info?: Json | null
          estimator_id?: string | null
          hazard_assessments?: Json | null
          hazard_subtype?: string | null
          hazard_type?: Database["public"]["Enums"]["hazard_type"]
          id?: string
          job_name?: string
          linear_ft?: number | null
          location_id?: string | null
          material_type?: string | null
          notes?: string | null
          occupancy_status?: string | null
          occupied?: boolean | null
          organization_id?: string
          owner_email?: string | null
          owner_name?: string | null
          owner_phone?: string | null
          parent_survey_id?: string | null
          photo_metadata?: Json | null
          property_id?: string | null
          regulatory_notifications_needed?: boolean | null
          revision_notes?: string | null
          scheduled_date?: string | null
          scheduled_time_end?: string | null
          scheduled_time_start?: string | null
          site_address?: string
          site_city?: string
          site_location?: unknown
          site_state?: string
          site_zip?: string
          special_conditions?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["site_survey_status"] | null
          stories?: number | null
          submitted_at?: string | null
          survey_root_id?: string
          technician_notes?: string | null
          updated_at?: string | null
          version?: number
          volume_cuft?: number | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_estimator_id_fkey"
            columns: ["estimator_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "assessments_estimator_id_fkey"
            columns: ["estimator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_surveys_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "site_surveys_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_surveys_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "site_surveys_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_surveys_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_surveys_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_surveys_parent_survey_id_fkey"
            columns: ["parent_survey_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_surveys_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_surveys_survey_root_id_fkey"
            columns: ["survey_root_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_messages: {
        Row: {
          body: string
          cost: number | null
          customer_id: string | null
          delivered_at: string | null
          direction: string
          error_code: string | null
          error_message: string | null
          failed_at: string | null
          from_phone: string | null
          id: string
          message_type: Database["public"]["Enums"]["sms_message_type"]
          organization_id: string
          queued_at: string | null
          received_at: string | null
          related_entity_id: string | null
          related_entity_type: string | null
          segments: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["sms_status"] | null
          to_phone: string
          twilio_message_sid: string | null
        }
        Insert: {
          body: string
          cost?: number | null
          customer_id?: string | null
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_phone?: string | null
          id?: string
          message_type: Database["public"]["Enums"]["sms_message_type"]
          organization_id: string
          queued_at?: string | null
          received_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          segments?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["sms_status"] | null
          to_phone: string
          twilio_message_sid?: string | null
        }
        Update: {
          body?: string
          cost?: number | null
          customer_id?: string | null
          delivered_at?: string | null
          direction?: string
          error_code?: string | null
          error_message?: string | null
          failed_at?: string | null
          from_phone?: string | null
          id?: string
          message_type?: Database["public"]["Enums"]["sms_message_type"]
          organization_id?: string
          queued_at?: string | null
          received_at?: string | null
          related_entity_id?: string | null
          related_entity_type?: string | null
          segments?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["sms_status"] | null
          to_phone?: string
          twilio_message_sid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_messages_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sms_templates: {
        Row: {
          body: string
          created_at: string | null
          id: string
          is_active: boolean | null
          is_system: boolean | null
          message_type: Database["public"]["Enums"]["sms_message_type"]
          name: string
          organization_id: string | null
          updated_at: string | null
        }
        Insert: {
          body: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          message_type: Database["public"]["Enums"]["sms_message_type"]
          name: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_system?: boolean | null
          message_type?: Database["public"]["Enums"]["sms_message_type"]
          name?: string
          organization_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          event_type: string
          id: string
          payload: Json | null
          processed_at: string | null
          stripe_event_id: string
        }
        Insert: {
          event_type: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          stripe_event_id: string
        }
        Update: {
          event_type?: string
          id?: string
          payload?: Json | null
          processed_at?: string | null
          stripe_event_id?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          display_order: number | null
          feature_flags: Json | null
          features: Json | null
          id: string
          is_active: boolean | null
          is_public: boolean | null
          max_jobs_per_month: number | null
          max_storage_gb: number | null
          max_users: number | null
          name: string
          price_monthly: number
          price_yearly: number | null
          slug: string
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          stripe_product_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          feature_flags?: Json | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_jobs_per_month?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          name: string
          price_monthly: number
          price_yearly?: number | null
          slug: string
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          feature_flags?: Json | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          is_public?: boolean | null
          max_jobs_per_month?: number | null
          max_storage_gb?: number | null
          max_users?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          slug?: string
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          stripe_product_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      survey_photos: {
        Row: {
          area_id: string | null
          caption: string | null
          captured_at: string | null
          captured_at_source: string | null
          captured_lat: number | null
          captured_lng: number | null
          category: string
          company_id: string | null
          created_at: string
          customer_id: string | null
          device_make: string | null
          device_model: string | null
          exif_raw: Json | null
          expires_at: string
          file_hash: string | null
          file_size: number | null
          id: string
          job_id: string | null
          legacy_id: string | null
          location: string | null
          media_type: string
          mime_type: string | null
          organization_id: string
          original_r2_key: string | null
          original_supabase_path: string | null
          site_survey_id: string
          stamp_error: string | null
          stamp_status: string | null
          stamped_r2_key: string | null
          stamped_supabase_path: string | null
          tier: string
          tier_changed_at: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          caption?: string | null
          captured_at?: string | null
          captured_at_source?: string | null
          captured_lat?: number | null
          captured_lng?: number | null
          category?: string
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          device_make?: string | null
          device_model?: string | null
          exif_raw?: Json | null
          expires_at: string
          file_hash?: string | null
          file_size?: number | null
          id?: string
          job_id?: string | null
          legacy_id?: string | null
          location?: string | null
          media_type: string
          mime_type?: string | null
          organization_id: string
          original_r2_key?: string | null
          original_supabase_path?: string | null
          site_survey_id: string
          stamp_error?: string | null
          stamp_status?: string | null
          stamped_r2_key?: string | null
          stamped_supabase_path?: string | null
          tier?: string
          tier_changed_at?: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          caption?: string | null
          captured_at?: string | null
          captured_at_source?: string | null
          captured_lat?: number | null
          captured_lng?: number | null
          category?: string
          company_id?: string | null
          created_at?: string
          customer_id?: string | null
          device_make?: string | null
          device_model?: string | null
          exif_raw?: Json | null
          expires_at?: string
          file_hash?: string | null
          file_size?: number | null
          id?: string
          job_id?: string | null
          legacy_id?: string | null
          location?: string | null
          media_type?: string
          mime_type?: string | null
          organization_id?: string
          original_r2_key?: string | null
          original_supabase_path?: string | null
          site_survey_id?: string
          stamp_error?: string | null
          stamp_status?: string | null
          stamped_r2_key?: string | null
          stamped_supabase_path?: string | null
          tier?: string
          tier_changed_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_photos_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "survey_photos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_photos_site_survey_id_fkey"
            columns: ["site_survey_id"]
            isOneToOne: false
            referencedRelation: "site_surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["user_role"]
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "tenant_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_usage: {
        Row: {
          active_users: number | null
          api_calls: number | null
          assessments_created: number | null
          created_at: string | null
          id: string
          month_year: string
          organization_id: string
          photos_uploaded: number | null
          storage_used_mb: number | null
          updated_at: string | null
        }
        Insert: {
          active_users?: number | null
          api_calls?: number | null
          assessments_created?: number | null
          created_at?: string | null
          id?: string
          month_year: string
          organization_id: string
          photos_uploaded?: number | null
          storage_used_mb?: number | null
          updated_at?: string | null
        }
        Update: {
          active_users?: number | null
          api_calls?: number | null
          assessments_created?: number | null
          created_at?: string | null
          id?: string
          month_year?: string
          organization_id?: string
          photos_uploaded?: number | null
          storage_used_mb?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      travel_rates: {
        Row: {
          created_at: string
          flat_fee: number | null
          id: string
          max_miles: number | null
          min_miles: number
          organization_id: string
          per_mile_rate: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          flat_fee?: number | null
          id?: string
          max_miles?: number | null
          min_miles: number
          organization_id: string
          per_mile_rate?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          flat_fee?: number | null
          id?: string
          max_miles?: number | null
          min_miles?: number
          organization_id?: string
          per_mile_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "travel_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_transcriptions: {
        Row: {
          audio_duration_seconds: number | null
          audio_format: string | null
          audio_url: string | null
          context_id: string | null
          context_type: string | null
          created_at: string | null
          error_message: string | null
          extracted_data: Json | null
          id: string
          organization_id: string
          processed_text: string | null
          processing_model: string | null
          processing_time_ms: number | null
          raw_transcription: string
          status: string | null
          transcription_model: string | null
          user_id: string | null
        }
        Insert: {
          audio_duration_seconds?: number | null
          audio_format?: string | null
          audio_url?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          organization_id: string
          processed_text?: string | null
          processing_model?: string | null
          processing_time_ms?: number | null
          raw_transcription: string
          status?: string | null
          transcription_model?: string | null
          user_id?: string | null
        }
        Update: {
          audio_duration_seconds?: number | null
          audio_format?: string | null
          audio_url?: string | null
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          error_message?: string | null
          extracted_data?: Json | null
          id?: string
          organization_id?: string
          processed_text?: string | null
          processing_model?: string | null
          processing_time_ms?: number | null
          raw_transcription?: string
          status?: string | null
          transcription_model?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_transcriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_transcriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "voice_transcriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          event_type: string
          id: string
          next_retry_at: string | null
          organization_id: string
          payload: Json
          response_body: string | null
          status: string
          status_code: number | null
          webhook_id: string
        }
        Insert: {
          attempt_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          next_retry_at?: string | null
          organization_id: string
          payload: Json
          response_body?: string | null
          status?: string
          status_code?: number | null
          webhook_id: string
        }
        Update: {
          attempt_count?: number | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          next_retry_at?: string | null
          organization_id?: string
          payload?: Json
          response_body?: string | null
          status?: string
          status_code?: number | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          events: string[]
          failure_count: number | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          organization_id: string
          secret: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          events?: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          organization_id: string
          secret?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          organization_id?: string
          secret?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_documents: {
        Row: {
          category: string
          file_name: string
          id: string
          mime_type: string | null
          notes: string | null
          organization_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_at: string
          uploaded_by: string | null
          work_order_id: string
        }
        Insert: {
          category?: string
          file_name: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          organization_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          work_order_id: string
        }
        Update: {
          category?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          organization_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_at?: string
          uploaded_by?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "work_order_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_documents_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_vehicles: {
        Row: {
          created_at: string
          driver_name: string | null
          driver_profile_id: string | null
          id: string
          is_rental: boolean | null
          make_model: string | null
          notes: string | null
          plate: string | null
          rental_end_date: string | null
          rental_rate_daily: number | null
          rental_start_date: string | null
          rental_vendor: string | null
          sort_order: number | null
          vehicle_type: string | null
          work_order_id: string
        }
        Insert: {
          created_at?: string
          driver_name?: string | null
          driver_profile_id?: string | null
          id?: string
          is_rental?: boolean | null
          make_model?: string | null
          notes?: string | null
          plate?: string | null
          rental_end_date?: string | null
          rental_rate_daily?: number | null
          rental_start_date?: string | null
          rental_vendor?: string | null
          sort_order?: number | null
          vehicle_type?: string | null
          work_order_id: string
        }
        Update: {
          created_at?: string
          driver_name?: string | null
          driver_profile_id?: string | null
          id?: string
          is_rental?: boolean | null
          make_model?: string | null
          notes?: string | null
          plate?: string | null
          rental_end_date?: string | null
          rental_rate_daily?: number | null
          rental_start_date?: string | null
          rental_vendor?: string | null
          sort_order?: number | null
          vehicle_type?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manifest_vehicles_driver_profile_id_fkey"
            columns: ["driver_profile_id"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "manifest_vehicles_driver_profile_id_fkey"
            columns: ["driver_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifest_vehicles_manifest_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          issued_at: string | null
          issued_by: string | null
          job_id: string
          notes: string | null
          organization_id: string
          snapshot: Json
          status: string
          updated_at: string
          work_order_number: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          job_id: string
          notes?: string | null
          organization_id: string
          snapshot?: Json
          status?: string
          updated_at?: string
          work_order_number: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          job_id?: string
          notes?: string | null
          organization_id?: string
          snapshot?: Json
          status?: string
          updated_at?: string
          work_order_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "manifests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "manifests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "mv_sales_performance"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "manifests_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manifests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "mv_job_costs"
            referencedColumns: ["job_id"]
          },
          {
            foreignKeyName: "manifests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      mv_job_costs: {
        Row: {
          actual_labor: number | null
          actual_materials: number | null
          actual_total: number | null
          collected: number | null
          customer_name: string | null
          estimated_total: number | null
          hazard_types: string[] | null
          invoiced: number | null
          job_id: string | null
          job_number: string | null
          month: string | null
          organization_id: string | null
          title: string | null
          variance: number | null
          variance_pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_lead_source_roi: {
        Row: {
          avg_revenue_per_conversion: number | null
          conversion_rate: number | null
          converted: number | null
          leads: number | null
          month: string | null
          organization_id: string | null
          source: string | null
          total_revenue: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mv_sales_performance: {
        Row: {
          avg_deal_size: number | null
          full_name: string | null
          month: string | null
          organization_id: string | null
          proposals_lost: number | null
          proposals_sent: number | null
          proposals_won: number | null
          revenue_won: number | null
          total_proposals: number | null
          total_value: number | null
          user_id: string | null
          win_rate: number | null
          won_value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      _debug_list_profiles_policies: {
        Args: never
        Returns: {
          check_expr: string
          command: string
          policy_name: string
          using_expr: string
        }[]
      }
      allow_first_org_creation: { Args: never; Returns: boolean }
      calculate_completion_variance: {
        Args: { p_completion_id: string }
        Returns: undefined
      }
      calculate_completion_variance_by_job: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      calculate_survey_average_rating: {
        Args: { survey_id: string }
        Returns: number
      }
      can_create_organization: { Args: never; Returns: boolean }
      check_ai_enabled: {
        Args: { p_organization_id: string }
        Returns: boolean
      }
      check_ai_feature_enabled: {
        Args: { p_feature: string; p_organization_id: string }
        Returns: boolean
      }
      check_and_increment_rate_limit: {
        Args: { p_key_id: string }
        Returns: Record<string, unknown>
      }
      check_tenant_limits: {
        Args: { limit_type: string; org_id: string }
        Returns: boolean
      }
      cleanup_expired_notifications: { Args: never; Returns: number }
      create_invoice_from_job: {
        Args: {
          p_created_by: string
          p_discount_amount: number
          p_due_date: string
          p_job_id: string
          p_line_items: Json
          p_payment_terms: string
        }
        Returns: string
      }
      create_job_from_proposal: {
        Args: {
          p_created_by: string
          p_job: Json
          p_proposal_id: string
        }
        Returns: string
      }
      create_notification_for_role: {
        Args: {
          p_action_url?: string
          p_entity_id?: string
          p_entity_type?: string
          p_message?: string
          p_organization_id: string
          p_priority?: string
          p_role: string
          p_title: string
          p_type: string
        }
        Returns: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          email_sent: boolean | null
          email_sent_at: string | null
          entity_id: string | null
          entity_type: string | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string | null
          metadata: Json | null
          organization_id: string
          priority: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "notifications"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cron_has_recent_problem: {
        Args: { cron_name_in: string; sla_minutes: number }
        Returns: boolean
      }
      generate_estimate_number: { Args: { org_id: string }; Returns: string }
      generate_feedback_token: { Args: never; Returns: string }
      generate_invoice_number: { Args: { org_id: string }; Returns: string }
      generate_job_number: { Args: { org_id: string }; Returns: string }
      generate_lab_report_number: { Args: { org_id: string }; Returns: string }
      generate_proposal_number: { Args: { org_id: string }; Returns: string }
      generate_work_order_number: {
        Args: { p_job_id: string; p_organization_id: string }
        Returns: string
      }
      get_estimate_metrics: { Args: { p_location_id?: string }; Returns: Json }
      get_feedback_stats: {
        Args: { org_id: string }
        Returns: {
          avg_communication_rating: number
          avg_overall_rating: number
          avg_quality_rating: number
          avg_timeliness_rating: number
          completed_surveys: number
          nps_score: number
          response_rate: number
          testimonials_count: number
          total_surveys: number
        }[]
      }
      get_feedback_survey_by_token: { Args: { p_token: string }; Returns: Json }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_organization_id: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      import_nari_madison_2026: {
        Args: { p_organization_id: string }
        Returns: number
      }
      increment_jobs_count: { Args: { org_id: string }; Returns: undefined }
      increment_tenant_usage: {
        Args: {
          p_increment?: number
          p_metric: string
          p_organization_id: string
        }
        Returns: undefined
      }
      initialize_job_checklist: {
        Args: { p_job_id: string }
        Returns: undefined
      }
      initialize_notification_preferences: {
        Args: { p_org_id: string; p_user_id: string }
        Returns: undefined
      }
      is_platform_user: { Args: never; Returns: boolean }
      log_ai_usage: {
        Args: {
          p_customer_id?: string
          p_data_categories?: string[]
          p_error_message?: string
          p_input_tokens?: number
          p_model_version?: string
          p_operation: string
          p_organization_id: string
          p_output_tokens?: number
          p_pii_redacted?: boolean
          p_processing_time_ms?: number
          p_provider: string
          p_related_entity_id?: string
          p_related_entity_type?: string
          p_service_name: string
          p_success?: boolean
        }
        Returns: string
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_new_values?: Json
          p_old_values?: Json
          p_organization_id: string
          p_resource_id?: string
          p_resource_type?: string
        }
        Returns: undefined
      }
      log_platform_access: {
        Args: {
          p_action: string
          p_details?: Json
          p_resource_id?: string
          p_resource_type: string
          p_target_org_id: string
        }
        Returns: undefined
      }
      recalculate_estimate_totals: {
        Args: { est_id: string }
        Returns: undefined
      }
      record_invoice_payment: {
        Args: {
          p_amount: number
          p_created_by: string
          p_invoice_id: string
          p_notes: string
          p_payment_date: string
          p_payment_method: string
          p_reference_number: string
        }
        Returns: Json
      }
      refresh_report_views: { Args: never; Returns: undefined }
      reset_monthly_job_counts: { Args: never; Returns: undefined }
      reset_rate_limit: { Args: { p_key_id: string }; Returns: boolean }
      reset_tenant_usage: {
        Args: { p_month?: string; p_organization_id: string }
        Returns: undefined
      }
      submit_feedback: {
        Args: {
          p_feedback_text?: string
          p_improvement_suggestions?: string
          p_ip_address?: string
          p_likelihood_to_recommend?: number
          p_rating_communication?: number
          p_rating_overall?: number
          p_rating_quality?: number
          p_rating_timeliness?: number
          p_rating_value?: number
          p_testimonial_permission?: boolean
          p_testimonial_text?: string
          p_token: string
          p_user_agent?: string
          p_would_recommend?: boolean
        }
        Returns: Json
      }
      update_tenant_usage: {
        Args: { increment_by?: number; org_id: string; usage_type: string }
        Returns: undefined
      }
      validate_feedback_token: {
        Args: { token_value: string }
        Returns: string
      }
    }
    Enums: {
      account_status: "prospect" | "active" | "inactive" | "churned"
      appointment_status:
        | "scheduled"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      company_type:
        | "residential_property_mgr"
        | "commercial_property_mgr"
        | "general_contractor"
        | "industrial"
        | "hoa"
        | "government"
        | "direct_homeowner"
        | "other"
      contact_role:
        | "decision_maker"
        | "influencer"
        | "billing"
        | "property_manager"
        | "site_contact"
        | "other"
      contact_status: "active" | "inactive" | "do_not_contact"
      containment_level: "type_i" | "type_ii" | "type_iii"
      customer_source: "phone" | "website" | "mail" | "referral" | "other"
      customer_status:
        | "inquiry"
        | "prospect"
        | "customer"
        | "inactive"
        | "past_customer"
      disposal_hazard_type:
        | "asbestos_friable"
        | "asbestos_non_friable"
        | "mold"
        | "lead"
        | "other"
      estimate_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "sent"
        | "accepted"
        | "rejected"
        | "expired"
        | "converted"
      hazard_type: "asbestos" | "mold" | "lead" | "vermiculite" | "other"
      lab_report_status: "ordered" | "received" | "cancelled"
      lab_sample_type:
        | "asbestos_bulk"
        | "asbestos_air"
        | "lead_paint"
        | "lead_dust"
        | "lead_water"
        | "lead_soil"
        | "mold_air"
        | "mold_surface"
        | "silica"
        | "other"
      line_item_type:
        | "labor"
        | "equipment"
        | "material"
        | "disposal"
        | "travel"
        | "permit"
        | "testing"
        | "other"
      opportunity_status:
        | "new"
        | "assessment_scheduled"
        | "survey_completed"
        | "estimate_sent"
        | "won"
        | "lost"
        | "no_decision"
      property_type:
        | "residential_single_family"
        | "residential_multi_family"
        | "commercial"
        | "industrial"
        | "government"
      proposal_status:
        | "draft"
        | "sent"
        | "viewed"
        | "signed"
        | "expired"
        | "declined"
      regulatory_trigger:
        | "inspection_required"
        | "sale_pending"
        | "tenant_complaint"
        | "insurance_claim"
        | "voluntary"
      site_survey_status:
        | "draft"
        | "submitted"
        | "reviewed"
        | "estimated"
        | "quoted"
        | "scheduled"
        | "in_progress"
        | "completed"
        | "cancelled"
      sms_message_type:
        | "appointment_reminder"
        | "job_status"
        | "lead_notification"
        | "payment_reminder"
        | "estimate_follow_up"
        | "general"
        | "incoming_message"
      sms_status:
        | "queued"
        | "sending"
        | "sent"
        | "delivered"
        | "failed"
        | "undelivered"
      urgency_level: "routine" | "urgent" | "emergency"
      user_role:
        | "admin"
        | "estimator"
        | "technician"
        | "viewer"
        | "platform_owner"
        | "platform_admin"
        | "tenant_owner"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_status: ["prospect", "active", "inactive", "churned"],
      appointment_status: [
        "scheduled",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      company_type: [
        "residential_property_mgr",
        "commercial_property_mgr",
        "general_contractor",
        "industrial",
        "hoa",
        "government",
        "direct_homeowner",
        "other",
      ],
      contact_role: [
        "decision_maker",
        "influencer",
        "billing",
        "property_manager",
        "site_contact",
        "other",
      ],
      contact_status: ["active", "inactive", "do_not_contact"],
      containment_level: ["type_i", "type_ii", "type_iii"],
      customer_source: ["phone", "website", "mail", "referral", "other"],
      customer_status: [
        "inquiry",
        "prospect",
        "customer",
        "inactive",
        "past_customer",
      ],
      disposal_hazard_type: [
        "asbestos_friable",
        "asbestos_non_friable",
        "mold",
        "lead",
        "other",
      ],
      estimate_status: [
        "draft",
        "pending_approval",
        "approved",
        "sent",
        "accepted",
        "rejected",
        "expired",
        "converted",
      ],
      hazard_type: ["asbestos", "mold", "lead", "vermiculite", "other"],
      lab_report_status: ["ordered", "received", "cancelled"],
      lab_sample_type: [
        "asbestos_bulk",
        "asbestos_air",
        "lead_paint",
        "lead_dust",
        "lead_water",
        "lead_soil",
        "mold_air",
        "mold_surface",
        "silica",
        "other",
      ],
      line_item_type: [
        "labor",
        "equipment",
        "material",
        "disposal",
        "travel",
        "permit",
        "testing",
        "other",
      ],
      opportunity_status: [
        "new",
        "assessment_scheduled",
        "survey_completed",
        "estimate_sent",
        "won",
        "lost",
        "no_decision",
      ],
      property_type: [
        "residential_single_family",
        "residential_multi_family",
        "commercial",
        "industrial",
        "government",
      ],
      proposal_status: [
        "draft",
        "sent",
        "viewed",
        "signed",
        "expired",
        "declined",
      ],
      regulatory_trigger: [
        "inspection_required",
        "sale_pending",
        "tenant_complaint",
        "insurance_claim",
        "voluntary",
      ],
      site_survey_status: [
        "draft",
        "submitted",
        "reviewed",
        "estimated",
        "quoted",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ],
      sms_message_type: [
        "appointment_reminder",
        "job_status",
        "lead_notification",
        "payment_reminder",
        "estimate_follow_up",
        "general",
        "incoming_message",
      ],
      sms_status: [
        "queued",
        "sending",
        "sent",
        "delivered",
        "failed",
        "undelivered",
      ],
      urgency_level: ["routine", "urgent", "emergency"],
      user_role: [
        "admin",
        "estimator",
        "technician",
        "viewer",
        "platform_owner",
        "platform_admin",
        "tenant_owner",
      ],
    },
  },
} as const

// ============================================================================
// HAND-CURATED ALIASES — short, readable names for the most-used Row/Insert/Update types.
// ============================================================================

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
export type OrganizationDocument = Database['public']['Tables']['organization_documents']['Row']
export type OrganizationDocumentShare = Database['public']['Tables']['organization_document_shares']['Row']

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
export type OrganizationDocumentInsert = Database['public']['Tables']['organization_documents']['Insert']
export type OrganizationDocumentUpdate = Database['public']['Tables']['organization_documents']['Update']
export type OrganizationDocumentShareInsert = Database['public']['Tables']['organization_document_shares']['Insert']
export type EstimateAttachedDocument = Database['public']['Tables']['estimate_attached_documents']['Row']
export type EstimateAttachedDocumentInsert = Database['public']['Tables']['estimate_attached_documents']['Insert']

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