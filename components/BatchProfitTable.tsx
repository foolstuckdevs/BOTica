'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package2,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { BatchProfitData } from '@/types';
import {
  exportToExcel,
  exportToPDF,
  exportFormatters,
  type ExportTable,
} from '@/lib/exporters';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, Filter } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface BatchProfitTableProps {
  batchData?: BatchProfitData[];
  loading?: boolean;
}

export const BatchProfitTable = ({
  batchData = [],
  loading = false,
}: BatchProfitTableProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [profitFilter, setProfitFilter] = React.useState<
    'all' | 'profitable' | 'loss'
  >('all');
  const [categoryFilter, setCategoryFilter] = React.useState('all');
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10);

  // Use the actual data from the database
  const displayData = batchData;

  // Filter data
  const filteredData = displayData.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProfit =
      profitFilter === 'all' ||
      (profitFilter === 'profitable' && item.profit > 0) ||
      (profitFilter === 'loss' && item.profit <= 0);

    const matchesCategory =
      categoryFilter === 'all' ||
      (item.categoryName || 'Uncategorized') === categoryFilter;

    return matchesSearch && matchesProfit && matchesCategory;
  });

  const clearFilters = () => {
    setProfitFilter('all');
    setCategoryFilter('all');
    setSearchTerm('');
  };

  const hasActiveFilters =
    profitFilter !== 'all' || categoryFilter !== 'all' || searchTerm !== '';

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, profitFilter, categoryFilter, itemsPerPage]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const getExpiryStatus = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry < 0) {
      return {
        status: 'expired',
        label: 'Expired',
        badge: (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expired
          </Badge>
        ),
      };
    }
    if (daysUntilExpiry <= 30) {
      return {
        status: 'near-expiry',
        label: 'Expiring Soon',
        badge: (
          <Badge
            variant="default"
            className="bg-yellow-100 text-yellow-800 border-yellow-300"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            Expiring Soon
          </Badge>
        ),
      };
    }
    return {
      status: 'optimal',
      label: 'Optimal',
      badge: (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-300"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          Optimal
        </Badge>
      ),
    };
  };

  const getStockStatus = (qtyRemaining: number = 0) => {
    if (qtyRemaining === 0) {
      return {
        status: 'sold-out',
        label: 'Sold Out',
        badge: (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Sold Out
          </Badge>
        ),
      };
    }
    if (qtyRemaining < 10) {
      return {
        status: 'low-stock',
        label: `${qtyRemaining} left`,
        badge: (
          <Badge
            variant="default"
            className="bg-yellow-100 text-yellow-800 border-yellow-300"
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            {qtyRemaining} left
          </Badge>
        ),
      };
    }
    return {
      status: 'in-stock',
      label: `${qtyRemaining} left`,
      badge: (
        <Badge
          variant="default"
          className="bg-green-100 text-green-800 border-green-300"
        >
          <CheckCircle className="w-3 h-3 mr-1" />
          {qtyRemaining} left
        </Badge>
      ),
    };
  };

  const formatCurrency = (amount: number) => `₱${amount.toFixed(2)}`;
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString();

  // Build export tables for current filtered dataset (not paginated)
  const buildExport = (): ExportTable[] => {
    const columns = [
      { header: 'Product', key: 'productName' },
      { header: 'Category', key: 'categoryName' },
      { header: 'Batch', key: 'batch' },
      {
        header: 'Expiry',
        key: 'expiry',
        formatter: (v: unknown) => exportFormatters.date(v),
      },
      { header: 'Qty Sold', key: 'qtySold' },
      { header: 'Qty Remaining', key: 'qtyRemaining' },
      {
        header: 'Cost',
        key: 'cost',
        formatter: (v: unknown) => exportFormatters.phpCurrency(v),
      },
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
      { header: 'Margin %', key: 'margin' },
    ];
    const rows = filteredData.map((r) => ({
      productName: r.productName,
      categoryName: r.categoryName || 'Uncategorized',
      batch: r.batch,
      expiry: r.expiry,
      qtySold: r.qtySold,
      qtyRemaining: r.qtyRemaining ?? 0,
      cost: r.cost,
      revenue: r.revenue,
      profit: r.profit,
      margin: r.margin,
    }));
    return [{ name: 'Batch Profit', columns, rows }];
  };

  const subtitle = (() => {
    const filterLabel =
      profitFilter === 'profitable'
        ? 'Profitable only'
        : profitFilter === 'loss'
        ? 'Loss/Break-even'
        : 'All';
    return `Filter: ${filterLabel}${
      searchTerm ? ` · Search: ${searchTerm}` : ''
    }`;
  })();

  const onExportPDF = () =>
    exportToPDF({
      title: 'Batch Profit',
      subtitle,
      tables: buildExport(),
      filename: 'batch-profit.pdf',
      orientation: 'landscape',
    });
  const onExportExcel = () =>
    exportToExcel({ filename: 'batch-profit.xlsx', sheets: buildExport() });

  return (
    <Card>
      <CardHeader className="py-3">
        {/* One row: Title left, Search + Export + Filters right */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package2 className="w-5 h-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg font-semibold">
                Batch Profit
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Profit by product batch with expiry tracking
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Products or batch numbers"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-[240px] text-sm py-2 pl-10 pr-3"
              />
            </div>
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
                    <label className="text-xs font-medium text-muted-foreground">
                      Performance
                    </label>
                    <Select
                      value={profitFilter}
                      onValueChange={(value: typeof profitFilter) =>
                        setProfitFilter(value)
                      }
                    >
                      <SelectTrigger className="h-8 w-full text-xs px-2 mt-1">
                        <SelectValue placeholder="Filter by performance" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Batches</SelectItem>
                        <SelectItem value="profitable">
                          Profitable Only
                        </SelectItem>
                        <SelectItem value="loss">Loss/Break-even</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      Category
                    </label>
                    <Select
                      value={categoryFilter}
                      onValueChange={setCategoryFilter}
                    >
                      <SelectTrigger className="h-8 w-full text-xs px-2 mt-1">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {Array.from(
                          new Set(
                            displayData.map(
                              (item) => item.categoryName || 'Uncategorized',
                            ),
                          ),
                        )
                          .sort()
                          .map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
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
                        onClick={clearFilters}
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
        {/* All batch filters moved into the popover for a thin one-row header */}
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-gray-500">Loading batch data...</div>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left font-medium">
                    Product Details
                  </th>
                  <th className="py-3 px-4 text-left font-medium">
                    Batch Info
                  </th>
                  <th className="py-3 px-4 text-right font-medium">Qty Sold</th>
                  <th className="py-3 px-4 text-right font-medium">
                    Cost/Unit
                  </th>
                  <th className="py-3 px-4 text-right font-medium">Revenue</th>
                  <th className="py-3 px-4 text-right font-medium">
                    Total Profit
                  </th>
                  <th className="py-3 px-4 text-right font-medium">Margin</th>
                  <th className="py-3 px-4 text-center font-medium">
                    Expiry Status
                  </th>
                  <th className="py-3 px-4 text-center font-medium">
                    Stock Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No batch data found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => {
                    const expiryStatus = getExpiryStatus(item.expiry);
                    const stockStatus = getStockStatus(item.qtyRemaining);
                    return (
                      <tr
                        key={item.id}
                        className="border-b hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.categoryName || 'Uncategorized'}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-mono text-sm">{item.batch}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(item.expiry)}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {item.qtySold}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(item.cost / item.qtySold)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(item.revenue)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-semibold ${
                              item.profit >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {item.profit >= 0 ? (
                              <TrendingUp className="w-4 h-4 inline mr-1" />
                            ) : (
                              <TrendingDown className="w-4 h-4 inline mr-1" />
                            )}
                            {formatCurrency(Math.abs(item.profit))}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`font-medium ${
                              item.margin >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            {item.margin.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {expiryStatus.badge}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {stockStatus.badge}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {filteredData.length > 0 && (
                <tfoot>
                  <tr>
                    <td colSpan={9} className="py-2 px-2">
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
                </tfoot>
              )}
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
