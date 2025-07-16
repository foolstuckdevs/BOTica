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
    {
      product: 'Metformin 500mg',
      currentStock: 10,
      minThreshold: 40,
      category: 'Diabetes',
    },
  ];

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
        <div className="space-y-3">
          {lowStockAlerts.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-2 items-center border rounded-md px-3 py-2 text-sm border-orange-200"
            >
              <div>
                <p className="font-medium text-gray-900">{item.product}</p>
                <p className="text-xs text-muted-foreground">{item.category}</p>
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
      </CardContent>
    </Card>
  );
};
