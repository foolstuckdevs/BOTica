'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import useIsMobile from '@/hooks/use-mobile';

// Define types for our chart data
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
    if (isMobile) {
      setTimeRange('7d');
    }
  }, [isMobile]);

  // Calculate filtered data and metrics
  const {
    filteredData,
    totalSales,
    totalPurchases,
    grossProfit,
    profitMargin,
  } = React.useMemo(() => {
    const filtered = chartData.filter((item) => {
      const date = new Date(item.date);
      const referenceDate = new Date('2024-06-30');
      let daysToSubtract = 90;

      if (timeRange === '30d') daysToSubtract = 30;
      else if (timeRange === '7d') daysToSubtract = 7;

      const startDate = new Date(referenceDate);
      startDate.setDate(startDate.getDate() - daysToSubtract);
      return date >= startDate;
    });

    const sales = filtered.reduce((sum, item) => sum + item.sales, 0);
    const purchases = filtered.reduce((sum, item) => sum + item.purchases, 0);
    const profit = sales - purchases;
    const margin = sales > 0 ? ((profit / sales) * 100).toFixed(1) : '0';

    return {
      filteredData: filtered,
      totalSales: sales,
      totalPurchases: purchases,
      grossProfit: profit,
      profitMargin: margin,
    };
  }, [timeRange]);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  // Format date for XAxis
  const formatXAxis = (date: string) => {
    return new Date(date).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="relative">
        <div className="flex flex-col space-y-1.5">
          <CardTitle>Sales vs Purchases</CardTitle>
          <CardDescription>
            Track daily sales revenue against purchase costs
          </CardDescription>
        </div>

        {/* Time range selector */}
        <div className="absolute right-4 top-4">
          {isMobile ? (
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={setTimeRange}
              variant="outline"
              size="sm"
            >
              <ToggleGroupItem value="7d">7d</ToggleGroupItem>
              <ToggleGroupItem value="30d">30d</ToggleGroupItem>
              <ToggleGroupItem value="90d">3mo</ToggleGroupItem>
            </ToggleGroup>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {/* Summary stats */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-sm">Sales: {formatCurrency(totalSales)}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-orange-500 rounded-full mr-2"></div>
            <span className="text-sm">
              Purchases: {formatCurrency(totalPurchases)}
            </span>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium">
              Profit: {formatCurrency(grossProfit)} ({profitMargin}%)
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                tick={{ fontSize: 12 }}
                tickMargin={10}
              />
              <YAxis
                tickFormatter={(value) => `₱${value / 1000}k`}
                tick={{ fontSize: 12 }}
                width={40}
              />
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f3f4f6"
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorSales)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="purchases"
                stroke="#f97316"
                fillOpacity={1}
                fill="url(#colorPurchases)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
