import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AIEstimateService, EstimateInput } from '@/lib/services/ai-estimate-service';
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
    const input: EstimateInput = {
      hazard_types: body.hazard_types || [],
      property_type: body.property_type,
      square_footage: body.square_footage,
      photos: body.photos,
      site_survey_notes: body.site_survey_notes,
      customer_notes: body.customer_notes,
    };

    // Validate required fields
    if (!input.hazard_types.length) {
      throw new SecureError('VALIDATION_ERROR', 'At least one hazard type is required');
    }

    const suggestion = await AIEstimateService.suggestEstimate(
      profile.organization_id,
      input
    );

    return NextResponse.json(suggestion);
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
