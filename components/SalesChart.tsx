'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip as RechartsTooltip } from 'recharts';
import { Calendar } from 'lucide-react';
import useIsMobile from '@/hooks/use-mobile';

interface ChartData {
  date: string;
  sales: number;
  purchases: number;
}

const chartData: ChartData[] = [
  { date: '2024-05-28', sales: 19500, purchases: 9100 },
  { date: '2024-05-29', sales: 16100, purchases: 7500 },
  { date: '2024-05-30', sales: 22700, purchases: 11900 },
  { date: '2024-05-31', sales: 18800, purchases: 9400 },
  { date: '2024-06-01', sales: 19200, purchases: 8800 },
  { date: '2024-06-02', sales: 26300, purchases: 14200 },
  { date: '2024-06-03', sales: 16700, purchases: 7900 },
  { date: '2024-06-04', sales: 24800, purchases: 13600 },
  { date: '2024-06-05', sales: 15800, purchases: 7200 },
  { date: '2024-06-06', sales: 20900, purchases: 10600 },
  { date: '2024-06-07', sales: 23200, purchases: 12800 },
  { date: '2024-06-08', sales: 24600, purchases: 11900 },
  { date: '2024-06-09', sales: 27100, purchases: 15400 },
  { date: '2024-06-10', sales: 18300, purchases: 8900 },
  { date: '2024-06-11', sales: 16400, purchases: 7600 },
  { date: '2024-06-12', sales: 28200, purchases: 16100 },
  { date: '2024-06-13', sales: 15600, purchases: 7100 },
  { date: '2024-06-14', sales: 25400, purchases: 13800 },
  { date: '2024-06-15', sales: 22800, purchases: 12400 },
  { date: '2024-06-16', sales: 24100, purchases: 11700 },
  { date: '2024-06-17', sales: 29500, purchases: 16800 },
  { date: '2024-06-18', sales: 17800, purchases: 8200 },
  { date: '2024-06-19', sales: 22400, purchases: 10900 },
  { date: '2024-06-20', sales: 26800, purchases: 14600 },
  { date: '2024-06-21', sales: 19600, purchases: 9300 },
  { date: '2024-06-22', sales: 21700, purchases: 10800 },
  { date: '2024-06-23', sales: 28600, purchases: 16200 },
  { date: '2024-06-24', sales: 17200, purchases: 8100 },
  { date: '2024-06-25', sales: 18300, purchases: 8700 },
  { date: '2024-06-26', sales: 25200, purchases: 13900 },
  { date: '2024-06-27', sales: 27400, purchases: 15600 },
  { date: '2024-06-28', sales: 18900, purchases: 9200 },
  { date: '2024-06-29', sales: 16800, purchases: 7800 },
  { date: '2024-06-30', sales: 26100, purchases: 14400 },
];

export function SalesChart() {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState('30d');

  React.useEffect(() => {
    if (isMobile) setTimeRange('7d');
  }, [isMobile]);

  const {
    filteredData,
    totalSales,
    totalPurchases,
    grossProfit,
    profitMargin,
  } = React.useMemo(() => {
    const referenceDate = new Date('2024-06-30');
    const days = timeRange === '7d' ? 7 : 30;
    const startDate = new Date(referenceDate);
    startDate.setDate(referenceDate.getDate() - days);

    const filtered = chartData.filter(
      (item) => new Date(item.date) >= startDate,
    );

    const sales = filtered.reduce((acc, d) => acc + d.sales, 0);
    const purchases = filtered.reduce((acc, d) => acc + d.purchases, 0);
    const profit = sales - purchases;
    const margin = sales ? ((profit / sales) * 100).toFixed(1) : '0';

    return {
      filteredData: filtered,
      totalSales: sales,
      totalPurchases: purchases,
      grossProfit: profit,
      profitMargin: margin,
    };
  }, [timeRange]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const formatXAxis = (date: string) =>
    new Date(date).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
    });

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold">
              Sales Performance
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Revenue vs. purchase costs over the last{' '}
              {timeRange === '7d' ? '7' : '30'} days
            </CardDescription>
          </div>

          {/* Time Range Selector */}
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={timeRange === '7d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('7d')}
              className="h-8 px-3"
            >
              <Calendar className="w-3 h-3 mr-1" />7 Days
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeRange('30d')}
              className="h-8 px-3"
            >
              <Calendar className="w-3 h-3 mr-1" />
              30 Days
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Sales</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(totalSales)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Purchases</p>
            <p className="text-xl font-bold text-orange-600">
              {formatCurrency(totalPurchases)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Gross Profit</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(grossProfit)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Profit Margin</p>
            <p className="text-xl font-bold">{profitMargin}%</p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer>
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => `₱${v / 1000}k`}
                tick={{ fontSize: 12 }}
                width={50}
                axisLine={false}
                tickLine={false}
              />
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
                opacity={0.5}
              />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: 8,
                  fontSize: 13,
                  background: 'white',
                  border: '1px solid #e5e7eb',
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === 'sales' ? 'Sales' : 'Purchases',
                ]}
                labelFormatter={(label) =>
                  `Date: ${formatXAxis(label as string)}`
                }
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#3b82f6"
                fill="url(#colorSales)"
                strokeWidth={2}
                name="sales"
              />
              <Area
                type="monotone"
                dataKey="purchases"
                stroke="#f97316"
                fill="url(#colorPurchases)"
                strokeWidth={2}
                name="purchases"
              />
              <Legend
                verticalAlign="top"
                height={30}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {value === 'sales' ? 'Sales' : 'Purchases'}
                  </span>
                )}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
