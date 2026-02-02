import { createClient } from './client'
import type { Assessment, AssessmentInsert, Profile } from '@/types/database'

interface MediaUploadResult {
  url: string
  path: string
  size: number
}

// Create a typed Supabase client (only if environment variables are available)
function getSupabaseClient() {
  try {
    return createClient()
  } catch (error) {
    console.warn('Supabase client not available:', error)
    return null
  }
}

export const supabase = getSupabaseClient()

// Database helper functions
export class DatabaseService {
  // Profile operations
  static async getProfile(userId: string): Promise<Profile | null> {
    if (!supabase) {
      console.error('Supabase client not available')
      return null
    }

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
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

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

  // Site Survey operations (formerly Assessment operations)
  static async getSiteSurveys(organizationId: string) {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

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
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

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
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

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
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

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
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

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
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const fileExt = file.name.split('.').pop()
    const fileName = `${assessmentId}/${Date.now()}.${fileExt}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
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
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await supabase
      .from('equipment_catalog')
      .select('id, organization_id, name, description, category, daily_rate, weekly_rate, monthly_rate, is_active, created_at, updated_at')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('name')

    if (error) {
      throw new Error(`Failed to fetch equipment catalog: ${error.message}`)
    }

    return data
  }

  static async getMaterialsCatalog(organizationId: string) {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await supabase
      .from('materials_catalog')
      .select('id, organization_id, name, description, category, unit, unit_cost, is_active, created_at, updated_at')
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
    if (!supabase) {
      return { 
        success: false, 
        message: 'Supabase client not configured. Please check your environment variables.' 
      }
    }

    try {
      const { error } = await supabase
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

  // Media upload operations
  static async uploadMediaFile(
    file: File, 
    assessmentId: string, 
    organizationId: string
  ): Promise<MediaUploadResult> {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${organizationId}/${assessmentId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('assessment-media')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('assessment-media')
      .getPublicUrl(fileName)

    // Save media record to database
    const { error: dbError } = await supabase
      .from('assessment_photos')
      .insert({
        assessment_id: assessmentId,
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        file_type: file.type,
        url: urlData.publicUrl
      })

    if (dbError) {
      // If database insert fails, try to clean up the uploaded file
      await supabase.storage
        .from('assessment-media')
        .remove([fileName])
      
      throw new Error(`Failed to save media record: ${dbError.message}`)
    }

    return {
      url: urlData.publicUrl,
      path: fileName,
      size: file.size
    }
  }

  static async getAssessmentMedia(assessmentId: string) {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await supabase
      .from('assessment_photos')
      .select('id, assessment_id, url, file_name, file_path, file_size, file_type, caption, created_at')
      .eq('assessment_id', assessmentId)
      .order('created_at')

    if (error) {
      throw new Error(`Failed to fetch assessment media: ${error.message}`)
    }

    return data
  }

  static async deleteMediaFile(photoId: string, filePath: string) {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('assessment-media')
      .remove([filePath])

    if (storageError) {
      console.error('Failed to delete file from storage:', storageError)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('assessment_photos')
      .delete()
      .eq('id', photoId)

    if (dbError) {
      throw new Error(`Failed to delete media record: ${dbError.message}`)
    }
  }
}