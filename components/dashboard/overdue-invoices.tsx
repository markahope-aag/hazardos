import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

// Re-export error boundary wrapper
export { OverdueInvoicesErrorBoundary } from './error-wrappers';

interface Customer {
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  due_date: string;
  balance_due: number;
  customer: Customer | null;
}

export async function OverdueInvoices() {
  const supabase = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      due_date,
      balance_due,
      customer:customers(company_name, first_name, last_name)
    `)
    .lt('due_date', today)
    .gt('balance_due', 0)
    .not('status', 'in', '("paid","void")')
    .order('due_date', { ascending: true })
    .limit(5);

  const typedInvoices = (invoices || []) as unknown as Invoice[];
  const totalOverdue = typedInvoices.reduce((sum, i) => sum + (i.balance_due || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          Overdue Invoices
        </CardTitle>
        <Link href="/invoices?status=overdue" className="text-sm text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent>
        {typedInvoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No overdue invoices</p>
        ) : (
          <>
            <div className="text-2xl font-bold text-destructive mb-4">
              {formatCurrency(totalOverdue)}
            </div>
            <div className="space-y-3">
              {typedInvoices.map((invoice) => (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="flex justify-between items-center p-2 rounded-lg hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">
                      {invoice.customer?.company_name ||
                       `${invoice.customer?.first_name || ''} ${invoice.customer?.last_name || ''}`.trim() ||
                       'Unknown Customer'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(invoice.due_date), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(invoice.balance_due)}</p>
                    <Badge variant="outline" className="text-xs">
                      {invoice.invoice_number}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
