import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { QuickBooksService } from '@/lib/services/quickbooks-service';

export async function POST() {
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

    await QuickBooksService.disconnect(profile.organization_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('QBO disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
  }
}
