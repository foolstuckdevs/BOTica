'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Calendar,
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
import { formatInTimeZone } from 'date-fns-tz';
import type { SalesOverviewData } from '@/types';
import { TableExportMenu } from '@/components/TableExportMenu';
import DateFilterComponent, {
  type DateFilterRange,
  type FilterPeriod,
} from '@/components/DateFilterComponent';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';

const WEEK_START: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1;

function computeRangeForPeriod(
  period: FilterPeriod,
  referenceDate: Date = new Date(),
): DateFilterRange {
  const today = referenceDate;

  switch (period) {
    case 'today':
      return {
        from: startOfDay(today),
        to: endOfDay(today),
      };
    case 'week': {
      const start = startOfWeek(today, { weekStartsOn: WEEK_START });
      const end = endOfWeek(today, { weekStartsOn: WEEK_START });
      return { from: startOfDay(start), to: endOfDay(end) };
    }
    case 'month': {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      return { from: startOfDay(start), to: endOfDay(end) };
    }
    case 'year': {
      const start = startOfYear(today);
      const end = endOfYear(today);
      return { from: startOfDay(start), to: endOfDay(end) };
    }
    case 'custom':
    default:
      return {};
  }
}

type Props = {
  comprehensiveSalesData: Array<SalesOverviewData & { date: string }>;
};

type SortColumn =
  | 'date'
  | 'revenue'
  | 'cost'
  | 'profit'
  | 'margin'
  | 'transactions'
  | 'items';
type SortDirection = 'asc' | 'desc' | null;

