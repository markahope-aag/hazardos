import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase/server'
import { Activity } from '@/lib/services/activity-service'
import { SecureError, throwDbError } from '@/lib/utils/secure-error-handler'
import type {
  JobCompletionPhoto,
  CreateCompletionPhotoInput,
  UpdateCompletionPhotoInput,
} from '@/types/job-completion'

export class JobCompletionPhotosService {
  static async getPhotos(jobId: string): Promise<JobCompletionPhoto[]> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('job_completion_photos')
      .select(`
        *,
        uploader:profiles!job_completion_photos_uploaded_by_fkey(id, full_name, avatar_url)
      `)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })

    if (error) throwDbError(error, 'fetch completion photos')

    return (data || []).map(photo => ({
      ...photo,
      uploader: Array.isArray(photo.uploader) ? photo.uploader[0] : photo.uploader,
    }))
  }

  static async createPhoto(input: CreateCompletionPhotoInput): Promise<JobCompletionPhoto> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('job_completion_photos')
      .insert({
        job_id: input.job_id,
        photo_url: input.photo_url,
        thumbnail_url: input.thumbnail_url,
        storage_path: input.storage_path,
        photo_type: input.photo_type || 'during',
        caption: input.caption,
        taken_at: input.taken_at,
        location_lat: input.location_lat,
        location_lng: input.location_lng,
        camera_make: input.camera_make,
        camera_model: input.camera_model,
        image_width: input.image_width,
        image_height: input.image_height,
        file_name: input.file_name,
        file_size: input.file_size,
        mime_type: input.mime_type,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (error) throwDbError(error, 'create completion photo')

    await Activity.created('completion_photo', data.id, input.photo_type || 'during')

    return data
  }

  static async updatePhoto(id: string, input: UpdateCompletionPhotoInput): Promise<JobCompletionPhoto> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data, error } = await supabase
      .from('job_completion_photos')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) throwDbError(error, 'update completion photo')

    await Activity.updated('completion_photo', data.id)

    return data
  }

  static async deletePhoto(id: string): Promise<void> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const { data: photo } = await supabase
      .from('job_completion_photos')
      .select('storage_path')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('job_completion_photos')
      .delete()
      .eq('id', id)

    if (error) throwDbError(error, 'delete completion photo')

    if (photo?.storage_path) {
      await supabase.storage
        .from('job-completion-photos')
        .remove([photo.storage_path])
    }

    await Activity.deleted('completion_photo', id)
  }

  static async uploadPhoto(
    jobId: string,
    organizationId: string,
    file: File,
  ): Promise<{ url: string; path: string }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new SecureError('UNAUTHORIZED')

    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${nanoid()}.${fileExt}`
    const storagePath = `${organizationId}/${jobId}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('job-completion-photos')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('job-completion-photos')
      .getPublicUrl(storagePath)

    return { url: publicUrl, path: storagePath }
  }
}
