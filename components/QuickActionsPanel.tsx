'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart,
  Package,
  Users,
  FileText,
  Plus,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export const QuickActionsPanel = () => {
  const quickActions = [
    {
      title: 'New Sale',
      description: 'Start POS transaction',
      icon: <ShoppingCart className="w-5 h-5" />,
      href: '/sales/pos',
      color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'Add Product',
      description: 'Add new inventory item',
      icon: <Plus className="w-5 h-5" />,
      href: '/inventory/products/new',
      color: 'bg-green-50 text-green-600 hover:bg-green-100',
      iconBg: 'bg-green-100',
    },
    {
      title: 'Manage Categories',
      description: 'View inventory levels',
      icon: <Package className="w-5 h-5" />,
      href: '/inventory/categories',
      color: 'bg-orange-50 text-orange-600 hover:bg-orange-100',
      iconBg: 'bg-orange-100',
    },
    {
      title: 'Sales Report',
      description: 'View sales analytics',
      icon: <TrendingUp className="w-5 h-5" />,
      href: '/reports/sales',
      color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
      iconBg: 'bg-purple-100',
    },
    {
      title: 'Purchase Order',
      description: 'Create new order',
      icon: <FileText className="w-5 h-5" />,
      href: '/inventory/purchase-order/new',
      color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100',
      iconBg: 'bg-indigo-100',
    },
    {
      title: 'Suppliers',
      description: 'Manage suppliers',
      icon: <Users className="w-5 h-5" />,
      href: '/inventory/suppliers',
      color: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
      iconBg: 'bg-gray-100',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link key={action.title} href={action.href}>
              <Button
                variant="ghost"
                className={`h-auto p-4 flex flex-col items-center justify-center space-y-2 w-full ${action.color} border border-transparent transition-all duration-200`}
              >
                <div className={`p-2 rounded-lg ${action.iconBg}`}>
                  {action.icon}
                </div>
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs opacity-75">{action.description}</div>
                </div>
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