export default function DailyBreakdownTable({ comprehensiveSalesData }: Props) {
  const [filterPeriod, setFilterPeriod] = React.useState<FilterPeriod>('month');
  const [selectedRange, setSelectedRange] = React.useState<DateFilterRange>(
    () => computeRangeForPeriod('month'),
  );
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(20);
  const [sortColumn, setSortColumn] = React.useState<SortColumn>('date');
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>('desc');
  const activeRange = React.useMemo(() => {
    if (selectedRange?.from && selectedRange?.to) {
      return selectedRange;
    }
    return computeRangeForPeriod(filterPeriod);
  }, [selectedRange, filterPeriod]);

  const bounds = React.useMemo(() => {
    const fallback = new Date();
    const fromDate = activeRange.from ?? fallback;
    const toDate = activeRange.to ?? fromDate;

    return {
      from: formatInTimeZone(fromDate, 'Asia/Manila', 'yyyy-MM-dd'),
      to: formatInTimeZone(toDate, 'Asia/Manila', 'yyyy-MM-dd'),
    };
  }, [activeRange]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [bounds.from, bounds.to]);

  // Filter and sort daily data
  const dailyData = React.useMemo(() => {
    const filtered = comprehensiveSalesData.filter(
      (d) => d.date >= bounds.from && d.date <= bounds.to,
    );

    // Sort the data
    if (sortDirection) {
      filtered.sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        switch (sortColumn) {
          case 'date':
            aVal = a.date;
            bVal = b.date;
            break;
          case 'revenue':
            aVal = a.totalSales;
            bVal = b.totalSales;
            break;
          case 'cost':
            aVal = a.totalCost;
            bVal = b.totalCost;
            break;
          case 'profit':
            aVal = a.profit;
            bVal = b.profit;
            break;
          case 'margin':
            aVal = a.totalSales > 0 ? (a.profit / a.totalSales) * 100 : 0;
            bVal = b.totalSales > 0 ? (b.profit / b.totalSales) * 100 : 0;
            break;
          case 'transactions':
            aVal = a.transactions;
            bVal = b.transactions;
            break;
          case 'items':
            aVal = a.totalItems;
            bVal = b.totalItems;
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

    return filtered;
  }, [
    comprehensiveSalesData,
    bounds.from,
    bounds.to,
    sortColumn,
    sortDirection,
  ]);

  // Handle column sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortDirection(null);
        setSortColumn('date');
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
  const totalPages = Math.max(1, Math.ceil(dailyData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = dailyData.slice(startIndex, endIndex);

  // Build a descriptive range label for export headers
  const rangeLabel = React.useMemo(() => {
    const fromDate = activeRange.from;
    const toDate = activeRange.to ?? activeRange.from;

    if (!fromDate) {
      return 'No range selected';
    }

    const endDate = toDate ?? fromDate;

    switch (filterPeriod) {
      case 'today':
        return format(fromDate, 'MMMM d, yyyy');
      case 'week':
      case 'custom':
        if (!endDate) return format(fromDate, 'MMMM d, yyyy');
        return `${format(fromDate, 'MMMM d, yyyy')} – ${format(
          endDate,
          'MMMM d, yyyy',
        )}`;
      case 'month':
        return format(fromDate, 'MMMM yyyy');
      case 'year':
        return format(fromDate, 'yyyy');
      default:
        return `${format(fromDate, 'MMMM d, yyyy')} – ${format(
          endDate,
          'MMMM d, yyyy',
        )}`;
    }
  }, [activeRange, filterPeriod]);

  // Build export rows
  const exportRows = dailyData.map((d) => {
    const marginPercent =
      d.totalSales > 0 ? (d.profit / d.totalSales) * 100 : 0;
    return {
      date: d.date,
      revenue: d.totalSales,
      cost: d.totalCost,
      profit: d.profit,
      margin: marginPercent,
      transactions: d.transactions,
      items: d.totalItems,
    };
  });

  // Totals row for export
  const totals = React.useMemo(() => {
    return exportRows.reduce(
      (acc, r) => {
        acc.revenue += (r.revenue as number) || 0;
        acc.cost += (r.cost as number) || 0;
        acc.profit += (r.profit as number) || 0;
        acc.transactions += (r.transactions as number) || 0;
        acc.items += (r.items as number) || 0;
        return acc;
      },
      { revenue: 0, cost: 0, profit: 0, transactions: 0, items: 0 },
    );
  }, [exportRows]);

  const totalRow = React.useMemo(() => {
    const marginPercent =
      totals.revenue > 0 ? (totals.profit / totals.revenue) * 100 : 0;
    return {
      date: 'TOTAL',
      revenue: totals.revenue,
      cost: totals.cost,
      profit: totals.profit,
      margin: marginPercent,
      transactions: totals.transactions,
      items: totals.items,
    };
  }, [totals]);

  const exportRowsWithTotals = React.useMemo(
    () => [...exportRows, totalRow],
    [exportRows, totalRow],
  );

  const tableExportColumns = [
    { header: 'Date', key: 'date' },
    { header: 'Revenue', key: 'revenue', currency: true },
    { header: 'Cost', key: 'cost', currency: true },
    { header: 'Profit', key: 'profit', currency: true },
    { header: 'Margin %', key: 'margin', numeric: true },
    { header: 'Transactions', key: 'transactions', numeric: true },
    { header: 'Items Sold', key: 'items', numeric: true },
  ];

  return (
    <Card>
      <CardHeader className="py-3">
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-orange-600" />
            <div>
              <CardTitle className="text-lg font-semibold">
                Daily Breakdown
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Daily revenue, cost, and profit metrics
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TableExportMenu
              title="Daily Sales Breakdown"
              subtitle="Daily revenue, cost, profit and transaction metrics"
              dynamicSubtitle={`Period: ${rangeLabel}`}
              filenameBase="daily-breakdown"
              columns={tableExportColumns}
              rows={
                exportRowsWithTotals as unknown as Record<string, unknown>[]
              }
            />
            <DateFilterComponent
              period={filterPeriod}
              dateRange={selectedRange}
              onPeriodChange={(period) => setFilterPeriod(period)}
              onDateRangeChange={(range) => setSelectedRange(range)}
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
                    onClick={() => handleSort('date')}
                  >
                    Date
                    {renderSortIcon('date')}
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
                <th className="py-3 px-4 text-right font-medium">
                  <button
                    className="flex items-center ml-auto hover:text-primary transition-colors"
                    onClick={() => handleSort('margin')}
                  >
                    Margin %{renderSortIcon('margin')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-medium">
                  <button
                    className="flex items-center ml-auto hover:text-primary transition-colors"
                    onClick={() => handleSort('transactions')}
                  >
                    Transactions
                    {renderSortIcon('transactions')}
                  </button>
                </th>
                <th className="py-3 px-4 text-right font-medium">
                  <button
                    className="flex items-center ml-auto hover:text-primary transition-colors"
                    onClick={() => handleSort('items')}
                  >
                    Items Sold
                    {renderSortIcon('items')}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {dailyData.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No data available for the selected period.
                  </td>
                </tr>
              ) : (
                paginatedData.map((d) => {
                  const marginPercent =
                    d.totalSales > 0 ? (d.profit / d.totalSales) * 100 : 0;
                  const [year, month, day] = d.date.split('-');
                  const displayDate = format(
                    new Date(Number(year), Number(month) - 1, Number(day)),
                    'MMM d yyyy',
                  );
                  return (
                    <tr
                      key={d.date}
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">{displayDate}</td>
                      <td className="py-3 px-4 text-right">
                        {d.totalSales.toLocaleString('en-PH', {
                          style: 'currency',
                          currency: 'PHP',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {d.totalCost.toLocaleString('en-PH', {
                          style: 'currency',
                          currency: 'PHP',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {d.profit.toLocaleString('en-PH', {
                          style: 'currency',
                          currency: 'PHP',
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {marginPercent.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right">{d.transactions}</td>
                      <td className="py-3 px-4 text-right">{d.totalItems}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {dailyData.length > 0 && (
              <tfoot>
                <tr className="bg-muted/50 font-semibold">
                  <td className="py-3 px-4">TOTAL</td>
                  <td className="py-3 px-4 text-right">
                    {totals.revenue.toLocaleString('en-PH', {
                      style: 'currency',
                      currency: 'PHP',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {totals.cost.toLocaleString('en-PH', {
                      style: 'currency',
                      currency: 'PHP',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {totals.profit.toLocaleString('en-PH', {
                      style: 'currency',
                      currency: 'PHP',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {totalRow.margin.toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right">
                    {totals.transactions}
                  </td>
                  <td className="py-3 px-4 text-right">{totals.items}</td>
                </tr>
                <tr>
                  <td colSpan={7} className="py-0">
                    <div className="h-px w-full bg-border" />
                  </td>
                </tr>
                <tr>
                  <td colSpan={7} className="py-2 px-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium">Rows per page</p>
                        <Select
                          value={`${itemsPerPage}`}
                          onValueChange={(value) => {
                            setItemsPerPage(Number(value));
                            setCurrentPage(1);
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
                            {dailyData.length.toLocaleString('en-PH')}{' '}
                            {dailyData.length === 1 ? 'item' : 'items'}
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
