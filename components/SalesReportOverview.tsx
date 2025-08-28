'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, ShoppingCart, TrendingUp, Package } from 'lucide-react';
import { SalesOverviewData } from '@/types';
import { CustomDatePicker, DateRange } from './CustomDatePicker';
import { formatInTimeZone } from 'date-fns-tz';

interface SalesReportOverviewProps {
  salesData: {
    today: SalesOverviewData;
    week: SalesOverviewData;
    month: SalesOverviewData;
  };
  comprehensiveSalesData?: Array<SalesOverviewData & { date: string }>;
}

export const SalesReportOverview = ({
  salesData,
  comprehensiveSalesData = [],
}: SalesReportOverviewProps) => {
  const [selectedPeriod, setSelectedPeriod] = React.useState('today');
  const [customDateRange, setCustomDateRange] = React.useState<
    DateRange | undefined
  >();

  const getCurrentData = (): SalesOverviewData => {
    // If custom date range is selected, calculate from comprehensive data
    if (
      customDateRange?.from &&
      customDateRange?.to &&
      comprehensiveSalesData.length > 0
    ) {
      // Convert dates to Philippines timezone for comparison
      const startDate = formatInTimeZone(
        customDateRange.from,
        'Asia/Manila',
        'yyyy-MM-dd',
      );
      const endDate = formatInTimeZone(
        customDateRange.to,
        'Asia/Manila',
        'yyyy-MM-dd',
      );

      const filteredData = comprehensiveSalesData.filter(
        (item) => item.date >= startDate && item.date <= endDate,
      );

      if (filteredData.length === 0) {
        return {
          totalSales: 0,
          totalCost: 0,
          profit: 0,
          transactions: 0,
          totalItems: 0,
        };
      }

      // Aggregate the filtered data
      return filteredData.reduce(
        (acc, item) => ({
          totalSales: acc.totalSales + item.totalSales,
          totalCost: acc.totalCost + item.totalCost,
          profit: acc.profit + item.profit,
          transactions: acc.transactions + item.transactions,
          totalItems: acc.totalItems + item.totalItems,
        }),
        {
          totalSales: 0,
          totalCost: 0,
          profit: 0,
          transactions: 0,
          totalItems: 0,
        },
      );
    }

    switch (selectedPeriod) {
      case 'today':
        return salesData.today;
      case 'week':
        return salesData.week;
      case 'month':
        return salesData.month;
      default:
        return salesData.today;
    }
  };

  const handleQuickPeriod = (period: string) => {
    setSelectedPeriod(period);
    setCustomDateRange(undefined); // Clear custom range when using quick periods
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) {
      setSelectedPeriod(''); // Clear quick period when using custom range
    }
  };

  const currentData = getCurrentData();
  const profitMargin =
    currentData.totalSales > 0
      ? ((currentData.profit / currentData.totalSales) * 100).toFixed(1)
      : '0.0';

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'today':
        return 'Today';
      case 'week':
        return 'Week';
      case 'month':
        return 'Month';
      default:
        return 'Today';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section (no border) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Sales Overview</h3>
            <p className="text-sm text-muted-foreground">
              Key sales metrics and performance indicators
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <div className="flex bg-muted/50 rounded-lg p-1 gap-1">
            {['today', 'week', 'month'].map((period) => (
              <Button
                key={period}
                variant={
                  selectedPeriod === period && !customDateRange
                    ? 'default'
                    : 'ghost'
                }
                size="sm"
                onClick={() => handleQuickPeriod(period)}
                className="h-9 px-4 text-sm font-medium"
              >
                {getPeriodLabel(period)}
              </Button>
            ))}

            {/* Custom Date Range Picker */}
            <CustomDatePicker
              dateRange={customDateRange}
              onDateRangeChange={handleCustomDateChange}
            />
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Sales
                </p>
                <p className="text-2xl font-bold">
                  ₱
                  {currentData.totalSales.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getPeriodLabel(selectedPeriod)}
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Profit
                </p>
                <p className="text-2xl font-bold">
                  ₱
                  {currentData.profit.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {profitMargin}% margin
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Transactions
                </p>
                <p className="text-2xl font-bold">{currentData.transactions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed {getPeriodLabel(selectedPeriod).toLowerCase()}
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Items
                </p>
                <p className="text-2xl font-bold">{currentData.totalItems}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Items sold {getPeriodLabel(selectedPeriod).toLowerCase()}
                </p>
              </div>
              <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
