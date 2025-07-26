'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { AlertTriangle } from 'lucide-react';
import { LowStockProduct } from '@/types';

interface LowStockAlertsProps {
  lowStockProducts: LowStockProduct[];
}

export const LowStockAlerts = ({ lowStockProducts }: LowStockAlertsProps) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-base">Low Stock Alerts</CardTitle>
        </div>
        <CardDescription className="text-sm text-muted-foreground">
          Items below minimum stock threshold
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
                    {item.genericName || item.category}
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
