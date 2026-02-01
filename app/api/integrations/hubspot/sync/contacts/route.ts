import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { HubSpotService } from '@/lib/services/hubspot-service';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { customer_id } = body;

    if (customer_id) {
      // Sync single customer
      const hubspotId = await HubSpotService.syncContact(
        profile.organization_id,
        customer_id
      );
      return NextResponse.json({ success: true, hubspot_id: hubspotId });
    } else {
      // Sync all contacts
      const results = await HubSpotService.syncAllContacts(profile.organization_id);
      return NextResponse.json({ success: true, ...results });
    }
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
