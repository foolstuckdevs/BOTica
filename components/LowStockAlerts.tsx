'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { LowStockProduct } from '@/types';
import Link from 'next/link';
import { useRealtimeRefresh, REALTIME_EVENTS } from '@/hooks/useRealtimeEvent';

interface LowStockAlertsProps {
  lowStockProducts: LowStockProduct[];
}

export const LowStockAlerts = ({ lowStockProducts }: LowStockAlertsProps) => {
  // Auto-refresh when stock changes
  useRealtimeRefresh([
    REALTIME_EVENTS.STOCK_UPDATED,
    REALTIME_EVENTS.SALE_COMPLETED,
  ]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">
              Low Stock & Out of Stock
            </CardTitle>
          </div>
          <Link
            href="/reports/inventory?tab=low-stock"
            prefetch={true}
            className="text-xs text-yellow-800 hover:underline flex items-center gap-1"
          >
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Items below minimum stock threshold and out of stock
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lowStockProducts.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-10">
            No low stock alerts at the moment. All products are well stocked.
          </div>
        ) : (
          <div className="space-y-3">
            {lowStockProducts.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-2 items-center border rounded-md px-3 py-2 text-sm border-orange-200"
              >
                <div>
                  <p className="font-medium text-gray-900">{item.product}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.genericName || item.category || 'No category'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-orange-600">
                    {item.currentStock}/{item.minThreshold}
                  </p>
                  <p className="text-xs text-muted-foreground">Current / Min</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
