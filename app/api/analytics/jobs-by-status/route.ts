import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statuses = ['scheduled', 'in_progress', 'completed', 'invoiced', 'paid'];
    const data = [];

    for (const status of statuses) {
      const { count } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);

      if (count && count > 0) {
        data.push({
          status: status.replace('_', ' '),
          count,
        });
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Jobs analytics error:', error);
    return NextResponse.json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}
