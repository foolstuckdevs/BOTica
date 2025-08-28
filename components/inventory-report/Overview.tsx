'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  TrendingDown,
  PhilippinePeso,
  ShoppingCart,
} from 'lucide-react';
import type { InventoryOverviewData } from '@/types';

interface Props {
  overview: InventoryOverviewData;
  expiring7Count: number;
}

export function InventoryOverview({ overview, expiring7Count }: Props) {
  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Out of Stock
              </p>
              <p className="text-2xl font-bold">{overview.outOfStockCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                needs restock
              </p>
            </div>
            <div className="h-8 w-8 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Inventory Value
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(overview.totalValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">booked cost</p>
            </div>
            <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <PhilippinePeso className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Low Stock Products
              </p>
              <p className="text-2xl font-bold">{overview.lowStockCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                below min level
              </p>
            </div>
            <div className="h-8 w-8 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Expiring (7 days)
              </p>
              <p className="text-2xl font-bold">{expiring7Count}</p>
              <p className="text-xs text-muted-foreground mt-1">
                urgent to move
              </p>
            </div>
            <div className="h-8 w-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
