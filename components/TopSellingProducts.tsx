'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

export interface TopSellingProduct {
  name: string;
  sales: number;
  percentage: number;
  color?: string;
}

interface TopSellingProductsProps {
  products: TopSellingProduct[];
}

export const TopSellingProducts = ({ products }: TopSellingProductsProps) => {
  const colors = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#6b7280',
  ];

  const topSellingProducts = products.map((p, i) => ({
    ...p,
    color: p.color || colors[i % colors.length],
  }));

  const now = new Date();
  const monthYear = now.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Top Selling Medicines
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Best performers for this month ({monthYear})
            </CardDescription>
          </div>
          <Link
            href="/reports/sales"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            View Details <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {topSellingProducts.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-10">
            No sales data available for this month.
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Pie Chart */}
            <div className="flex-1 min-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topSellingProducts}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="sales"
                    stroke="none"
                  >
                    {topSellingProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(
                      value: number,
                      name: string,
                      payload?: { payload?: TopSellingProduct },
                    ) => [`${value} units`, payload?.payload?.name || name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend List */}
            <div className="flex-1 space-y-2">
              {topSellingProducts.map((product, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/50 transition"
                  role="listitem"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: product.color }}
                      aria-hidden="true"
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.sales} units
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-foreground">
                    {product.percentage}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
