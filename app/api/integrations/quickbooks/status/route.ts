import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { QuickBooksService } from '@/lib/services/quickbooks-service';

export async function GET() {
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

    const status = await QuickBooksService.getConnectionStatus(profile.organization_id);

    return NextResponse.json(status);
  } catch (error) {
    console.error('QBO status error:', error);
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
