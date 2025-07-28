'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/helpers/formatCurrency';
import { Supplier, Product, PurchaseOrder, PurchaseOrderItem } from '@/types';
import { updatePurchaseOrderStatus } from '@/lib/actions/purchase-order';
import { PurchaseOrderConfirmDialog } from '@/components/PurchaseOrderConfirmDialog';
import { PurchaseOrderPaymentDialog } from '@/components/PurchaseOrderPaymentDialog';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Edit,
  FileText,
  FileSpreadsheet,
  Send,
  CheckCircle2,
  Package,
  AlertCircle,
  Plus,
  Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface PurchaseOrderDetailsProps {
  order: PurchaseOrder & {
    items: PurchaseOrderItem[];
    userName?: string;
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
    <p className="text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value}</p>
  </div>
);

const statusConfig = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800',
    icon: <FileText className="w-3 h-3" />,
    description: 'Export purchase order to submit to supplier',
  },
  EXPORTED: {
    label: 'Exported',
    color: 'bg-blue-100 text-blue-800',
    icon: <Send className="w-3 h-3" />,
    description: 'Order exported and ready to submit to supplier',
  },
  SUBMITTED: {
    label: 'Submitted',
    color: 'bg-purple-100 text-purple-800',
    icon: <Send className="w-3 h-3" />,
    description: 'Order submitted to supplier, awaiting confirmation',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'bg-indigo-100 text-indigo-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
    description: 'Supplier confirmed order and pricing',
  },
  PARTIALLY_RECEIVED: {
    label: 'Partially Received',
    color: 'bg-amber-100 text-amber-800',
    icon: <Package className="w-3 h-3" />,
    description: 'Some items received',
  },
  RECEIVED: {
    label: 'All Items Received',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
    description: 'All items received, pending payment',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
    description: 'Order paid and completed',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800',
    icon: <AlertCircle className="w-3 h-3" />,
    description: 'Order cancelled',
  },
};

