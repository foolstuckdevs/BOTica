'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/helpers/formatCurrency';
import { Supplier, Product, PurchaseOrder, PurchaseOrderItem } from '@/types';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Printer } from 'lucide-react';

interface PurchaseOrderDetailsProps {
  order: PurchaseOrder & {
    items: PurchaseOrderItem[];
    userName?: string;
    totalCost?: number;
  };
  supplier?: Supplier;
  products?: Product[];
}

const InfoBlock = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="space-y-1">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="font-medium text-sm">{value}</p>
  </div>
);

const PurchaseOrderDetails: React.FC<PurchaseOrderDetailsProps> = ({
  order,
  supplier,
  products,
}) => {
  const router = useRouter();
  const totalCost = order.totalCost!;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
      {/* Top Controls */}
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="group flex items-center gap-2 rounded-full text-sm text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4 group-hover:translate-x-[-2px] transition-transform" />
          <span>Back to Purchase Orders</span>
        </Button>

        <Button
          variant="outline"
          onClick={() => window.print()}
          className="flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      {/* Card */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-xl font-semibold text-foreground">
            Purchase Order Details
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6 mt-4">
          {/* Order Info */}
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            <InfoBlock label="Order Number" value={order.orderNumber} />
            <InfoBlock
              label="Order Date"
              value={new Date(order.orderDate).toLocaleDateString()}
            />
            <InfoBlock
              label="Status"
              value={
                <Badge
                  variant="outline"
                  className="capitalize w-fit text-xs px-2 py-1"
                >
                  {order.status.toLowerCase()}
                </Badge>
              }
            />
            <InfoBlock
              label="Supplier"
              value={
                supplier?.name ||
                order.supplierName ||
                `Supplier #${order.supplierId}`
              }
            />
            {order.notes && <InfoBlock label="Notes" value={order.notes} />}
          </section>

          {/* Order Items */}
          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Ordered Items
            </h3>
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell className="font-medium text-sm">
                      Product
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      Qty
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      Unit
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      Unit Cost
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      Total
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item) => {
                    const product = products?.find(
                      (p) => p.id === item.productId,
                    );
                    const unitCost = parseFloat(item.unitCost);
                    const total = unitCost * item.quantity;

                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          {product?.name ||
                            item.productName ||
                            `#${item.productId}`}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {product?.unit || item.productUnit || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(unitCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(total)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </section>

          {/* Total Cost */}
          <section className="flex justify-end pt-2 border-t">
            <div className="text-sm text-muted-foreground space-y-1 text-right">
              <p className="text-xs uppercase">Total Order Cost</p>
              <p className="text-xl font-semibold text-foreground">
                {formatCurrency(totalCost)}
              </p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
};

export default PurchaseOrderDetails;
