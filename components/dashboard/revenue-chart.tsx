'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from '@/components/charts/recharts-lazy';
import { formatCurrency } from '@/lib/utils';

interface RevenueData {
  month: string;
  revenue: number;
}

export function RevenueChart() {
  const [data, setData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/analytics/revenue');
        const result = await response.json();
        setData(Array.isArray(result) ? result : []);
      } catch {
        // Revenue data fetch failed - chart will show empty state
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {/* Left margin + explicit YAxis width keep the "$5k" tick
                label from clipping on the card edge. Recharts' default
                60px YAxis is tight when ticks carry a $ prefix. */}
            <LineChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis width={72} tickFormatter={(value) => `$${value / 1000}k`} />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value), false), 'Revenue']}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#ED6F3B"
                strokeWidth={2}
                dot={{ r: 4, fill: '#ED6F3B' }}
                activeDot={{ r: 6, fill: '#ED6F3B' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
