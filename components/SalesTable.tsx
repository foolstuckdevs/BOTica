'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateRange } from './CustomDatePicker';
import {
  DateFilterComponent,
  type DateFilterRange,
} from '@/components/DateFilterComponent';
import { formatInTimeZone } from 'date-fns-tz';
import type { ProductPerformanceData } from '@/types';
import { TableExportMenu } from '@/components/TableExportMenu';
import { formatQuantityWithUnit, formatUnitLabel } from '@/lib/utils';

type Props = {
  comprehensiveProductData: Array<ProductPerformanceData & { date: string }>;
};

type SortColumn =
  | 'name'
  | 'category'
  | 'quantity'
  | 'avgPrice'
  | 'revenue'
  | 'cost'
  | 'profit';
type SortDirection = 'asc' | 'desc' | null;

export default function SalesTable({ comprehensiveProductData }: Props) {
  const [timePeriod, setTimePeriod] = React.useState<
    'today' | 'week' | 'month' | 'year' | 'custom'
  >('today');
  const [selectedDateRange, setSelectedDateRange] = React.useState<
    DateRange | undefined
  >();
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(20);
  const [sortColumn, setSortColumn] = React.useState<SortColumn>('quantity');
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>('desc');

  const handleQuickPeriod = (
    period: 'today' | 'week' | 'month' | 'year' | 'custom',
  ) => {
    setTimePeriod(period);
    if (period !== 'custom') {
      setSelectedDateRange(undefined);
    }
  };

  const handleDateRangeChange = (range: DateFilterRange | undefined) => {
    if (range?.from && range?.to) {
      setSelectedDateRange({ from: range.from, to: range.to });
    } else {
      setSelectedDateRange(undefined);
    }
  };

  const getBounds = () => {
    // Build Manila-local YYYY-MM-DD strings for comparison with data.date
    const now = new Date();
    const todayStr = formatInTimeZone(now, 'Asia/Manila', 'yyyy-MM-dd');

    if (selectedDateRange?.from && selectedDateRange?.to) {
      const fromStr = formatInTimeZone(
        selectedDateRange.from,
        'Asia/Manila',
        'yyyy-MM-dd',
      );
      const toStr = formatInTimeZone(
        selectedDateRange.to,
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
    if (timePeriod === 'year') {
      const start = new Date(now);
      start.setFullYear(start.getFullYear() - 1);
      return {
        from: formatInTimeZone(start, 'Asia/Manila', 'yyyy-MM-dd'),
        to: todayStr,
      };
    }
    // default today
    return { from: todayStr, to: todayStr };
  };

  const bounds = getBounds();
  const periodDescription = React.useMemo(() => {
    const parseToDate = (value?: Date | string) => {
      if (!value) return undefined;
      if (value instanceof Date) {
        return value;
      }
      return new Date(`${value}T00:00:00+08:00`);
    };

    const fromDate = selectedDateRange?.from ?? parseToDate(bounds.from);
    const toDate =
      selectedDateRange?.to ??
      selectedDateRange?.from ??
      parseToDate(bounds.to) ??
      parseToDate(bounds.from);

    if (!fromDate) {
      return 'Products sold for the selected period';
    }

    const resolvedToDate = toDate ?? fromDate;

    const todayStr = formatInTimeZone(new Date(), 'Asia/Manila', 'yyyy-MM-dd');
    const fromStr = formatInTimeZone(fromDate, 'Asia/Manila', 'yyyy-MM-dd');
    const toStr = formatInTimeZone(resolvedToDate, 'Asia/Manila', 'yyyy-MM-dd');
    const singleDay = fromStr === toStr;

    const fromLabel = formatInTimeZone(fromDate, 'Asia/Manila', 'MMM d, yyyy');
    const toLabel = formatInTimeZone(
      resolvedToDate,
      'Asia/Manila',
      'MMM d, yyyy',
    );

    if (singleDay) {
      if (fromStr === todayStr) {
        return `Products sold today (${fromLabel})`;
      }
      return `Products sold for ${fromLabel}`;
    }

    if (timePeriod === 'month') {
      const monthLabel = formatInTimeZone(fromDate, 'Asia/Manila', 'MMMM yyyy');
      return `Products sold for ${monthLabel}`;
    }

    if (timePeriod === 'year') {
      const yearLabel = formatInTimeZone(fromDate, 'Asia/Manila', 'yyyy');
      return `Products sold for ${yearLabel}`;
    }

    return `Products sold from ${fromLabel} to ${toLabel}`;
  }, [
    bounds.from,
    bounds.to,
    selectedDateRange?.from,
    selectedDateRange?.to,
    timePeriod,
  ]);
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
    const dataArray = Array.from(map.values());

    // Apply sorting
    if (sortDirection) {
      dataArray.sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        switch (sortColumn) {
          case 'name':
            aVal = a.name.toLowerCase();
            bVal = b.name.toLowerCase();
            break;
          case 'category':
            aVal = a.category.toLowerCase();
            bVal = b.category.toLowerCase();
            break;
          case 'quantity':
            aVal = a.quantity;
            bVal = b.quantity;
            break;
          case 'avgPrice':
            aVal = a.quantity > 0 ? a.revenue / a.quantity : 0;
            bVal = b.quantity > 0 ? b.revenue / b.quantity : 0;
            break;
          case 'revenue':
            aVal = a.revenue;
            bVal = b.revenue;
            break;
          case 'cost':
            aVal = a.revenue - a.profit;
            bVal = b.revenue - b.profit;
            break;
          case 'profit':
            aVal = a.profit;
            bVal = b.profit;
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        } else {
          return sortDirection === 'asc'
            ? (aVal as number) - (bVal as number)
            : (bVal as number) - (aVal as number);
        }
      });
    }

    return dataArray;
  }, [
    comprehensiveProductData,
    bounds.from,
    bounds.to,
    sortColumn,
    sortDirection,
  ]);

  // Reset pagination on filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [timePeriod, selectedDateRange, bounds.from, bounds.to]);

  // Handle column sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // Toggle through: desc -> asc -> null -> desc
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection(null);
        setSortColumn('quantity'); // Reset to default
      } else {
        setSortDirection('desc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Render sort icon
  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column || !sortDirection) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5 opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="ml-1 h-3.5 w-3.5" />
    );
  };

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(aggregated.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = aggregated.slice(startIndex, endIndex);

  // Build a more descriptive range label for export headers
  const rangeLabel = React.useMemo(() => {
    if (selectedDateRange?.from && selectedDateRange?.to) {
      return `${bounds.from} to ${bounds.to}`;
    }
    if (timePeriod === 'week')
      return `Last 7 days (${bounds.from} - ${bounds.to})`;
    if (timePeriod === 'month')
      return `Last 30 days (${bounds.from} - ${bounds.to})`;
    return `Today (${bounds.from})`;
  }, [
    selectedDateRange?.from,
    selectedDateRange?.to,
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
      unit: formatUnitLabel(p.unit, '-'),
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

  // DateFilterComponent handles its own state management and clear functionality

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-purple-600" />
            <div>
              <CardTitle className="text-lg font-semibold">Sales</CardTitle>
              <p className="text-sm text-muted-foreground">
                {periodDescription}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
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

            <DateFilterComponent
              period={timePeriod}
              onPeriodChange={handleQuickPeriod}
              dateRange={selectedDateRange}
              onDateRangeChange={handleDateRangeChange}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left font-medium">
                  <button
                    className="flex items-center hover:text-primary transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    Product
                    {renderSortIcon('name')}
                  </button>
                </th>
                <th className="py-3 px-4 text-left font-medium">
                  <button
                    className="flex items-center hover:text-primary transition-colors"
                    onClick={() => handleSort('category')}
                  >
                    Category
                    {renderSortIcon('category')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-medium">
                  <button
                    className="flex items-center ml-auto hover:text-primary transition-colors"
                    onClick={() => handleSort('quantity')}
                  >
                    Quantity
                    {renderSortIcon('quantity')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-medium">
                  <button
                    className="flex items-center ml-auto hover:text-primary transition-colors"
                    onClick={() => handleSort('avgPrice')}
                  >
                    Avg Price
                    {renderSortIcon('avgPrice')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-medium">
                  <button
                    className="flex items-center ml-auto hover:text-primary transition-colors"
                    onClick={() => handleSort('revenue')}
                  >
                    Revenue
                    {renderSortIcon('revenue')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-medium">
                  <button
                    className="flex items-center ml-auto hover:text-primary transition-colors"
                    onClick={() => handleSort('cost')}
                  >
                    Cost
                    {renderSortIcon('cost')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-medium">
                  <button
                    className="flex items-center ml-auto hover:text-primary transition-colors"
                    onClick={() => handleSort('profit')}
                  >
                    Profit
                    {renderSortIcon('profit')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {aggregated.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                      <td className="py-3 px-4 text-right font-medium">
                        {formatQuantityWithUnit(p.quantity, p.unit)}
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
                  <td colSpan={7} className="py-2 px-2">
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
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex items-center gap-1.5">
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
                          <div className="min-w-[68px] text-center text-xs text-muted-foreground">
                            {aggregated.length.toLocaleString('en-PH')}{' '}
                            {aggregated.length === 1 ? 'item' : 'items'}
                          </div>
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
