import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { QuickBooksService } from '@/lib/services/quickbooks-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const { customer_id } = await request.json();

    if (!customer_id) {
      return NextResponse.json({ error: 'customer_id required' }, { status: 400 });
    }

    const qbId = await QuickBooksService.syncCustomerToQBO(
      profile.organization_id,
      customer_id
    );

    return NextResponse.json({ qb_customer_id: qbId });
  } catch (error) {
    console.error('QBO sync customer error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
