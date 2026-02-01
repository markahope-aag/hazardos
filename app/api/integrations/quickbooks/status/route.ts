import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { QuickBooksService } from '@/lib/services/quickbooks-service';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';

export async function GET() {
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

    const status = await QuickBooksService.getConnectionStatus(profile.organization_id);

    return NextResponse.json(status);
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