const PurchaseOrderDetails: React.FC<PurchaseOrderDetailsProps> = ({
  order,
  supplier,
  products,
}) => {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPartialDialog, setShowPartialDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [receivedItems, setReceivedItems] = useState<Record<number, number>>(
    {},
  );

  const statusInfo =
    statusConfig[order.status as keyof typeof statusConfig] ||
    statusConfig.DRAFT;
  const totalCost = parseFloat(order.totalCost || '0');
  const formattedDate = new Date(order.orderDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const getAvailableActions = () => {
    const actions = [];

    // Actions for DRAFT: Export Order and Mark as Submitted
    if (order.status === 'DRAFT') {
      actions.push(
        {
          label: 'Export Purchase Order',
          icon: <FileText className="w-4 h-4" />,
          variant: 'default' as const,
          onClick: async () => {
            if (!isUpdating) {
              setIsUpdating(true);
              const result = await updatePurchaseOrderStatus(
                order.id,
                'EXPORTED',
                order.pharmacyId,
              );
              if (result.success) {
                window.location.reload();
              } else {
                toast.error(result.message || 'Failed to update status');
              }
              setIsUpdating(false);
            }
          },
          disabled: isUpdating,
        },
        {
          label: 'Mark as Submitted',
          icon: <Send className="w-4 h-4" />,
          variant: 'outline' as const,
          onClick: () => handleStatusUpdate('SUBMITTED'),
          disabled: isUpdating,
        },
        {
          label: 'Cancel Order',
          icon: <AlertCircle className="w-4 h-4" />,
          variant: 'destructive' as const,
          onClick: () => handleStatusUpdate('CANCELLED'),
          disabled: isUpdating,
        },
      );
    }

    // Actions for EXPORTED: Mark as Submitted and Cancel Order
    if (order.status === 'EXPORTED') {
      actions.push(
        {
          label: 'Mark as Submitted',
          icon: <Send className="w-4 h-4" />,
          variant: 'default' as const,
          onClick: () => handleStatusUpdate('SUBMITTED'),
          disabled: isUpdating,
        },
        {
          label: 'Cancel Order',
          icon: <AlertCircle className="w-4 h-4" />,
          variant: 'destructive' as const,
          onClick: () => handleStatusUpdate('CANCELLED'),
          disabled: isUpdating,
        },
      );
    }

    // Actions for SUBMITTED: Confirm Order and Cancel Order
    if (order.status === 'SUBMITTED') {
      actions.push(
        {
          label: 'Confirm Order',
          icon: <CheckCircle2 className="w-4 h-4" />,
          variant: 'default' as const,
          onClick: () => setShowConfirmDialog(true),
        },
        {
          label: 'Cancel Order',
          icon: <AlertCircle className="w-4 h-4" />,
          variant: 'destructive' as const,
          onClick: () => handleStatusUpdate('CANCELLED'),
          disabled: isUpdating,
        },
      );
    }

    // Actions for CONFIRMED: Partially Received, All Items Received, and Cancel Order
    if (order.status === 'CONFIRMED') {
      actions.push(
        {
          label: 'Partially Received',
          icon: <Package className="w-4 h-4" />,
          variant: 'default' as const,
          onClick: () => setShowPartialDialog(true),
        },
        {
          label: 'All Items Received',
          icon: <CheckCircle2 className="w-4 h-4" />,
          variant: 'outline' as const,
          onClick: () => handleStatusUpdate('RECEIVED'),
        },
        {
          label: 'Cancel Order',
          icon: <AlertCircle className="w-4 h-4" />,
          variant: 'destructive' as const,
          onClick: () => handleStatusUpdate('CANCELLED'),
          disabled: isUpdating,
        },
      );
    }

    // Actions for PARTIALLY_RECEIVED
    if (order.status === 'PARTIALLY_RECEIVED') {
      actions.push({
        label: 'All Items Received',
        icon: <CheckCircle2 className="w-4 h-4" />,
        variant: 'default' as const,
        onClick: () => handleStatusUpdate('RECEIVED'),
      });
    }

    // Actions for RECEIVED
    if (order.status === 'RECEIVED') {
      actions.push({
        label: 'Mark as Paid',
        icon: <CheckCircle2 className="w-4 h-4" />,
        variant: 'default' as const,
        onClick: () => setShowPaymentDialog(true),
      });
    }

    return actions;
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const result = await updatePurchaseOrderStatus(
        order.id,
        newStatus as PurchaseOrder['status'],
        order.pharmacyId,
      );
      if (result.success) {
        router.refresh();
      } else {
        toast.error(result.message || 'Failed to update status');
      }
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePartialReceipt = async () => {
    await handleStatusUpdate('PARTIALLY_RECEIVED');
    setShowPartialDialog(false);
  };

  const updateReceivedQuantity = (itemId: number, quantity: number) => {
    setReceivedItems((prev) => ({
      ...prev,
      [itemId]: Math.max(
        0,
        Math.min(
          quantity,
          order.items.find((i) => i.id === itemId)?.quantity || 0,
        ),
      ),
    }));
  };

  const availableActions = getAvailableActions();
  const showCostColumns = [
    'CONFIRMED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'COMPLETED',
  ].includes(order.status);

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="w-fit gap-2 text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to orders
        </Button>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="gap-2 bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-2 bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
          >
            <Link href={`/inventory/purchase-order/${order.id}/edit`}>
              <Edit className="w-4 h-4" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Order Header */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle className="text-xl font-medium text-gray-900">
                      PO #{order.orderNumber}
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className={`${statusInfo.color} border-0`}
                    >
                      <div className="flex items-center gap-1.5">
                        {statusInfo.icon}
                        {statusInfo.label}
                      </div>
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    Created on {formattedDate}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoBlock
                label="Supplier"
                value={
                  supplier?.name ||
                  order.supplierName ||
                  `Supplier #${order.supplierId}`
                }
              />
              <InfoBlock
                label="Total Items"
                value={`${order.totalItems || 0} items (${
                  order.totalQuantity || 0
                } qty)`}
              />
              {order.notes && <InfoBlock label="Notes" value={order.notes} />}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-medium text-gray-900">
                  Order Items
                </CardTitle>
                <span className="text-sm text-gray-500">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-gray-100">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-100">
                      <TableHead className="text-gray-600 font-medium">
                        Product
                      </TableHead>
                      <TableHead className="text-right text-gray-600 font-medium">
                        Quantity
                      </TableHead>
                      <TableHead className="text-right text-gray-600 font-medium">
                        Unit
                      </TableHead>
                      {showCostColumns && (
                        <>
                          <TableHead className="text-right text-gray-600 font-medium">
                            Unit Cost
                          </TableHead>
                          <TableHead className="text-right text-gray-600 font-medium">
                            Total
                          </TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items.map((item) => {
                      const product = products?.find(
                        (p) => p.id === item.productId,
                      );
                      const unitCost = parseFloat(item.unitCost || '0');
                      const total = unitCost * item.quantity;

                      return (
                        <TableRow key={item.id} className="border-gray-100">
                          <TableCell className="font-medium text-gray-900">
                            {product?.name ||
                              item.productName ||
                              `Product #${item.productId}`}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right text-gray-500">
                            {product?.unit || item.productUnit || '—'}
                          </TableCell>
                          {showCostColumns && (
                            <>
                              <TableCell className="text-right text-gray-700">
                                {formatCurrency(unitCost)}
                              </TableCell>
                              <TableCell className="text-right font-medium text-gray-900">
                                {formatCurrency(total)}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Partially Received Status */}
          {order.status === 'PARTIALLY_RECEIVED' && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-900">
                  Partially Received
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-amber-800">
                  Track which items have been received
                </p>
                <div className="space-y-3">
                  {order.items.map((item) => {
                    const product = products?.find(
                      (p) => p.id === item.productId,
                    );
                    const received = receivedItems[item.id] || 0;
                    const pending = item.quantity - received;

                    return (
                      <div
                        key={item.id}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="font-medium">
                          {product?.name ||
                            item.productName ||
                            `Product #${item.productId}`}
                        </span>
                        <div>
                          <span className="text-green-600">{received}</span>
                          <span className="text-muted-foreground">
                            {' '}
                            / {item.quantity}
                          </span>
                          {pending > 0 && (
                            <span className="text-amber-600 ml-2">
                              ({pending} pending)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Status Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-gray-900">
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600">{statusInfo.description}</p>
            </CardContent>
          </Card>

          {/* Actions Card */}
          {availableActions.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium text-gray-900">
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 pt-0">
                {availableActions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant}
                    size="sm"
                    className={`w-full justify-start gap-2 ${
                      action.variant === 'default'
                        ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                        : action.variant === 'outline'
                        ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        : action.variant === 'destructive'
                        ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        : ''
                    }`}
                    onClick={action.onClick}
                    disabled={isUpdating}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Summary Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-gray-900">
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Items:</span>
                <span className="text-sm font-medium text-gray-900">
                  {order.totalItems}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Quantity:</span>
                <span className="text-sm font-medium text-gray-900">
                  {order.totalQuantity}
                </span>
              </div>
              {showCostColumns && (
                <>
                  <div className="border-t border-gray-100 pt-3"></div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-900">
                      Total:
                    </span>
                    <span className="font-semibold text-blue-600">
                      {formatCurrency(totalCost)}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <PartiallyReceivedDialog
        open={showPartialDialog}
        onOpenChange={setShowPartialDialog}
        order={order}
        products={products}
        receivedItems={receivedItems}
        updateReceivedQuantity={updateReceivedQuantity}
        onConfirm={handlePartialReceipt}
        isUpdating={isUpdating}
      />

      <PurchaseOrderPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        order={order}
      />

      <PurchaseOrderConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        order={order}
        products={products}
      />
    </div>
  );
};

// Extracted Dialog Components for better organization
const PartiallyReceivedDialog = ({
  open,
  onOpenChange,
  order,
  products,
  receivedItems,
  updateReceivedQuantity,
  onConfirm,
  isUpdating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: PurchaseOrder & { items: PurchaseOrderItem[] };
  products?: Product[];
  receivedItems: Record<number, number>;
  updateReceivedQuantity: (itemId: number, quantity: number) => void;
  onConfirm: () => void;
  isUpdating: boolean;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Partially Received</DialogTitle>
        <DialogDescription>
          Specify received quantities for each item
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto">
        {order.items.map((item) => {
          const product = products?.find((p) => p.id === item.productId);
          const received = receivedItems[item.id] || 0;

          return (
            <div key={item.id} className="p-3 border rounded-lg">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <p className="font-medium">
                    {product?.name ||
                      item.productName ||
                      `Product #${item.productId}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Ordered: {item.quantity} {product?.unit || ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      updateReceivedQuantity(item.id, received - 1)
                    }
                    disabled={received <= 0}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <Input
                    type="number"
                    value={received}
                    onChange={(e) =>
                      updateReceivedQuantity(
                        item.id,
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-20 text-center"
                    min="0"
                    max={item.quantity}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      updateReceivedQuantity(item.id, received + 1)
                    }
                    disabled={received >= item.quantity}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 pt-4">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={isUpdating} className="flex-1">
          {isUpdating ? 'Saving...' : 'Confirm Partially Received'}
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export default PurchaseOrderDetails;
