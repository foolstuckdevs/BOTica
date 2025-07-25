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
import { formatCurrency } from '@/lib/helpers/formatCurrency';
import { Supplier, Product, PurchaseOrder, PurchaseOrderItem } from '@/types';
import { Button } from './ui/button';
import { updatePurchaseOrderStatus } from '@/lib/actions/purchase-order';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { FileDown, FileSpreadsheet } from 'lucide-react';

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
    <p className="text-sm font-medium text-foreground">{value}</p>
  </div>
);

const PurchaseOrderDetails: React.FC<PurchaseOrderDetailsProps> = ({
  order,
  supplier,
  products,
}) => {
  const router = useRouter();
  const totalCost = order.totalCost!;
  const statusOptions = [
    'DRAFT',
    'EXPORTED',
    'SUBMITTED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CANCELLED',
  ];
  const [status, setStatus] = React.useState<PurchaseOrder['status']>(
    order.status,
  );
  const [statusError, setStatusError] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  async function handleStatusSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSaving(true);
    setStatusError('');
    try {
      const result = await updatePurchaseOrderStatus(
        order.id,
        status,
        order.pharmacyId,
      );
      if (!result.success) {
        setStatusError(result.message || 'Failed to update status');
      } else {
        setStatusError('');
        router.push('/inventory/purchase-order');
      }
    } catch {
      setStatusError('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  }

  // Export handlers
  const handleExportPDF = () => {
    window.print();
  };
  const handleExportExcel = () => {
    // TODO: Implement Excel export logic
    alert('Excel export not implemented yet.');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:bg-accent"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to purchase orders</span>
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="flex items-center gap-1"
          >
            <FileDown className="w-4 h-4" /> PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="flex items-center gap-1"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
        </div>
      </div>
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-xl font-semibold text-foreground">
            Purchase Order
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 mt-4">
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InfoBlock label="Order Number" value={order.orderNumber} />
            <InfoBlock
              label="Order Date"
              value={new Date(order.orderDate).toLocaleDateString()}
            />
            <InfoBlock
              label="Supplier"
              value={
                supplier?.name ||
                order.supplierName ||
                `Supplier #${order.supplierId}`
              }
            />
            <form onSubmit={handleStatusSubmit} className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <div className="flex gap-2 items-center">
                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as PurchaseOrder['status'])
                  }
                  className="border rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isSaving}
                >
                  {statusOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="default"
                  type="submit"
                  disabled={isSaving}
                  className="px-4"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </div>
              {statusError && (
                <p className="text-xs text-red-500 mt-1">{statusError}</p>
              )}
            </form>
            {statusError && (
              <p className="text-xs text-red-500">{statusError}</p>
            )}
            {order.notes && <InfoBlock label="Notes" value={order.notes} />}
          </section>
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
