import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSecureErrorResponse, SecureError } from '@/lib/utils/secure-error-handler';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new SecureError('UNAUTHORIZED');
    }

    const data = [];

    // Get last 6 months of revenue
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');

      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .gte('payment_date', monthStart)
        .lte('payment_date', monthEnd);

      const revenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

      data.push({
        month: format(monthDate, 'MMM'),
        revenue,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    return createSecureErrorResponse(error);
  }
}
