'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Package,
} from 'lucide-react';

export const SalesReportOverview = () => {
  const [selectedPeriod, setSelectedPeriod] = React.useState('today');

  // Sample data - you'll replace this with real data from your database
  const salesData = {
    today: {
      totalSales: 15420.5,
      totalCost: 9252.3,
      profit: 6168.2,
      transactions: 24,
      totalItems: 87,
    },
    yesterday: {
      totalSales: 12890.75,
      totalCost: 7734.45,
      profit: 5156.3,
      transactions: 19,
      totalItems: 68,
    },
    week: {
      totalSales: 98750.25,
      totalCost: 59250.15,
      profit: 39500.1,
      transactions: 156,
      totalItems: 542,
    },
    month: {
      totalSales: 387650.75,
      totalCost: 232590.45,
      profit: 155060.3,
      transactions: 634,
      totalItems: 2186,
    },
  };

  const currentData = salesData[selectedPeriod as keyof typeof salesData];
  const profitMargin = (
    (currentData.profit / currentData.totalSales) *
    100
  ).toFixed(1);

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case 'today':
        return 'Today';
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      default:
        return 'Today';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sales Overview</h2>
          <p className="text-muted-foreground">
            Track your pharmacy&apos;s sales performance
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-3">
          <div className="flex bg-muted/50 rounded-xl p-1">
            {['today', 'week', 'month'].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className="h-9 px-4 rounded-lg font-medium"
              >
                {getPeriodLabel(period)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Sales
                </p>
                <p className="text-2xl font-bold">
                  ₱
                  {currentData.totalSales.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getPeriodLabel(selectedPeriod)}
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Profit
                </p>
                <p className="text-2xl font-bold">
                  ₱
                  {currentData.profit.toLocaleString('en-PH', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {profitMargin}% margin
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Transactions
                </p>
                <p className="text-2xl font-bold">{currentData.transactions}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed {getPeriodLabel(selectedPeriod).toLowerCase()}
                </p>
              </div>
              <div className="h-8 w-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Items
                </p>
                <p className="text-2xl font-bold">{currentData.totalItems}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Items sold {getPeriodLabel(selectedPeriod).toLowerCase()}
                </p>
              </div>
              <div className="h-8 w-8 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Section - Auto-show when viewing today */}
      {selectedPeriod === 'today' && (
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="p-4">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Performance vs Yesterday
            </h3>
            <div className="space-y-3">
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Sales Growth:</span>
                  <div className="flex items-center gap-1">
                    {salesData.today.totalSales >
                    salesData.yesterday.totalSales ? (
                      <TrendingUp className="w-3 h-3 text-green-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        salesData.today.totalSales >
                        salesData.yesterday.totalSales
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {(
                        ((salesData.today.totalSales -
                          salesData.yesterday.totalSales) /
                          salesData.yesterday.totalSales) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Profit Growth:</span>
                  <span
                    className={`text-sm font-medium ${
                      salesData.today.profit > salesData.yesterday.profit
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {(
                      ((salesData.today.profit - salesData.yesterday.profit) /
                        salesData.yesterday.profit) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">
                      Overall Performance:
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        salesData.today.totalSales >
                        salesData.yesterday.totalSales
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {salesData.today.totalSales >
                      salesData.yesterday.totalSales
                        ? 'Better'
                        : 'Lower'}{' '}
                      than yesterday
                    </span>
                  </div>
                </div>
              </>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
