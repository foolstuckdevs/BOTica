'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { BatchProfitData } from '@/lib/actions/sales-reports';

interface BatchProfitTableProps {
  batchData?: BatchProfitData[];
  loading?: boolean;
}

export const BatchProfitTable = ({
  batchData = [],
  loading = false,
}: BatchProfitTableProps) => {
  const [searchTerm, setSearchTerm] = React.useState('');

  // Use the actual data from the database
  const displayData = batchData;

  // Filter data
  const filteredData = displayData.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.batch.toLowerCase().includes(searchTerm.toLowerCase()),
  );

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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Batch Profit Analysis
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Profit analysis by product batch with expiry tracking
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search products or batch numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                <tr className="border-b border-gray-200 dark:border-gray-700">
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
                {filteredData.length === 0 ? (
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
                  filteredData.map((item) => {
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

        {filteredData.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center">
            Showing {filteredData.length} batch
            {filteredData.length !== 1 ? 'es' : ''} of {displayData.length}{' '}
            total
          </div>
        )}
      </CardContent>
    </Card>
  );
};
