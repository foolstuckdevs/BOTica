'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Layers } from 'lucide-react';

export const InventoryReportHeader = () => {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500 dark:bg-emerald-600 rounded-xl shadow-sm">
              <Layers className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Inventory Report
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Monitor stock levels, expiry dates, and inventory health
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InventoryReportHeader;
