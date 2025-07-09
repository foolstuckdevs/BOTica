'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { AlertTriangle } from 'lucide-react';

export const LowStockAlerts = () => {
  const lowStockAlerts = [
    {
      product: 'Paracetamol 500mg',
      currentStock: 12,
      minThreshold: 50,
      category: 'Pain Relief',
    },
    {
      product: 'Amoxicillin 250mg Capsules',
      currentStock: 8,
      minThreshold: 30,
      category: 'Antibiotics',
    },
    {
      product: 'Omeprazole 20mg',
      currentStock: 5,
      minThreshold: 25,
      category: 'Gastrointestinal',
    },
    {
      product: 'Salbutamol Inhaler',
      currentStock: 3,
      minThreshold: 15,
      category: 'Respiratory',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <CardTitle>Low Stock Alerts</CardTitle>
        </div>
        <CardDescription>Medicines requiring immediate restock</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {lowStockAlerts.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border rounded-lg bg-orange-50 border-orange-200"
            >
              <div>
                <p className="font-medium">{item.product}</p>
                <p className="text-sm text-gray-600">{item.category}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-orange-600">
                  {item.currentStock}/{item.minThreshold}
                </p>
                <p className="text-xs text-gray-500">Current/Min</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
