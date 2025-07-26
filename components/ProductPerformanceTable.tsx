'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';

export const ProductPerformanceTable = () => {
  const [timePeriod, setTimePeriod] = React.useState('today');
  const [category, setCategory] = React.useState('all');

  // Sample data with categories - replace with real data from your database
  const allProductsData = {
    today: [
      {
        name: 'Paracetamol 500mg',
        category: 'Prescription',
        quantity: 24,
        revenue: 1200.0,
        profit: 480.0,
      },
      {
        name: 'Amoxicillin 250mg',
        category: 'Prescription',
        quantity: 18,
        revenue: 2160.0,
        profit: 864.0,
      },
      {
        name: 'Biogesic',
        category: 'OTC',
        quantity: 15,
        revenue: 450.0,
        profit: 180.0,
      },
      {
        name: 'Vitamin C 1000mg',
        category: 'Vitamins',
        quantity: 12,
        revenue: 840.0,
        profit: 336.0,
      },
      {
        name: 'Cough Syrup',
        category: 'OTC',
        quantity: 8,
        revenue: 640.0,
        profit: 256.0,
      },
      {
        name: 'Multivitamins',
        category: 'Vitamins',
        quantity: 6,
        revenue: 480.0,
        profit: 192.0,
      },
    ],
    month: [
      {
        name: 'Paracetamol 500mg',
        category: 'Prescription',
        quantity: 680,
        revenue: 34000.0,
        profit: 13600.0,
      },
      {
        name: 'Amoxicillin 250mg',
        category: 'Prescription',
        quantity: 520,
        revenue: 62400.0,
        profit: 24960.0,
      },
      {
        name: 'Biogesic',
        category: 'OTC',
        quantity: 485,
        revenue: 14550.0,
        profit: 5820.0,
      },
      {
        name: 'Vitamin C 1000mg',
        category: 'Vitamins',
        quantity: 385,
        revenue: 26950.0,
        profit: 10780.0,
      },
      {
        name: 'Cough Syrup',
        category: 'OTC',
        quantity: 340,
        revenue: 27200.0,
        profit: 10880.0,
      },
      {
        name: 'Ibuprofen 400mg',
        category: 'Prescription',
        quantity: 295,
        revenue: 20650.0,
        profit: 8260.0,
      },
      {
        name: 'Multivitamins',
        category: 'Vitamins',
        quantity: 280,
        revenue: 22400.0,
        profit: 8960.0,
      },
      {
        name: 'Ascorbic Acid',
        category: 'Vitamins',
        quantity: 245,
        revenue: 12250.0,
        profit: 4900.0,
      },
    ],
    week: [
      {
        name: 'Paracetamol 500mg',
        category: 'Prescription',
        quantity: 156,
        revenue: 7800.0,
        profit: 3120.0,
      },
      {
        name: 'Biogesic',
        category: 'OTC',
        quantity: 142,
        revenue: 4260.0,
        profit: 1704.0,
      },
      {
        name: 'Amoxicillin 250mg',
        category: 'Prescription',
        quantity: 98,
        revenue: 11760.0,
        profit: 4704.0,
      },
      {
        name: 'Vitamin C 1000mg',
        category: 'Vitamins',
        quantity: 85,
        revenue: 5950.0,
        profit: 2380.0,
      },
      {
        name: 'Cough Syrup',
        category: 'OTC',
        quantity: 72,
        revenue: 5760.0,
        profit: 2304.0,
      },
      {
        name: 'Multivitamins',
        category: 'Vitamins',
        quantity: 64,
        revenue: 5120.0,
        profit: 2048.0,
      },
      {
        name: 'Ibuprofen 400mg',
        category: 'Prescription',
        quantity: 58,
        revenue: 4060.0,
        profit: 1624.0,
      },
      {
        name: 'Ascorbic Acid',
        category: 'Vitamins',
        quantity: 45,
        revenue: 2250.0,
        profit: 900.0,
      },
    ],
  };

  const categories = ['all', 'Prescription', 'OTC', 'Vitamins', 'Supplements'];

  let currentData =
    allProductsData[timePeriod as keyof typeof allProductsData] ||
    allProductsData.today;

  // Filter by category
  if (category !== 'all') {
    currentData = currentData.filter(
      (product) => product.category === category,
    );
  }

  // Sort by quantity (most sold first)
  currentData = [...currentData].sort((a, b) => b.quantity - a.quantity);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-muted-foreground" />
            Product Performance Analysis
          </CardTitle>

          {/* Clean Filters */}
          <div className="flex items-center gap-3">
            {/* Time Period */}
            <div className="flex bg-muted rounded-lg p-1">
              {['today', 'week', 'month'].map((period) => (
                <Button
                  key={period}
                  variant={timePeriod === period ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTimePeriod(period)}
                  className="h-8 px-3 text-sm"
                >
                  {period === 'week'
                    ? 'Week'
                    : period === 'month'
                    ? 'Month'
                    : 'Today'}
                </Button>
              ))}
            </div>

            {/* Category Filter */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-8 px-3 text-sm border rounded-md bg-background"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {currentData.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No products found for the selected filters.</p>
          </div>
        ) : (
          <>
            {/* Simple Product List - Top 5 */}
            <div className="space-y-3">
              {currentData.slice(0, 5).map((product, index) => (
                <div
                  key={`${product.name}-${index}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Left Side - Rank & Product Info */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        index === 0
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : index === 1
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                          : index === 2
                          ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {index + 1}
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-1">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs h-5">
                          {product.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {product.quantity} units sold
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side - Revenue */}
                  <div className="text-right">
                    <p className="font-semibold">
                      ₱{product.revenue.toLocaleString('en-PH')}
                    </p>
                    <p className="text-xs text-green-600">
                      ₱{product.profit.toLocaleString('en-PH')} profit
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
