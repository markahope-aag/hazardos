import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { QuickBooksService } from '@/lib/services/quickbooks-service';
import { randomBytes } from 'crypto';

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

    // Generate state token for CSRF protection
    const state = `${profile.organization_id}:${randomBytes(16).toString('hex')}`;

    // Store state in cookie for validation
    const authUrl = QuickBooksService.getAuthorizationUrl(state);

    const response = NextResponse.json({ url: authUrl });
    response.cookies.set('qbo_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('QBO connect error:', error);
    return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 });
  }
}
