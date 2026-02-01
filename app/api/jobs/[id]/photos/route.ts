import { NextRequest, NextResponse } from 'next/server'
import { JobCompletionService } from '@/lib/services/job-completion-service'
import { createSecureErrorResponse, validateRequired, SecureError } from '@/lib/utils/secure-error-handler'
import { createClient } from '@/lib/supabase/server'

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const photos = await JobCompletionService.getPhotos(id)
    return NextResponse.json(photos)
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new SecureError('UNAUTHORIZED')
    }

    const body = await request.json()

    validateRequired(body.photo_url, 'photo_url')
    validateRequired(body.storage_path, 'storage_path')

    const photo = await JobCompletionService.createPhoto({
      job_id: id,
      photo_url: body.photo_url,
      thumbnail_url: body.thumbnail_url,
      storage_path: body.storage_path,
      photo_type: body.photo_type,
      caption: body.caption,
      taken_at: body.taken_at,
      location_lat: body.location_lat,
      location_lng: body.location_lng,
      camera_make: body.camera_make,
      camera_model: body.camera_model,
      image_width: body.image_width,
      image_height: body.image_height,
      file_name: body.file_name,
      file_size: body.file_size,
      mime_type: body.mime_type,
    })

    return NextResponse.json(photo, { status: 201 })
  } catch (error) {
    return createSecureErrorResponse(error)
  }
}
