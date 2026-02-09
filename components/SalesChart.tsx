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
import { Calendar, Loader2 } from 'lucide-react';
import useIsMobile from '@/hooks/use-mobile';
import { ChartDataPoint } from '@/types';
import { CustomDatePicker, DateRange } from './CustomDatePicker';
import { formatInTimeZone } from 'date-fns-tz';
import { addDays } from 'date-fns';
import { getChartDataByRange } from '@/lib/actions/dashboard';

interface SalesChartProps {
  chartData: ChartDataPoint[];
  pharmacyId: number;
  loading?: boolean;
}

export function SalesChart({ chartData, pharmacyId, loading = false }: SalesChartProps) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = React.useState('30d');
  const [customDateRange, setCustomDateRange] = React.useState<
    DateRange | undefined
  >();
  // Holds server-fetched data for custom date ranges
  const [customData, setCustomData] = React.useState<ChartDataPoint[] | null>(null);
  const [customLoading, setCustomLoading] = React.useState(false);

  const toManilaDate = React.useCallback((dateStr: string) => {
    return new Date(`${dateStr}T00:00:00+08:00`);
  }, []);

  const formatDateLabel = React.useCallback(
    (dateStr: string, pattern: string = 'MMM d, yyyy') => {
      return formatInTimeZone(toManilaDate(dateStr), 'Asia/Manila', pattern);
    },
    [toManilaDate],
  );

  React.useEffect(() => {
    if (isMobile) setTimeRange('7d');
  }, [isMobile]);

  // Fetch data from server when a custom date range is fully selected
  React.useEffect(() => {
    if (!customDateRange?.from || !customDateRange?.to) {
      setCustomData(null);
      return;
    }

    let cancelled = false;
    const fromStr = formatInTimeZone(customDateRange.from, 'Asia/Manila', 'yyyy-MM-dd');
    const toStr = formatInTimeZone(customDateRange.to, 'Asia/Manila', 'yyyy-MM-dd');

    setCustomLoading(true);
    getChartDataByRange(pharmacyId, fromStr, toStr)
      .then((data) => {
        if (!cancelled) {
          setCustomData(data);
          setCustomLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCustomData([]);
          setCustomLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customDateRange, pharmacyId]);

  // Build chart display data: use server-fetched custom data, or slice from the prop for quick filters
  const filteredData = React.useMemo(() => {
    // Custom range — use server-fetched data
    if (customDateRange?.from && customDateRange?.to && customData) {
      return [...customData].sort((a, b) => a.date.localeCompare(b.date));
    }

    // Quick filter (7d / 30d) — slice from the pre-loaded prop data
    const days = timeRange === '7d' ? 7 : 30;
    const now = new Date();
    const todayStr = formatInTimeZone(now, 'Asia/Manila', 'yyyy-MM-dd');
    const cutoff = addDays(toManilaDate(todayStr), -days);
    const cutoffStr = formatInTimeZone(cutoff, 'Asia/Manila', 'yyyy-MM-dd');

    const dataMap = new Map(chartData.map((item) => [item.date, item]));
    const range: ChartDataPoint[] = [];
    for (
      let cursor = new Date(toManilaDate(cutoffStr));
      cursor <= toManilaDate(todayStr);
      cursor = addDays(cursor, 1)
    ) {
      const key = formatInTimeZone(cursor, 'Asia/Manila', 'yyyy-MM-dd');
      const existing = dataMap.get(key);
      range.push(
        existing ?? {
          date: key,
          sales: 0,
          purchases: 0,
          grossProfit: 0,
          transactionCount: 0,
        },
      );
    }

    range.sort((a, b) => a.date.localeCompare(b.date));
    return range;
  }, [chartData, timeRange, customDateRange, customData, toManilaDate]);

  const handleQuickFilter = (range: string) => {
    setTimeRange(range);
    setCustomDateRange(undefined);
    setCustomData(null);
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) {
      setTimeRange('');
    }
  };

  const getActiveFilterDescription = () => {
    if (customDateRange?.from && customDateRange?.to) {
      const fromDate = formatDateLabel(
        formatInTimeZone(customDateRange.from, 'Asia/Manila', 'yyyy-MM-dd'),
      );
      const toDate = formatDateLabel(
        formatInTimeZone(customDateRange.to, 'Asia/Manila', 'yyyy-MM-dd'),
      );
      return `${fromDate} - ${toDate}`;
    }
    return `Revenue vs. purchase costs over the last ${
      timeRange === '7d' ? '7' : '30'
    } days`;
  };

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
    formatDateLabel(date, 'MMM d');

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-semibold">
              Sales Performance
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {getActiveFilterDescription()}
            </CardDescription>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Combined Filter Controls */}
            <div className="flex bg-muted rounded-lg p-1 gap-1">
              <Button
                variant={
                  timeRange === '7d' && !customDateRange ? 'default' : 'ghost'
                }
                size="sm"
                onClick={() => handleQuickFilter('7d')}
                className="h-8 px-3"
              >
                <Calendar className="w-3 h-3 mr-1" />7 Days
              </Button>
              <Button
                variant={
                  timeRange === '30d' && !customDateRange ? 'default' : 'ghost'
                }
                size="sm"
                onClick={() => handleQuickFilter('30d')}
                className="h-8 px-3"
              >
                <Calendar className="w-3 h-3 mr-1" />
                30 Days
              </Button>

              {/* Custom Date Range Picker */}
              <CustomDatePicker
                dateRange={customDateRange}
                onDateRangeChange={handleCustomDateChange}
              />
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading || customLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
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
                    tickFormatter={(v) => {
                      if (v >= 1000000) {
                        return `₱${(v / 1000000).toFixed(1)}M`;
                      } else if (v >= 1000) {
                        return `₱${(v / 1000).toFixed(0)}K`;
                      } else {
                        return `₱${v.toFixed(0)}`;
                      }
                    }}
                    tick={{ fontSize: 12 }}
                    width={60}
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
                      `Date: ${formatDateLabel(label as string, 'MMM d, yyyy')}`
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
