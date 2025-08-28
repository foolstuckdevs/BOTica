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
  Package,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { BatchProfitData } from '@/types';

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

    return matchesSearch && matchesProfit;
  });

  // Reset to first page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, profitFilter, itemsPerPage]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
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

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle className="text-lg font-semibold">
                Batch Profit
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Profit by product batch with expiry tracking
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products or batch numbers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-sm py-2 pl-10 pr-3 w-full"
              />
            </div>
            <Select
              value={profitFilter}
              onValueChange={(value: typeof profitFilter) =>
                setProfitFilter(value)
              }
            >
              <SelectTrigger className="h-9 w-full sm:w-auto sm:min-w-[180px] text-sm px-3 py-2">
                <SelectValue placeholder="Filter by performance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                <SelectItem value="profitable">Profitable Only</SelectItem>
                <SelectItem value="loss">Loss/Break-even</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-gray-500">Loading batch data...</div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                    Product Details
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                    Batch Info
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                    Qty Sold
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                    Cost/Unit
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                    Revenue
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                    Total Profit
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                    Margin
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                    Expiry Status
                  </th>
                  <th className="text-center py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                    Stock Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-gray-500">
                      {searchTerm
                        ? 'No batch data found for the selected filters.'
                        : displayData.length === 0
                        ? 'No sales data found for this period. Try a different time period or ensure there are sales records in the database.'
                        : 'No batch data found for the selected filters.'}
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((item) => {
                    const expiryStatus = getExpiryStatus(item.expiry);
                    const stockStatus = getStockStatus(item.qtyRemaining);
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {item.productName}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-mono text-sm">{item.batch}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
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
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {filteredData.length > itemsPerPage && (
          <div className="flex items-center justify-between px-2 py-4">
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
              <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Go to previous page</span>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <span className="sr-only">Go to next page</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {paginatedData.length > 0 && filteredData.length <= itemsPerPage && (
          <div className="flex items-center justify-between px-2 py-4">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
};
