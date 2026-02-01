import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MailchimpService } from '@/lib/services/mailchimp-service';
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
    const { list_id, customer_id } = body;

    if (!list_id) {
      throw new SecureError('VALIDATION_ERROR', 'list_id is required', 'list_id');
    }

    if (customer_id) {
      // Sync single customer
      const mailchimpId = await MailchimpService.syncContact(
        profile.organization_id,
        customer_id,
        list_id
      );
      return NextResponse.json({ success: true, mailchimp_id: mailchimpId });
    } else {
      // Sync all contacts
      const results = await MailchimpService.syncAllContacts(
        profile.organization_id,
        list_id
      );
      return NextResponse.json({ success: true, ...results });
    }
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
