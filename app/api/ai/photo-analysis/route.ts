import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PhotoAnalysisService, PhotoAnalysisContext } from '@/lib/services/photo-analysis-service';
import { SecureError, createSecureErrorResponse } from '@/lib/utils/secure-error-handler';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new SecureError('UNAUTHORIZED');
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'Organization not found');
    }

    const body = await request.json();

    // Support single image or multiple images
    if (body.images && Array.isArray(body.images)) {
      // Multiple images
      const images = body.images.map((img: { base64: string; context?: PhotoAnalysisContext }) => ({
        base64: img.base64,
        context: img.context,
      }));

      if (images.length === 0) {
        throw new SecureError('VALIDATION_ERROR', 'At least one image is required');
      }

      const result = await PhotoAnalysisService.analyzeMultiplePhotos(
        profile.organization_id,
        images
      );

      return NextResponse.json(result);
    } else if (body.image) {
      // Single image
      const context: PhotoAnalysisContext | undefined = body.context ? {
        property_type: body.context.property_type,
        known_hazards: body.context.known_hazards,
        additional_context: body.context.additional_context,
      } : undefined;

      const analysis = await PhotoAnalysisService.analyzePhoto(
        profile.organization_id,
        body.image,
        context
      );

      return NextResponse.json(analysis);
    } else {
      throw new SecureError('VALIDATION_ERROR', 'Image data is required (image or images field)');
    }
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
