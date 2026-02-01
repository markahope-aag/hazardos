import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SegmentationService } from '@/lib/services/segmentation-service';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';

export async function POST(
  request: NextRequest,
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

    // Get Mailchimp integration settings
    const { data: integration } = await supabase
      .from('organization_integrations')
      .select('settings')
      .eq('organization_id', profile.organization_id)
      .eq('integration_type', 'mailchimp')
      .eq('is_active', true)
      .single();

    if (!integration) {
      throw new SecureError('BAD_REQUEST', 'Mailchimp is not connected');
    }

    const settings = integration.settings as { default_list_id?: string } | null;
    const body = await request.json().catch(() => ({}));
    const listId = body.list_id || settings?.default_list_id;

    if (!listId) {
      throw new SecureError('VALIDATION_ERROR', 'list_id is required', 'list_id');
    }

    const { id } = await params;
    await SegmentationService.syncToMailchimp(id, listId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
