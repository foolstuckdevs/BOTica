'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  updatePurchaseOrderStatus,
  receiveAllItems,
  partiallyReceiveItems,
} from '@/lib/actions/purchase-order';
import { PurchaseOrderConfirmDialog } from '@/components/PurchaseOrderConfirmDialog';
import PartiallyReceivedDialog from '@/components/PartiallyReceivedDialog';
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
    description: 'Ready to export and send to supplier',
  },
  EXPORTED: {
    label: 'Exported',
    color: 'bg-blue-100 text-blue-800',
    icon: <Send className="w-3 h-3" />,
    description: 'Exported - submit to supplier for confirmation',
  },
  SUBMITTED: {
    label: 'Submitted',
    color: 'bg-purple-100 text-purple-800',
    icon: <Send className="w-3 h-3" />,
    description: 'Awaiting supplier confirmation and pricing',
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: 'bg-indigo-100 text-indigo-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
    description: 'Confirmed by supplier - ready for delivery',
  },
  PARTIALLY_RECEIVED: {
    label: 'Partially Received',
    color: 'bg-amber-100 text-amber-800',
    icon: <Package className="w-3 h-3" />,
    description: 'Some items delivered - add products to inventory',
  },
  RECEIVED: {
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-800',
    icon: <CheckCircle2 className="w-3 h-3" />,
    description: 'All items received - add products to inventory',
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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [receivedItems, setReceivedItems] = useState<Record<number, number>>(
    () => {
      const initialReceived: Record<number, number> = {};
      order.items.forEach((item) => {
        initialReceived[item.id] = item.receivedQuantity || 0;
      });
      return initialReceived;
    },
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
          onClick: () => handleReceiveAllItems(),
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

    if (order.status === 'PARTIALLY_RECEIVED') {
      actions.push({
        label: 'All Items Received',
        icon: <CheckCircle2 className="w-4 h-4" />,
        variant: 'default' as const,
        onClick: () => handleReceiveAllItems(),
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
    setIsUpdating(true);
    try {
      const result = await partiallyReceiveItems(
        order.id,
        order.pharmacyId,
        receivedItems,
        false, // Documentation only - manual inventory update required
      );
      if (result.success) {
        toast.success(
          `${result.message}. Add received products with lot numbers and expiry dates to inventory.`,
        );

        // Update order items to reflect changes
        order.items.forEach((item) => {
          if (receivedItems[item.id] !== undefined) {
            item.receivedQuantity = receivedItems[item.id];
          }
        });

        setShowPartialDialog(false);

        // Refresh to get the latest data from server
        setTimeout(() => {
          router.refresh();
        }, 100);
      } else {
        toast.error(result.message || 'Failed to receive items');
      }
    } catch {
      toast.error('Failed to receive items');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleReceiveAllItems = async () => {
    setIsUpdating(true);
    try {
      const result = await receiveAllItems(
        order.id,
        order.pharmacyId,
        false, // Documentation only - manual inventory update required
      );
      if (result.success) {
        toast.success(
          `${result.message}. Add all received products to inventory.`,
        );

        // Update local state to show all items as received
        const updatedReceivedItems: Record<number, number> = {};
        order.items.forEach((item) => {
          item.receivedQuantity = item.quantity;
          updatedReceivedItems[item.id] = item.quantity;
        });
        setReceivedItems(updatedReceivedItems);

        // Refresh to get the latest data from server
        setTimeout(() => {
          router.refresh();
        }, 100);
      } else {
        toast.error(result.message || 'Failed to receive all items');
      }
    } catch {
      toast.error('Failed to receive all items');
    } finally {
      setIsUpdating(false);
    }
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

  const handleAddToInventory = (item: PurchaseOrderItem, product?: Product) => {
    // Create URL search params to pre-populate the add product form
    const params = new URLSearchParams({
      // Pre-fill form with purchase order item data
      name: product?.name || item.productName || '',
      quantity: (receivedItems[item.id] || 0).toString(),
      unitCost: item.unitCost || '',
      supplierId: order.supplierId.toString(),

      // Enhanced pre-filling for better UX
      genericName: product?.genericName || '',
      // brandName: NOT pre-filled - different brands are separate products
      dosageForm: product?.dosageForm || 'TABLET',
      unit: product?.unit || item.productUnit || 'PIECE',
      categoryId: product?.categoryId?.toString() || '',
      minStockLevel: product?.minStockLevel?.toString() || '10',
      // barcode: NOT pre-filled - different brands have different barcodes

      // Calculate suggested selling price (cost + 20% markup)
      sellingPrice: item.unitCost
        ? (parseFloat(item.unitCost) * 1.2).toFixed(2)
        : product?.sellingPrice || '',

      // Add context about the purchase order
      fromPurchaseOrder: order.id.toString(),
      purchaseOrderItem: item.id.toString(),
      orderDate: order.orderDate,
      supplierName: order.supplierName || '',
    });

    // Navigate to add product form with pre-populated data
    router.push(`/inventory/products/new?${params.toString()}`);
  };

  const availableActions = getAvailableActions();
  const showCostColumns = [
    'CONFIRMED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
  ].includes(order.status);
  const showReceivedColumns = [
    'CONFIRMED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
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
                      <TableHead className="text-gray-600 font-medium w-1/3">
                        Product
                      </TableHead>
                      <TableHead className="text-gray-600 font-medium w-1/6">
                        Brand
                      </TableHead>
                      <TableHead className="text-right text-gray-600 font-medium w-1/6">
                        Quantity
                      </TableHead>
                      {showReceivedColumns && (
                        <TableHead className="text-right text-gray-600 font-medium w-1/6">
                          Received
                        </TableHead>
                      )}
                      <TableHead className="text-right text-gray-600 font-medium w-1/6">
                        Unit
                      </TableHead>
                      {showCostColumns && (
                        <>
                          <TableHead className="text-right text-gray-600 font-medium w-1/6">
                            Unit Cost
                          </TableHead>
                          <TableHead className="text-right text-gray-600 font-medium w-1/6">
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
                      const receivedQty = receivedItems[item.id] || 0;

                      return (
                        <TableRow key={item.id} className="border-gray-100">
                          <TableCell className="font-medium text-gray-900">
                            {product?.name ||
                              item.productName ||
                              `Product #${item.productId}`}
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {product?.brandName ? (
                              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                                {product.brandName}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">
                            {item.quantity}
                          </TableCell>
                          {showReceivedColumns && (
                            <TableCell className="text-right">
                              <span
                                className={`font-medium ${
                                  receivedQty >= item.quantity
                                    ? 'text-green-600'
                                    : receivedQty > 0
                                    ? 'text-amber-600'
                                    : 'text-gray-500'
                                }`}
                              >
                                {receivedQty}
                              </span>
                              <span className="text-gray-400 text-sm ml-1">
                                / {item.quantity}
                              </span>
                            </TableCell>
                          )}
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
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Order Status Card */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium text-gray-900">
                Order Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {['PARTIALLY_RECEIVED', 'RECEIVED'].includes(order.status) ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Add received products to inventory.
                  </p>

                  {/* Inventory Actions */}
                  {order.items.filter(
                    (item) => (receivedItems[item.id] || 0) > 0,
                  ).length > 0 && (
                    <div className="space-y-2">
                      {order.items
                        .filter((item) => (receivedItems[item.id] || 0) > 0)
                        .map((item) => {
                          const product = products?.find(
                            (p) => p.id === item.productId,
                          );
                          const receivedQty = receivedItems[item.id] || 0;

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {product?.name ||
                                    item.productName ||
                                    `Product #${item.productId}`}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {receivedQty}{' '}
                                  {product?.unit || item.productUnit || 'items'}{' '}
                                  received
                                </p>
                              </div>
                              <Button
                                size="sm"
                                className="h-8 px-4 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() =>
                                  handleAddToInventory(item, product)
                                }
                                title={`Add ${receivedQty} ${
                                  product?.unit || item.productUnit || 'items'
                                } to inventory`}
                              >
                                <Package className="w-3 h-3 mr-1" />
                                Add to Inventory
                              </Button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {statusInfo.description}
                  </p>
                </div>
              )}
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

      <PurchaseOrderConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        order={order}
        products={products}
      />
    </div>
  );
};

export default PurchaseOrderDetails;
