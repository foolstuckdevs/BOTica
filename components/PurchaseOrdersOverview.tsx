'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PurchaseOrder } from '@/types';
import {
  Plus,
  Package2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  Mail,
} from 'lucide-react';
import Link from 'next/link';

interface PurchaseOrdersOverviewProps {
  orders: PurchaseOrder[];
}

const PurchaseOrdersOverview: React.FC<PurchaseOrdersOverviewProps> = ({
  orders,
}) => {
  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { color: string; icon: React.ReactElement; label: string }
    > = {
      DRAFT: {
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: <AlertCircle className="w-3 h-3" />,
        label: 'Draft',
      },
      EXPORTED: {
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        icon: <Mail className="w-3 h-3" />,
        label: 'Exported',
      },
      SUBMITTED: {
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Submitted',
      },
      CONFIRMED: {
        color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Confirmed',
      },
      PARTIALLY_RECEIVED: {
        color: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: <Truck className="w-3 h-3" />,
        label: 'Partially Received',
      },
      RECEIVED: {
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: <CheckCircle className="w-3 h-3" />,
        label: 'Completed',
      },
      CANCELLED: {
        color: 'bg-red-100 text-red-700 border-red-200',
        icon: <XCircle className="w-3 h-3" />,
        label: 'Cancelled',
      },
    };

    const statusConfig = config[status] || config['DRAFT'];

    return (
      <Badge
        variant="outline"
        className={`inline-flex items-center gap-1 ${statusConfig.color}`}
      >
        {statusConfig.icon}
        {statusConfig.label}
      </Badge>
    );
  };

  const getProgressPercentage = (status: string) => {
    const progressMap: Record<string, number> = {
      DRAFT: 15,
      EXPORTED: 25,
      SUBMITTED: 40,
      CONFIRMED: 55,
      PARTIALLY_RECEIVED: 70,
      RECEIVED: 100,
      CANCELLED: 0,
    };
    return progressMap[status] || 0;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Document and track supplier orders with comprehensive workflow
            management
          </p>
        </div>
        <Button asChild>
          <Link href="/inventory/purchase-order/new">
            <Plus className="w-4 h-4 mr-2" />
            Create Order
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Orders',
            value: orders.length,
            color: 'text-blue-600',
            icon: <Package2 className="w-4 h-4" />,
          },
          {
            label: 'In Progress',
            value: orders.filter(
              (o) => !['RECEIVED', 'CANCELLED'].includes(o.status),
            ).length,
            color: 'text-orange-600',
            icon: <Clock className="w-4 h-4" />,
          },
          {
            label: 'Completed',
            value: orders.filter((o) => o.status === 'RECEIVED').length,
            color: 'text-green-600',
            icon: <CheckCircle className="w-4 h-4" />,
          },
          {
            label: 'Cancelled',
            value: orders.filter((o) => o.status === 'CANCELLED').length,
            color: 'text-red-600',
            icon: <XCircle className="w-4 h-4" />,
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={stat.color}>{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <Package2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No orders yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first purchase order to get started.
              </p>
              <Button asChild>
                <Link href="/inventory/purchase-order/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Order
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/inventory/purchase-order/${order.id}`}
                        className="font-semibold text-blue-600 hover:text-blue-800"
                      >
                        {order.orderNumber}
                      </Link>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString()
                        : 'Unknown date'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Supplier</p>
                      <p className="font-medium">
                        {order.supplierName || 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Items</p>
                      <p className="font-medium">{order.totalItems} items</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{
                              width: `${getProgressPercentage(order.status)}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm">
                          {getProgressPercentage(order.status)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {order.totalQuantity} total qty
                      {order.status === 'PARTIALLY_RECEIVED' && (
                        <span> • Partially received</span>
                      )}
                      {order.status === 'RECEIVED' && (
                        <span> • All items received</span>
                      )}
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/inventory/purchase-order/${order.id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrdersOverview;
