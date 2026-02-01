'use client';

import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, Calendar, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { WidgetErrorBoundary } from '@/components/error-boundaries';
import { Button } from '@/components/ui/button';

export async function StatsCards() {
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  // Revenue this month (paid invoices)
  const { data: paidInvoices } = await supabase
    .from('payments')
    .select('amount')
    .gte('payment_date', monthStart.split('T')[0])
    .lte('payment_date', monthEnd.split('T')[0]);

  const revenueThisMonth = paidInvoices?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  // Outstanding AR
  const { data: outstandingInvoices } = await supabase
    .from('invoices')
    .select('balance_due')
    .gt('balance_due', 0)
    .not('status', 'in', '("void","paid")');

  const outstandingAR = outstandingInvoices?.reduce((sum, i) => sum + (i.balance_due || 0), 0) || 0;

  // Jobs this month
  const { count: jobsThisMonth } = await supabase
    .from('jobs')
    .select('*', { count: 'exact', head: true })
    .gte('scheduled_start_date', monthStart.split('T')[0])
    .lte('scheduled_start_date', monthEnd.split('T')[0])
    .neq('status', 'cancelled');

  // Proposals sent this month
  const { data: proposals } = await supabase
    .from('proposals')
    .select('status')
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd);

  const proposalsSent = proposals?.length || 0;
  const proposalsWon = proposals?.filter(p => p.status === 'signed').length || 0;
  const winRate = proposalsSent > 0 ? Math.round((proposalsWon / proposalsSent) * 100) : 0;

  const stats = [
    {
      title: 'Revenue MTD',
      value: formatCurrency(revenueThisMonth),
      icon: DollarSign,
      description: 'Payments received this month',
    },
    {
      title: 'Outstanding AR',
      value: formatCurrency(outstandingAR),
      icon: FileText,
      description: 'Unpaid invoice balance',
    },
    {
      title: 'Jobs This Month',
      value: jobsThisMonth?.toString() || '0',
      icon: Calendar,
      description: 'Scheduled & completed',
    },
    {
      title: 'Win Rate',
      value: `${winRate}%`,
      icon: TrendingUp,
      description: `${proposalsWon} of ${proposalsSent} proposals`,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
