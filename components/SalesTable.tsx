'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Filter,
  ShoppingCart,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CustomDatePicker, DateRange } from './CustomDatePicker';
import { formatInTimeZone } from 'date-fns-tz';
import type { ProductPerformanceData } from '@/types';
import { TableExportMenu } from '@/components/TableExportMenu';

type Props = {
  comprehensiveProductData: Array<ProductPerformanceData & { date: string }>;
};

export default function SalesTable({ comprehensiveProductData }: Props) {
  const [timePeriod, setTimePeriod] = React.useState<
    'today' | 'week' | 'month' | ''
  >('today');
  const [customDateRange, setCustomDateRange] = React.useState<
    DateRange | undefined
  >();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  const handleQuickPeriod = (period: 'today' | 'week' | 'month') => {
    setTimePeriod(period);
    setCustomDateRange(undefined);
  };

  const handleCustomDateChange = (range: DateRange | undefined) => {
    setCustomDateRange(range);
    if (range?.from && range?.to) setTimePeriod('');
  };

  const getBounds = () => {
    // Build Manila-local YYYY-MM-DD strings for comparison with data.date
    const now = new Date();
    const todayStr = formatInTimeZone(now, 'Asia/Manila', 'yyyy-MM-dd');

    if (customDateRange?.from && customDateRange?.to) {
      const fromStr = formatInTimeZone(
        customDateRange.from,
        'Asia/Manila',
        'yyyy-MM-dd',
      );
      const toStr = formatInTimeZone(
        customDateRange.to,
        'Asia/Manila',
        'yyyy-MM-dd',
      );
      return { from: fromStr, to: toStr };
    }

    if (timePeriod === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return {
        from: formatInTimeZone(start, 'Asia/Manila', 'yyyy-MM-dd'),
        to: todayStr,
      };
    }
    if (timePeriod === 'month') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      return {
        from: formatInTimeZone(start, 'Asia/Manila', 'yyyy-MM-dd'),
        to: todayStr,
      };
    }
    // default today
    return { from: todayStr, to: todayStr };
  };

  const bounds = getBounds();
  // Filter by date bounds then aggregate by product name + brand
  const aggregated = React.useMemo(() => {
    const within = comprehensiveProductData.filter(
      (d) => d.date >= bounds.from && d.date <= bounds.to,
    );
    const map = new Map<string, ProductPerformanceData>();
    for (const item of within) {
      const key = `${item.name}__${item.brandName ?? ''}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.revenue;
        existing.profit += item.profit;
      } else {
        map.set(key, {
          name: item.name,
          brandName: item.brandName,
          category: item.category,
          quantity: item.quantity,
          revenue: item.revenue,
          profit: item.profit,
          unit: item.unit,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
  }, [comprehensiveProductData, bounds.from, bounds.to]);

  // Reset pagination on filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [timePeriod, customDateRange, bounds.from, bounds.to]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(aggregated.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = aggregated.slice(startIndex, endIndex);

  // Build a more descriptive range label for export headers
  const rangeLabel = React.useMemo(() => {
    if (customDateRange?.from && customDateRange?.to) {
      return `${bounds.from} to ${bounds.to}`;
    }
    if (timePeriod === 'week')
      return `Last 7 days (${bounds.from} - ${bounds.to})`;
    if (timePeriod === 'month')
      return `Last 30 days (${bounds.from} - ${bounds.to})`;
    return `Today (${bounds.from})`;
  }, [
    customDateRange?.from,
    customDateRange?.to,
    bounds.from,
    bounds.to,
    timePeriod,
  ]);

  // Build export rows for current filtered aggregate (not just current page)
  const exportRows = aggregated.map((p) => {
    const cost = p.revenue - p.profit;
    const avgPrice = p.quantity > 0 ? p.revenue / p.quantity : 0;
    return {
      name: p.name + (p.brandName ? ` (${p.brandName})` : ''),
      category: p.category,
      unit: p.unit ?? '-',
      quantity: p.quantity,
      avgPrice,
      revenue: p.revenue,
      cost,
      profit: p.profit,
    };
  });

  // Totals row for export (not shown in on-screen table)
  const totals = React.useMemo(() => {
    return exportRows.reduce(
      (acc, r) => {
        acc.quantity += (r.quantity as number) || 0;
        acc.revenue += (r.revenue as number) || 0;
        acc.cost += (r.cost as number) || 0;
        acc.profit += (r.profit as number) || 0;
        return acc;
      },
      { quantity: 0, revenue: 0, cost: 0, profit: 0 },
    );
  }, [exportRows]);

  const totalRow = React.useMemo(() => {
    const avgPrice = totals.quantity > 0 ? totals.revenue / totals.quantity : 0;
    return {
      name: 'TOTAL',
      category: '',
      unit: '',
      quantity: totals.quantity,
      avgPrice,
      revenue: totals.revenue,
      cost: totals.cost,
      profit: totals.profit,
    };
  }, [totals]);

  const exportRowsWithTotals = React.useMemo(
    () => [...exportRows, totalRow],
    [exportRows, totalRow],
  );

  const tableExportColumns = [
    { header: 'Product', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Unit', key: 'unit' },
    { header: 'Qty', key: 'quantity', numeric: true },
    { header: 'Avg Price', key: 'avgPrice', currency: true },
    { header: 'Revenue', key: 'revenue', currency: true },
    { header: 'Cost', key: 'cost', currency: true },
    { header: 'Profit', key: 'profit', currency: true },
  ];

  // ...rest of component uses onExportPDF/onExportExcel in the dropdown

  const hasActiveFilters =
    timePeriod !== 'today' || !!(customDateRange?.from && customDateRange?.to);
  const clearAllFilters = () => {
    setTimePeriod('today');
    setCustomDateRange(undefined);
  };

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-purple-600" />
            <div>
              <CardTitle className="text-lg font-semibold">Sales</CardTitle>
              <p className="text-sm text-muted-foreground">
                Products sold for the selected period
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TableExportMenu
              title="Sales by Product"
              subtitle="Includes totals for Quantity, Revenue, Cost & Profit"
              dynamicSubtitle={`Period: ${rangeLabel}`}
              filenameBase="sales-by-product"
              columns={tableExportColumns}
              rows={
                exportRowsWithTotals as unknown as Record<string, unknown>[]
              }
            />

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
                      {(['today', 'week', 'month'] as const).map((period) => (
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
                    <CustomDatePicker
                      dateRange={customDateRange}
                      onDateRangeChange={handleCustomDateChange}
                      buttonClassName="h-8 px-2.5 text-xs"
                    />
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
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left font-medium">Product</th>
                <th className="py-3 px-4 text-left font-medium">Category</th>
                <th className="py-3 px-4 text-left font-medium">Unit</th>
                <th className="py-3 px-4 text-right font-medium">Quantity</th>
                <th className="py-3 px-4 text-right font-medium">Avg Price</th>
                <th className="py-3 px-4 text-right font-medium">Revenue</th>
                <th className="py-3 px-4 text-right font-medium">Cost</th>
                <th className="py-3 px-4 text-right font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {aggregated.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No products found for the selected filters.
                  </td>
                </tr>
              ) : (
                paginatedData.map((p, idx) => {
                  const cost = p.revenue - p.profit;
                  const avgPrice = p.quantity > 0 ? p.revenue / p.quantity : 0;
                  return (
                    <tr
                      key={`${p.name}-${idx}`}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span>{p.name}</span>
                          {p.brandName ? (
                            <span className="text-xs text-muted-foreground">
                              {p.brandName}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-4">{p.category}</td>
                      <td className="py-3 px-4">{p.unit ?? '-'}</td>
                      <td className="py-3 px-4 text-right font-medium">
                        {p.quantity}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {avgPrice.toLocaleString('en-PH', {
                          style: 'currency',
                          currency: 'PHP',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.revenue.toLocaleString('en-PH', {
                          style: 'currency',
                          currency: 'PHP',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {cost.toLocaleString('en-PH', {
                          style: 'currency',
                          currency: 'PHP',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {p.profit.toLocaleString('en-PH', {
                          style: 'currency',
                          currency: 'PHP',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {aggregated.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={8} className="py-2 px-2">
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
}
