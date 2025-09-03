'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

export const SalesReportHeader = () => {
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500 dark:bg-blue-600 rounded-xl shadow-sm">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Sales Report
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Monitor sales performance and trends across all time periods
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
