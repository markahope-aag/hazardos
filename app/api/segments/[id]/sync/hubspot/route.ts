import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SegmentationService } from '@/lib/services/segmentation-service';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new SecureError('UNAUTHORIZED');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      throw new SecureError('NOT_FOUND', 'No organization found');
    }

    // Check HubSpot is connected
    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('integration_type', 'hubspot')
      .eq('is_active', true)
      .single();

    if (!integration) {
      throw new SecureError('BAD_REQUEST', 'HubSpot is not connected');
    }

    const { id } = await params;
    await SegmentationService.syncToHubSpot(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
