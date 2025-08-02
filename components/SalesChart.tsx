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
import { ChartDataPoint } from '@/types';

interface SalesChartProps {
  chartData: ChartDataPoint[];
  loading?: boolean;
}

export function SalesChart({ chartData, loading = false }: SalesChartProps) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState('30d');
  const [filteredData, setFilteredData] = React.useState<ChartDataPoint[]>([]);

  React.useEffect(() => {
    if (isMobile) setTimeRange('7d');
  }, [isMobile]);

  // Filter chart data based on time range
  React.useEffect(() => {
    const days = timeRange === '7d' ? 7 : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const filtered = chartData.filter((item) => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    });

    setFilteredData(filtered);
  }, [chartData, timeRange]);

  const {
    totalSales,
    totalPurchases,
    grossProfit,
    profitMargin,
    totalTransactions,
  } = React.useMemo(() => {
    const sales = filteredData.reduce((acc, d) => acc + d.sales, 0);
    const purchases = filteredData.reduce((acc, d) => acc + d.purchases, 0);
    const profit = sales - purchases;
    const margin = sales ? ((profit / sales) * 100).toFixed(1) : '0';
    const transactions = filteredData.reduce(
      (acc, d) => acc + d.transactionCount,
      0,
    );

    return {
      totalSales: sales,
      totalPurchases: purchases,
      grossProfit: profit,
      profitMargin: margin,
      totalTransactions: transactions,
    };
  }, [filteredData]);

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
        {loading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-sm text-muted-foreground">
                Loading chart data...
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-xl font-bold text-blue-600">
                  {formatCurrency(totalSales)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Cost</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(totalPurchases)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Gross Profit</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(grossProfit)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {profitMargin}% margin
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Transactions</p>
                <p className="text-xl font-bold text-purple-600">
                  {totalTransactions}
                </p>
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
                      <stop
                        offset="100%"
                        stopColor="#3b82f6"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                    <linearGradient
                      id="colorPurchases"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
                      <stop
                        offset="100%"
                        stopColor="#f97316"
                        stopOpacity={0.05}
                      />
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
                        {value === 'sales' ? 'Sales' : 'Cost of Goods'}
                      </span>
                    )}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
