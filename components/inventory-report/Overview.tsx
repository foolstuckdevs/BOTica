'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  TrendingDown,
  PhilippinePeso,
  ShoppingCart,
  Package,
  Boxes,
  CircleDollarSign,
} from 'lucide-react';
import type { InventoryOverviewData } from '@/types';

interface Props {
  overview: InventoryOverviewData;
  expiringCount: number;
  expiredCount: number;
  activeCount: number;
  inactiveCount: number;
  revenueAtRisk: number;
}

export function InventoryOverview({ overview, expiringCount, expiredCount, activeCount, inactiveCount, revenueAtRisk }: Props) {
  const formatCurrency = (amount: number): string =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  // overview.totalProducts = all non-deleted rows from DB
  // activeCount here = "available" products (in-stock & not expired) — a subset
  // Total active products = overview.totalProducts (all non-deleted)
  const totalActive = overview.totalProducts;
  const totalProducts = totalActive + inactiveCount;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Products (with active/inactive breakdown) */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Products
              </p>
              <p className="text-2xl font-bold">{totalProducts}</p>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">{totalActive}</span> active
                {inactiveCount > 0 && (
                  <>
                    {' · '}
                    <span className="text-gray-500 font-medium">{inactiveCount}</span> inactive
                  </>
                )}
              </p>
            </div>
            <div className="h-8 w-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Boxes className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Units in Stock */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Units in Stock
              </p>
              <p className="text-2xl font-bold">
                {overview.totalUnitsInStock ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                sum of quantities
              </p>
            </div>
            <div className="h-8 w-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center">
              <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Out of Stock */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Out of Stock
              </p>
              <p className="text-2xl font-bold">{overview.outOfStockCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                immediate restock needed
              </p>
            </div>
            <div className="h-8 w-8 bg-gray-100 dark:bg-gray-900 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Low Stock Alert */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Low Stock Alert
              </p>
              <p className="text-2xl font-bold">{overview.lowStockCount}</p>
              <p className="text-xs text-muted-foreground mt-1">
                below minimum quantity
              </p>
            </div>
            <div className="h-8 w-8 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expiring Products (merged Expiring Soon + Expired) */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Expiring Products
              </p>
              <p className="text-2xl font-bold">{(expiringCount || 0) + (expiredCount ?? 0)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {(expiringCount || 0) + (expiredCount ?? 0) > 0
                  ? 'action required soon'
                  : 'no items at risk'}
              </p>
            </div>
            <div className="h-8 w-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue at Risk (beside Expiring Products) */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Revenue at Risk
              </p>
              <p className={`text-2xl font-bold ${revenueAtRisk > 0 ? 'text-red-600 dark:text-red-400' : ''}`}>
                {formatCurrency(revenueAtRisk)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                value of expiring &amp; expired stock
              </p>
            </div>
            <div className="h-8 w-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <CircleDollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Value (Cost) */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Inventory Value (Cost)
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(
                  overview.inventoryCostValue ?? overview.totalValue,
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                current stock at cost price
              </p>
            </div>
            <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <PhilippinePeso className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Value (Retail) */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Inventory Value (Retail)
              </p>
              <p className="text-2xl font-bold">
                {formatCurrency(overview.inventoryRetailValue ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                current stock at selling price
              </p>
            </div>
            <div className="h-8 w-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <PhilippinePeso className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
