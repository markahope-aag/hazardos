import { createClient } from './client'
import type { SiteSurvey, SiteSurveyInsert, SiteSurveyUpdate } from '@/types/database'

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

// Site Survey Database Service
export class SiteSurveyService {
  // Site Survey operations
  static async getSiteSurveys(organizationId: string) {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await supabase
      .from('site_surveys')
      .select(`
        *,
        profiles:estimator_id (
          first_name,
          last_name,
          email
        ),
        site_survey_photos (
          id,
          url,
          file_name,
          caption,
          created_at
        )
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch site surveys: ${error.message}`)
    }

    return data
  }

  static async getSiteSurvey(id: string) {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await supabase
      .from('site_surveys')
      .select(`
        *,
        profiles:estimator_id (
          first_name,
          last_name,
          email
        ),
        site_survey_photos (
          id,
          url,
          file_name,
          file_path,
          file_size,
          file_type,
          caption,
          created_at
        ),
        estimates (
          id,
          total_price,
          status,
          created_at
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(`Failed to fetch site survey: ${error.message}`)
    }

    return data
  }

  static async createSiteSurvey(siteSurvey: SiteSurveyInsert): Promise<SiteSurvey> {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await supabase
      .from('site_surveys')
      .insert(siteSurvey)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create site survey: ${error.message}`)
    }

    return data
  }

  static async updateSiteSurvey(id: string, updates: Partial<SiteSurveyInsert>): Promise<SiteSurvey> {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await supabase
      .from('site_surveys')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update site survey: ${error.message}`)
    }

    return data
  }

  static async deleteSiteSurvey(id: string): Promise<void> {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    // First delete associated photos from storage
    const photos = await this.getSiteSurveyMedia(id)
    for (const photo of photos) {
      await this.deleteMediaFile(photo.id, photo.file_path)
    }

    const { error } = await supabase
      .from('site_surveys')
      .delete()
      .eq('id', id)

    if (error) {
      throw new Error(`Failed to delete site survey: ${error.message}`)
    }
  }

  // Media upload operations
  static async uploadMediaFile(
    file: File, 
    siteSurveyId: string, 
    organizationId: string
  ): Promise<MediaUploadResult> {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${organizationId}/${siteSurveyId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    
    // Upload to Supabase Storage
    const { data: _uploadData, error: uploadError } = await supabase.storage
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
      .from('site_survey_photos')
      .insert({
        site_survey_id: siteSurveyId,
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

  static async getSiteSurveyMedia(siteSurveyId: string) {
    if (!supabase) {
      throw new Error('Supabase client not available')
    }

    const { data, error } = await supabase
      .from('site_survey_photos')
      .select('*')
      .eq('site_survey_id', siteSurveyId)
      .order('created_at')

    if (error) {
      throw new Error(`Failed to fetch site survey media: ${error.message}`)
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
      .from('site_survey_photos')
      .delete()
      .eq('id', photoId)

    if (dbError) {
      throw new Error(`Failed to delete media record: ${dbError.message}`)
    }
  }

  // Database connection test
  static async testConnection() {
    if (!supabase) {
      return { 
        success: false, 
        message: 'Supabase client not available - check environment variables' 
      }
    }

    try {
      const { data: _data, error } = await supabase
        .from('site_surveys')
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

// Legacy aliases for backward compatibility
export class DatabaseService extends SiteSurveyService {
  static async getAssessments(organizationId: string) {
    return this.getSiteSurveys(organizationId)
  }

  static async getAssessment(id: string) {
    return this.getSiteSurvey(id)
  }

  static async createAssessment(assessment: SiteSurveyInsert) {
    return this.createSiteSurvey(assessment)
  }

  static async updateAssessment(id: string, updates: SiteSurveyUpdate) {
    return this.updateSiteSurvey(id, updates)
  }

  static async deleteAssessment(id: string) {
    return this.deleteSiteSurvey(id)
  }

  static async getAssessmentMedia(assessmentId: string) {
    return this.getSiteSurveyMedia(assessmentId)
  }
}