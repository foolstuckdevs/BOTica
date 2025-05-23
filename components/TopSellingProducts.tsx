'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';

export const TopSellingProducts = () => {
  const topSellingProducts = [
    {
      name: 'Paracetamol 500mg',
      sales: 1250,
      percentage: 28.5,
      color: '#3b82f6',
    },
    { name: 'Ibuprofen 200mg', sales: 890, percentage: 20.3, color: '#10b981' },
    { name: 'Cetirizine 10mg', sales: 650, percentage: 14.8, color: '#f59e0b' },
    {
      name: 'Vitamin D3 1000IU',
      sales: 540,
      percentage: 12.3,
      color: '#ef4444',
    },
    { name: 'Aspirin 75mg', sales: 420, percentage: 9.6, color: '#8b5cf6' },
    { name: 'Other Medicines', sales: 630, percentage: 14.5, color: '#6b7280' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Selling Medicines</CardTitle>
        <CardDescription>Best performers this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topSellingProducts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="sales"
                >
                  {topSellingProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3">
            {topSellingProducts.map((product, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: product.color }}
                  />
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-gray-600">
                      {product.sales} units
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{product.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
