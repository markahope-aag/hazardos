import { createClient } from './client'
import type { Database, Assessment, AssessmentInsert, Profile } from '@/types/database'

// Create a typed Supabase client
export const supabase = createClient()

// Database helper functions
export class DatabaseService {
  // Profile operations
  static async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching profile:', error)
      return null
    }

    return data
  }

  static async updateProfile(userId: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    return data
  }

  // Assessment operations
  static async getAssessments(organizationId: string) {
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        profiles:estimator_id (
          first_name,
          last_name,
          email
        ),
        photos (
          id,
          url,
          thumbnail_url,
          caption
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch assessments: ${error.message}`)
    }

    return data
  }

  static async getAssessment(id: string) {
    const { data, error } = await supabase
      .from('assessments')
      .select(`
        *,
        profiles:estimator_id (
          first_name,
          last_name,
          email
        ),
        photos (
          id,
          url,
          thumbnail_url,
          caption,
          gps_coordinates,
          created_at
        ),
        estimates (
          id,
          total_price,
          created_at,
          is_active
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(`Failed to fetch assessment: ${error.message}`)
    }

    return data
  }

  static async createAssessment(assessment: AssessmentInsert) {
    const { data, error } = await supabase
      .from('assessments')
      .insert(assessment)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create assessment: ${error.message}`)
    }

    return data
  }

  static async updateAssessment(id: string, updates: Partial<Assessment>) {
    const { data, error } = await supabase
      .from('assessments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update assessment: ${error.message}`)
    }

    return data
  }

  static async deleteAssessment(id: string) {
    const { error } = await supabase
      .from('assessments')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete assessment: ${error.message}`)
    }
  }

  // Photo operations
  static async uploadPhoto(file: File, assessmentId: string) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${assessmentId}/${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('assessment-photos')
      .upload(fileName, file)

    if (uploadError) {
      throw new Error(`Failed to upload photo: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('assessment-photos')
      .getPublicUrl(fileName)

    // Save photo record to database
    const { data, error } = await supabase
      .from('photos')
      .insert({
        assessment_id: assessmentId,
        url: publicUrl,
        file_size: file.size,
        file_type: file.type,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save photo record: ${error.message}`)
    }

    return data
  }

  // Equipment and Materials catalog
  static async getEquipmentCatalog(organizationId: string) {
    const { data, error } = await supabase
      .from('equipment_catalog')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch equipment catalog: ${error.message}`)
    }

    return data
  }

  static async getMaterialsCatalog(organizationId: string) {
    const { data, error } = await supabase
      .from('materials_catalog')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch materials catalog: ${error.message}`)
    }

    return data
  }

  // Test connection
  static async testConnection() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)

      if (error) {
        throw error
      }

      return { success: true, message: 'Database connection successful' }
    } catch (error) {
      return { 
        success: false, 
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }
}