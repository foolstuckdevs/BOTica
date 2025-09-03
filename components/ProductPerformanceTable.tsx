'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Filter,
  X,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ProductPerformanceData } from '@/types';
import { CustomDatePicker, DateRange } from './CustomDatePicker';
import { formatInTimeZone } from 'date-fns-tz';
import {
  exportToExcel,
  exportToPDF,
  exportFormatters,
  type ExportTable,
} from '@/lib/exporters';

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

  // Build export data from current filtered dataset (not paginated)
  const buildExport = (): ExportTable[] => {
    const columns = [
      { header: 'Product', key: 'name' },
      { header: 'Category', key: 'category' },
      { header: 'Quantity', key: 'quantity' },
      {
        header: 'Revenue',
        key: 'revenue',
        formatter: (v: unknown) => exportFormatters.phpCurrency(v),
      },
      {
        header: 'Profit',
        key: 'profit',
        formatter: (v: unknown) => exportFormatters.phpCurrency(v),
      },
    ];
    const rows = currentData.map((p) => ({
      name: p.name,
      category: p.category,
      quantity: p.quantity,
      revenue: p.revenue,
      profit: p.profit,
    }));
    return [
      {
        name: 'Product Performance',
        columns,
        rows,
      },
    ];
  };

  const subtitle = (() => {
    if (customDateRange?.from && customDateRange?.to) {
      const from = formatInTimeZone(
        customDateRange.from,
        'Asia/Manila',
        'yyyy-MM-dd',
      );
      const to = formatInTimeZone(
        customDateRange.to,
        'Asia/Manila',
        'yyyy-MM-dd',
      );
      return `Custom range: ${from} to ${to}`;
    }
    const label =
      timePeriod === 'week'
        ? 'This week'
        : timePeriod === 'month'
        ? 'This month'
        : 'Today';
    return `${label}${category !== 'all' ? ` · Category: ${category}` : ''}`;
  })();

  const onExportPDF = () =>
    exportToPDF({
      title: 'Product Performance',
      subtitle,
      tables: buildExport(),
      filename: 'product-performance.pdf',
      orientation: 'landscape',
    });
  const onExportExcel = () =>
    exportToExcel({
      filename: 'product-performance.xlsx',
      sheets: buildExport(),
    });
  const hasActiveFilters =
    (timePeriod !== 'today' && !customDateRange) ||
    !!(customDateRange?.from && customDateRange?.to) ||
    category !== 'all';

  const clearAllFilters = () => {
    setTimePeriod('today');
    setCustomDateRange(undefined);
    setCategory('all');
  };

  return (
    <Card>
      <CardHeader className="py-3">
        {/* Row: Title left, Export + Filters right */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg font-semibold">
                Product Performance
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Top-selling products and profitability metrics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2.5">
                  <FileDown className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onExportPDF}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={onExportExcel}>
                  Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 px-2.5">
                  <Filter className="w-4 h-4 mr-2" />
                  Filters
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Time
                    </p>
                    <div className="inline-flex bg-muted/50 rounded-md p-0 gap-0">
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
                          className="h-8 px-2.5 text-xs"
                        >
                          {period === 'week'
                            ? 'Week'
                            : period === 'month'
                            ? 'Month'
                            : 'Today'}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs font-medium text-muted-foreground mt-2 mb-1">
                      Custom range
                    </p>
                    <div>
                      <CustomDatePicker
                        dateRange={customDateRange}
                        onDateRangeChange={handleCustomDateChange}
                        buttonClassName="h-8 px-2.5 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Category
                    </p>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-8 w-full text-xs px-2 py-1">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat === 'all' ? 'All Categories' : cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {hasActiveFilters && (
                    <div className="pt-2 border-t">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearAllFilters}
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground w-full"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear filters
                      </Button>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {/* Filters moved into popover for a minimal header */}
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
                    <td className="py-3 px-4">{product.name}</td>
                    <td className="py-3 px-4">{product.category}</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {product.quantity}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {product.revenue.toLocaleString('en-PH', {
                        style: 'currency',
                        currency: 'PHP',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {product.profit.toLocaleString('en-PH', {
                        style: 'currency',
                        currency: 'PHP',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {currentData.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={5} className="py-2 px-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <Select
                          value={`${itemsPerPage}`}
                          onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                          }}
                        >
                          <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue placeholder={itemsPerPage} />
                          </SelectTrigger>
                          <SelectContent side="top">
                            {[10, 20, 30, 40, 50].map((pageSize) => (
                              <SelectItem key={pageSize} value={`${pageSize}`}>
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
                            <span className="sr-only">Go to previous page</span>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            className="h-8 w-8 p-0"
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
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
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
