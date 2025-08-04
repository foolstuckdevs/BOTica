'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { ProductPerformanceData } from '@/types';
import { CustomDatePicker, DateRange } from './CustomDatePicker';

interface ProductPerformanceTableProps {
  productData: {
    today: ProductPerformanceData[];
    week: ProductPerformanceData[];
    month: ProductPerformanceData[];
  };
  comprehensiveProductData?: Array<ProductPerformanceData & { date: string }>;
}

export const ProductPerformanceTable = ({
  productData,
  comprehensiveProductData = [],
}: ProductPerformanceTableProps) => {
  const [timePeriod, setTimePeriod] = React.useState('today');
  const [category, setCategory] = React.useState('all');
  const [customDateRange, setCustomDateRange] = React.useState<
    DateRange | undefined
  >();

  // Get current data based on selected time period
  const getCurrentData = (): ProductPerformanceData[] => {
    // If custom date range is selected, calculate from comprehensive data
    if (
      customDateRange?.from &&
      customDateRange?.to &&
      comprehensiveProductData.length > 0
    ) {
      const startDate = customDateRange.from.toISOString().split('T')[0];
      const endDate = customDateRange.to.toISOString().split('T')[0];

      const filteredData = comprehensiveProductData.filter(
        (item) => item.date >= startDate && item.date <= endDate,
      );

      // Group by product name and aggregate
      const productMap = new Map<string, ProductPerformanceData>();

      filteredData.forEach((item) => {
        const existing = productMap.get(item.name);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.revenue;
          existing.profit += item.profit;
        } else {
          productMap.set(item.name, {
            name: item.name,
            category: item.category,
            quantity: item.quantity,
            revenue: item.revenue,
            profit: item.profit,
          });
        }
      });

      return Array.from(productMap.values()).sort(
        (a, b) => b.quantity - a.quantity,
      );
    }

    switch (timePeriod) {
      case 'today':
        return productData.today;
      case 'week':
        return productData.week;
      case 'month':
        return productData.month;
      default:
        return productData.today;
    }
  };

  const handleQuickPeriod = (period: string) => {
    setTimePeriod(period);
    setCustomDateRange(undefined); // Clear custom range when using quick periods
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) {
      setTimePeriod(''); // Clear quick period when using custom range
    }
  };

  // Get unique categories from the data
  const getCategories = () => {
    const allData = [
      ...productData.today,
      ...productData.week,
      ...productData.month,
      ...comprehensiveProductData,
    ];
    const uniqueCategories = [...new Set(allData.map((item) => item.category))];
    return ['all', ...uniqueCategories];
  };

  const categories = getCategories();
  let currentData = getCurrentData();

  // Filter by category
  if (category !== 'all') {
    currentData = currentData.filter(
      (product) => product.category === category,
    );
  }

  // Sort by quantity (most sold first)
  currentData = [...currentData].sort((a, b) => b.quantity - a.quantity);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-muted-foreground" />
            Product Performance Analysis
          </CardTitle>

          {/* Clean Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {/* Time Period with Custom Date Picker */}
            <div className="flex bg-muted rounded-lg p-1 gap-1">
              {['today', 'week', 'month'].map((period) => (
                <Button
                  key={period}
                  variant={
                    timePeriod === period && !customDateRange
                      ? 'default'
                      : 'ghost'
                  }
                  size="sm"
                  onClick={() => handleQuickPeriod(period)}
                  className="h-8 px-3 text-sm"
                >
                  {period === 'week'
                    ? 'Week'
                    : period === 'month'
                    ? 'Month'
                    : 'Today'}
                </Button>
              ))}

              {/* Custom Date Range Picker */}
              <CustomDatePicker
                dateRange={customDateRange}
                onDateRangeChange={handleCustomDateChange}
              />
            </div>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8 px-3 text-sm border rounded-md bg-background"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {currentData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No products found for the selected filters.</p>
          </div>
        ) : (
          <>
            {/* Simple Product List - Top 5 */}
            <div className="space-y-3">
              {currentData.slice(0, 5).map((product, index) => (
                <div
                  key={`${product.name}-${index}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Left Side - Rank & Product Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : index === 1
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          : index === 2
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-1">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs h-5">
                          {product.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {product.quantity} units sold
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Revenue */}
                  <div className="text-right">
                    <p className="font-semibold">
                      ₱{product.revenue.toLocaleString('en-PH')}
                    </p>
                    <p className="text-xs text-green-600">
                      ₱{product.profit.toLocaleString('en-PH')} profit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
