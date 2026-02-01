import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { QuickBooksService } from '@/lib/services/quickbooks-service';
import { createSecureErrorResponse, SecureError, validateRequired } from '@/lib/utils/secure-error-handler'

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

    const { customer_id } = await request.json();

    validateRequired(customer_id, 'customer_id');

    const qbId = await QuickBooksService.syncCustomerToQBO(
      profile.organization_id,
      customer_id
    );

    return NextResponse.json({ qb_customer_id: qbId });
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
