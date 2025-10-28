'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
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
import { ProductPerformanceData } from '@/types';
import { TableExportMenu } from '@/components/TableExportMenu';
import { buildFilterSubtitle } from '@/lib/filterSubtitle';
import { formatInTimeZone } from 'date-fns-tz';
import DateFilterComponent, {
  type DateFilterRange,
  type FilterPeriod,
} from '@/components/filters/DateFilterComponent';
import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
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
      return { from: startOfDay(today), to: endOfDay(today) };
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

function rangesMatch(a: DateFilterRange, b: DateFilterRange) {
  const fromMatch =
    (!a.from && !b.from) || (a.from && b.from && isSameDay(a.from, b.from));
  const toMatch = (!a.to && !b.to) || (a.to && b.to && isSameDay(a.to, b.to));
  return fromMatch && toMatch;
}
// Export temporarily disabled for this report

interface ProductPerformanceTableProps {
  productData: {
    today: ProductPerformanceData[];
    week: ProductPerformanceData[];
    month: ProductPerformanceData[];
  };
  comprehensiveProductData?: Array<ProductPerformanceData & { date: string }>;
}

type SortColumn = 'name' | 'category' | 'quantity' | 'revenue' | 'profit';
type SortDirection = 'asc' | 'desc' | null;

export const ProductPerformanceTable = ({
  productData,
  comprehensiveProductData = [],
}: ProductPerformanceTableProps) => {
  const [filterPeriod, setFilterPeriod] = React.useState<FilterPeriod>('today');
  const [selectedRange, setSelectedRange] = React.useState<DateFilterRange>(
    () => computeRangeForPeriod('today'),
  );
  const [category, setCategory] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(20);
  const [sortColumn, setSortColumn] = React.useState<SortColumn>('quantity');
  const [sortDirection, setSortDirection] =
    React.useState<SortDirection>('desc');

  const activeRange = React.useMemo(() => {
    if (selectedRange?.from && selectedRange?.to) {
      return selectedRange;
    }
    return computeRangeForPeriod(filterPeriod);
  }, [selectedRange, filterPeriod]);

  const bounds = React.useMemo(() => {
    if (!activeRange.from || !activeRange.to) {
      return undefined;
    }

    return {
      from: formatInTimeZone(activeRange.from, 'Asia/Manila', 'yyyy-MM-dd'),
      to: formatInTimeZone(activeRange.to, 'Asia/Manila', 'yyyy-MM-dd'),
    };
  }, [activeRange]);

  const aggregatedRangeData = React.useMemo(() => {
    if (!bounds || comprehensiveProductData.length === 0) {
      return undefined;
    }

    const filtered = comprehensiveProductData.filter(
      (item) => item.date >= bounds.from && item.date <= bounds.to,
    );

    const productMap = new Map<string, ProductPerformanceData>();

    filtered.forEach((item) => {
      const key = `${item.name}__${item.brandName ?? ''}`;
      const existing = productMap.get(key);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += item.revenue;
        existing.profit += item.profit;
      } else {
        productMap.set(key, {
          name: item.name,
          brandName: item.brandName,
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
  }, [bounds, comprehensiveProductData]);

  const baseData = React.useMemo(() => {
    if (aggregatedRangeData !== undefined) {
      return aggregatedRangeData;
    }

    switch (filterPeriod) {
      case 'today':
        return productData.today;
      case 'week':
        return productData.week;
      case 'month':
        return productData.month;
      default:
        return [];
    }
  }, [
    aggregatedRangeData,
    filterPeriod,
    productData.today,
    productData.week,
    productData.month,
  ]);

  const categories = React.useMemo(() => {
    const allData = [
      ...productData.today,
      ...productData.week,
      ...productData.month,
      ...comprehensiveProductData,
    ];
    const uniqueCategories = [...new Set(allData.map((item) => item.category))];
    return ['all', ...uniqueCategories];
  }, [
    productData.today,
    productData.week,
    productData.month,
    comprehensiveProductData,
  ]);

  const categoryFilteredData = React.useMemo(() => {
    if (category === 'all') {
      return baseData;
    }
    return baseData.filter((product) => product.category === category);
  }, [baseData, category]);

  const currentData = React.useMemo(() => {
    const data = [...categoryFilteredData];

    if (!sortDirection) {
      return data.sort((a, b) => b.quantity - a.quantity);
    }

    data.sort((a, b) => {
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
        case 'revenue':
          aVal = a.revenue;
          bVal = b.revenue;
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
      }

      return sortDirection === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });

    return data;
  }, [categoryFilteredData, sortColumn, sortDirection]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [filterPeriod, category, bounds?.from, bounds?.to]);

  const rangeLabel = React.useMemo(() => {
    const fromDate = activeRange.from;
    const toDate = activeRange.to ?? activeRange.from;

    if (!fromDate) {
      return filterPeriod === 'custom' ? 'Custom range' : filterPeriod;
    }

    const endDate = toDate ?? fromDate;

    switch (filterPeriod) {
      case 'today':
        return format(fromDate, 'MMMM d, yyyy');
      case 'week':
      case 'custom':
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

  const filterSubtitle = buildFilterSubtitle([
    ['Period', rangeLabel],
    ['Category', category === 'all' ? 'All' : category],
  ]);

  const defaultTodayRange = React.useMemo(
    () => computeRangeForPeriod('today'),
    [],
  );

  const hasActiveFilters =
    filterPeriod !== 'today' ||
    category !== 'all' ||
    !rangesMatch(selectedRange, defaultTodayRange);

  const handleResetFilters = () => {
    const todayRange = computeRangeForPeriod('today');
    setFilterPeriod('today');
    setSelectedRange(todayRange);
    setCategory('all');
  };

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
  const totalPages = Math.max(1, Math.ceil(currentData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = currentData.slice(startIndex, endIndex);

  // Build export dataset (full currentData, not just current page)
  const exportRows = currentData.map((p) => ({
    name: p.name + (p.brandName ? ` (${p.brandName})` : ''),
    category: p.category,
    quantity: p.quantity,
    revenue: p.revenue,
    profit: p.profit,
  }));

  // Total profit (and related aggregate values if needed later)
  const totals = React.useMemo(() => {
    return exportRows.reduce(
      (acc, r) => {
        acc.quantity += (r.quantity as number) || 0;
        acc.revenue += (r.revenue as number) || 0;
        acc.profit += (r.profit as number) || 0;
        return acc;
      },
      { quantity: 0, revenue: 0, profit: 0 },
    );
  }, [exportRows]);

  const totalRow = React.useMemo(
    () => ({
      name: 'TOTAL',
      category: '',
      quantity: totals.quantity,
      revenue: totals.revenue,
      profit: totals.profit,
    }),
    [totals],
  );

  const exportRowsWithTotals = React.useMemo(
    () => [...exportRows, totalRow],
    [exportRows, totalRow],
  );

  const tableExportColumns = [
    { header: 'Product', key: 'name' },
    { header: 'Category', key: 'category' },
    { header: 'Quantity', key: 'quantity', numeric: true },
    { header: 'Revenue', key: 'revenue', currency: true },
    { header: 'Profit', key: 'profit', currency: true },
  ];

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
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <TableExportMenu
              title="Product Performance (Top Selling Products)"
              subtitle="Includes total Quantity, Revenue & Profit"
              dynamicSubtitle={`Filters: ${filterSubtitle}`}
              filenameBase="product-performance"
              columns={tableExportColumns}
              rows={
                exportRowsWithTotals as unknown as Record<string, unknown>[]
              }
            />
            <DateFilterComponent
              period={filterPeriod}
              dateRange={selectedRange}
              onPeriodChange={setFilterPeriod}
              onDateRangeChange={setSelectedRange}
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 w-[160px] px-3 py-0 text-sm leading-none">
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
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2.5 text-sm text-muted-foreground hover:text-foreground"
              >
                Reset
              </Button>
            )}
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
                    onClick={() => handleSort('revenue')}
                  >
                    Revenue
                    {renderSortIcon('revenue')}
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
                      <div className="flex flex-col">
                        <span>{product.name}</span>
                        {product.brandName ? (
                          <span className="text-xs text-muted-foreground">
                            {product.brandName}
                          </span>
                        ) : null}
                      </div>
                    </td>
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
                            {currentData.length.toLocaleString('en-PH')}{' '}
                            {currentData.length === 1 ? 'item' : 'items'}
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
};
