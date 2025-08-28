'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProductPerformanceData } from '@/types';
import { CustomDatePicker, DateRange } from './CustomDatePicker';
import { formatInTimeZone } from 'date-fns-tz';

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
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  // Get current data based on selected time period
  const getCurrentData = (): ProductPerformanceData[] => {
    // If custom date range is selected, calculate from comprehensive data
    if (
      customDateRange?.from &&
      customDateRange?.to &&
      comprehensiveProductData.length > 0
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

  // Reset pagination on filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [timePeriod, category, customDateRange]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(currentData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col space-y-2">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-lg font-semibold">
                  Product Performance
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Top-selling products and profitability
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="flex bg-muted/50 rounded-lg p-1 gap-1">
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
                    className="h-9 px-4 text-sm font-medium"
                  >
                    {period === 'week'
                      ? 'Week'
                      : period === 'month'
                      ? 'Month'
                      : 'Today'}
                  </Button>
                ))}

                <CustomDatePicker
                  dateRange={customDateRange}
                  onDateRangeChange={handleCustomDateChange}
                />
              </div>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 w-full sm:w-auto sm:min-w-[160px] text-sm px-3 py-2">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat === 'all' ? 'All' : cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left font-medium">Product</th>
                  <th className="py-3 px-4 text-left font-medium">Category</th>
                  <th className="py-3 px-4 text-right font-medium">Quantity</th>
                  <th className="py-3 px-4 text-right font-medium">Revenue</th>
                  <th className="py-3 px-4 text-right font-medium">Profit</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No products found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((product, index) => (
                    <tr
                      key={`${product.name}-${startIndex + index}`}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {startIndex + index + 1}.
                          </span>
                          <span className="font-medium">{product.name}</span>
                          <Badge variant="outline" className="text-xs h-5 ml-2">
                            {product.category}
                          </Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">{product.category}</td>
                      <td className="py-3 px-4 text-right">
                        {product.quantity}
                      </td>
                      <td className="py-3 px-4 text-right">
                        ₱
                        {product.revenue.toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        ₱
                        {product.profit.toLocaleString('en-PH', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                {currentData.length > 0 && (
                  <tr>
                    <td colSpan={5} className="py-2 px-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium">Rows per page</p>
                          <Select
                            value={`${itemsPerPage}`}
                            onValueChange={(value) =>
                              setItemsPerPage(Number(value))
                            }
                          >
                            <SelectTrigger className="h-8 w-[70px]">
                              <SelectValue placeholder={itemsPerPage} />
                            </SelectTrigger>
                            <SelectContent side="top">
                              {[10, 20, 30, 40, 50].map((pageSize) => (
                                <SelectItem
                                  key={pageSize}
                                  value={`${pageSize}`}
                                >
                                  {pageSize}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center space-x-6 lg:space-x-8">
                          <div className="flex w-[120px] items-center justify-center text-sm font-medium">
                            Page {currentPage} of {totalPages}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                setCurrentPage((p) => Math.max(1, p - 1))
                              }
                              disabled={currentPage === 1}
                            >
                              <span className="sr-only">
                                Go to previous page
                              </span>
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() =>
                                setCurrentPage((p) =>
                                  Math.min(totalPages, p + 1),
                                )
                              }
                              disabled={currentPage === totalPages}
                            >
                              <span className="sr-only">Go to next page</span>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
