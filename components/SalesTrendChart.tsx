'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

export const SalesTrendChart = () => {
  const [timeframe, setTimeframe] = React.useState('7d');

  const trendData = [
    { date: 'Jan 20', sales: 18500, transactions: 45 },
    { date: 'Jan 21', sales: 22100, transactions: 52 },
    { date: 'Jan 22', sales: 19800, transactions: 48 },
    { date: 'Jan 23', sales: 25600, transactions: 58 },
    { date: 'Jan 24', sales: 21400, transactions: 49 },
    { date: 'Jan 25', sales: 28300, transactions: 65 },
    { date: 'Jan 26', sales: 24350, transactions: 59 },
  ];

  const formatCurrency = (value: number) => `₱${(value / 1000).toFixed(0)}k`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Sales Trends
            </CardTitle>
            <CardDescription>
              Daily performance metrics over time
            </CardDescription>
          </div>

          {/* Timeframe Selector */}
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={timeframe === '7d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeframe('7d')}
              className="h-8 px-3"
            >
              7 Days
            </Button>
            <Button
              variant={timeframe === '30d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeframe('30d')}
              className="h-8 px-3"
            >
              30 Days
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <LineChart
              data={trendData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
                opacity={0.5}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="sales"
                orientation="left"
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                width={50}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="count"
                orientation="right"
                tick={{ fontSize: 12 }}
                width={40}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 13,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'sales') {
                    return [
                      new Intl.NumberFormat('en-PH', {
                        style: 'currency',
                        currency: 'PHP',
                        minimumFractionDigits: 0,
                      }).format(value),
                      'Sales',
                    ];
                  }
                  return [
                    value,
                    name === 'transactions' ? 'Transactions' : name,
                  ];
                }}
              />
              <Line
                yAxisId="sales"
                type="monotone"
                dataKey="sales"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#3b82f6' }}
                name="sales"
              />
              <Line
                yAxisId="count"
                type="monotone"
                dataKey="transactions"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, fill: '#10b981' }}
                name="transactions"
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {value === 'sales' ? 'Sales (₱)' : 'Transactions'}
                  </span>
                )}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Insights */}
        <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Peak Day</div>
            <div className="font-semibold text-green-600">Jan 25</div>
            <div className="text-xs text-muted-foreground">₱28,300</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Avg. Daily</div>
            <div className="font-semibold">₱22,864</div>
            <div className="text-xs text-muted-foreground">
              +8.2% vs last week
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Growth Trend</div>
            <div className="font-semibold text-blue-600">+12.5%</div>
            <div className="text-xs text-muted-foreground">week over week</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
